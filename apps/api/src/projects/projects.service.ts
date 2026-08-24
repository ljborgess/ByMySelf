import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isCompletionConsistent, projectSlugSchema } from '@portfolio/shared';
import type {
  CreateProjectInput,
  Locale,
  PublicProject,
  ProjectStatus,
  PublicProjectSummary,
  UpdateProjectInput,
} from '@portfolio/shared';
import { toPublicProject, toPublicProjectSummary } from './locale';
import { ProjectsRepository } from './projects.repository';
import { Project } from './projects.schema';
import { computeReordering } from './reorder';

@Injectable()
export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  /**
   * Admin listing: every status, including archived (RF-PROJ4).
   *
   * `includeDeleted` surfaces soft-deleted projects so they can be found and
   * restored -- without it, RF-PROJ3's "recoverable" would only hold with
   * direct database access.
   */
  async findAll({ includeDeleted = false } = {}): Promise<Project[]> {
    return this.repository.findAll({ includeDeleted });
  }

  /**
   * RF-PUB1: live and not archived, in manual order, with bilingual fields
   * resolved for `locale`.
   */
  async findPublished(locale: Locale): Promise<PublicProjectSummary[]> {
    const published = await this.repository.findPublished();
    return published.map((project) => toPublicProjectSummary(project, locale));
  }

  /**
   * RF-PUB2. Archived projects stay reachable by direct link even though
   * they are absent from the listing: archived means unlisted, not gone, and
   * 404-ing a URL that search engines already indexed would be worse than
   * serving it. A soft-deleted project, by contrast, is invisible here --
   * the repository's default scoping makes it indistinguishable from a slug
   * that never existed, which is the point (user story 5).
   */
  async findPublishedBySlug(
    slug: string,
    locale: Locale,
  ): Promise<PublicProject> {
    // A slug that cannot match the format every stored slug was created
    // under cannot exist, so it is answered without a database round trip.
    // 404 rather than 400: to a visitor or a crawler this is a URL that is
    // not there, and the distinction between "malformed" and "absent" is not
    // worth telling them apart.
    if (!projectSlugSchema.safeParse(slug).success) {
      throw new NotFoundException('Projeto não encontrado');
    }

    const project = await this.repository.findBySlug(slug);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return toPublicProject(project, locale);
  }

  async findById(id: string): Promise<Project> {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return project;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    assertCompletionConsistent(input.status, input.completedAt);
    await this.assertSlugAvailable(input.slug);

    const highestOrder = await this.repository.maxOrder();

    return this.repository.create({
      ...input,
      // appended to the end of the manual ordering rather than colliding
      // with an existing position
      order: highestOrder === null ? 0 : highestOrder + 1,
    });
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    // An empty patch reached the database as `SET` with no columns, which
    // Postgres rejects -- surfacing a malformed request as a 500. It arrives
    // here either as `{}` or as a body whose every key Zod stripped as
    // unknown, so the check belongs after validation, not in the schema.
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Nenhum campo válido para atualizar');
    }

    const current = await this.findById(id);

    // status and completedAt have to be judged together, and on a patch only
    // the merged state says whether the result is coherent
    assertCompletionConsistent(
      input.status ?? current.status,
      input.completedAt === undefined ? current.completedAt : input.completedAt,
    );

    if (input.slug !== undefined) {
      await this.assertSlugAvailable(input.slug, id);
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return updated;
  }

  /** RF-PROJ3: undoes a soft delete, making a mistaken delete recoverable. */
  async restore(id: string): Promise<Project> {
    const restored = await this.repository.restore(id);
    if (!restored) {
      throw new NotFoundException(
        'Nenhum projeto excluído encontrado com esse id',
      );
    }
    return restored;
  }

  /**
   * RF-PROJ5. Moves the project to `position` in the active listing and
   * reindexes every other active project so no two ever share an `order`.
   *
   * Soft-deleted projects are absent from the sequence entirely (the
   * repository's default scoping), so a deleted project neither occupies a
   * position nor shifts the visible ones.
   *
   * Returns the whole reordered listing, since a single project's new
   * position tells the caller nothing about where the rest ended up.
   */
  async reorder(id: string, position: number): Promise<Project[]> {
    const active = await this.repository.findAll();

    if (!active.some((project) => project.id === id)) {
      throw new NotFoundException('Projeto não encontrado');
    }

    const reordered = computeReordering(
      active.map((project) => project.id),
      id,
      position,
    );

    await this.repository.applyOrdering(reordered);

    return this.repository.findAll();
  }

  /** RF-PROJ3: the row survives, so a mistaken delete stays recoverable. */
  async softDelete(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) {
      throw new NotFoundException('Projeto não encontrado');
    }
  }

  /**
   * Checked here so the caller gets a 409 explaining the problem, rather
   * than the raw unique-constraint violation surfacing as a 500.
   *
   * The lookup deliberately includes soft-deleted rows: the constraint spans
   * them too, so a deleted project still holds its slug. Reporting that as
   * "already in use" is accurate, and the message says where it went --
   * otherwise the admin sees a conflict with a project that appears nowhere
   * in the panel and has no way to work out why.
   */
  private async assertSlugAvailable(
    slug: string,
    allowedId?: string,
  ): Promise<void> {
    const existing = await this.repository.findBySlug(slug, {
      includeDeleted: true,
    });

    if (!existing || existing.id === allowedId) {
      return;
    }

    throw new ConflictException(
      existing.deletedAt
        ? `O slug "${slug}" pertence a um projeto excluído. Restaure-o ou escolha outro slug.`
        : `O slug "${slug}" já está em uso.`,
    );
  }
}

/**
 * The rule itself lives in packages/shared, so the admin form warns about
 * exactly what this refuses. Only the refusal is local, since only the API
 * has an HTTP status to answer with.
 */
function assertCompletionConsistent(
  status: ProjectStatus,
  completedAt: string | null | undefined,
): void {
  if (!isCompletionConsistent(status, completedAt)) {
    throw new BadRequestException(
      'completedAt só se aplica a um projeto com status "completed"',
    );
  }
}
