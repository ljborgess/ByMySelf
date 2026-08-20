import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateProjectInput, UpdateProjectInput } from '@portfolio/shared';
import { ProjectsRepository } from './projects.repository';
import { Project } from './projects.schema';

@Injectable()
export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  /** Admin listing: every status, including archived (RF-PROJ4). */
  async findAll(): Promise<Project[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<Project> {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return project;
  }

  async create(input: CreateProjectInput): Promise<Project> {
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
    if (input.slug !== undefined) {
      await this.assertSlugAvailable(input.slug, id);
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return updated;
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
