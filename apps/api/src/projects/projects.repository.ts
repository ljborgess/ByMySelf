import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.tokens';
import type { DrizzleDatabase } from '../database/database.tokens';
import { NewProject, Project, projects } from './projects.schema';

/**
 * Sole owner of Project database access, and the reason it exists: Drizzle
 * has no equivalent of an ORM-level global filter, so nothing stops a query
 * elsewhere from forgetting `deletedAt IS NULL` and quietly returning
 * soft-deleted rows. Concentrating access here makes the exclusion the
 * default that callers get for free (RF-PROJ3), rather than a rule every
 * call site has to remember.
 *
 * `includeDeleted` is the deliberate opt-out -- the slug conflict check
 * needs it, since the unique constraint spans deleted rows too, and a
 * restore flow would. An explicit flag beats reaching around the repository
 * with a raw query.
 *
 * Covered by `pnpm --filter api db:smoke` against a real Postgres rather
 * than by unit tests, and excluded from unit coverage for that reason. What
 * matters here is whether a deleted row is actually excluded from a result
 * set -- a mocked query builder can only show that a method was called, so
 * a unit test would assert the mock rather than the behaviour.
 */
@Injectable()
export class ProjectsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async findAll({ includeDeleted = false } = {}): Promise<Project[]> {
    return this.db
      .select()
      .from(projects)
      .where(includeDeleted ? undefined : isNull(projects.deletedAt))
      .orderBy(projects.order, desc(projects.createdAt));
  }

  /**
   * The public listing (RF-PUB1): live projects that are not archived,
   * in manual order. Archived is excluded here but *not* from findBySlug --
   * see PublicProjectsController for why a direct link still resolves.
   */
  async findPublished(): Promise<Project[]> {
    return this.db
      .select()
      .from(projects)
      .where(and(isNull(projects.deletedAt), ne(projects.status, 'archived')))
      .orderBy(projects.order, desc(projects.createdAt));
  }

  async findById(
    id: string,
    { includeDeleted = false } = {},
  ): Promise<Project | undefined> {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(this.scopedById(id, includeDeleted))
      .limit(1);

    return row;
  }

  async findBySlug(
    slug: string,
    { includeDeleted = false } = {},
  ): Promise<Project | undefined> {
    const bySlug = eq(projects.slug, slug);
    const [row] = await this.db
      .select()
      .from(projects)
      .where(includeDeleted ? bySlug : and(bySlug, isNull(projects.deletedAt)))
      .limit(1);

    return row;
  }

  async create(values: NewProject): Promise<Project> {
    const [created] = await this.db.insert(projects).values(values).returning();
    return created;
  }

  async update(
    id: string,
    values: Partial<NewProject>,
  ): Promise<Project | undefined> {
    const [updated] = await this.db
      .update(projects)
      .set(values)
      .where(this.scopedById(id, false))
      .returning();

    return updated;
  }

  /**
   * Guarded by `deletedAt IS NULL` so deleting twice returns undefined
   * instead of silently overwriting the original deletion timestamp, which
   * would lose when the project actually disappeared.
   */
  async softDelete(id: string): Promise<Project | undefined> {
    const [deleted] = await this.db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(this.scopedById(id, false))
      .returning();

    return deleted;
  }

  /**
   * Highest `order` among live projects, or null when there are none. Read
   * inside the same statement that assigns the next value would be better
   * still, but with one admin there is no concurrent create to lose a race
   * against.
   */
  async maxOrder(): Promise<number | null> {
    const [row] = await this.db
      .select({ max: sql<number | null>`max(${projects.order})` })
      .from(projects)
      .where(isNull(projects.deletedAt));

    return row?.max ?? null;
  }

  /**
   * Writes `order` for each id as its index in the array, all inside one
   * transaction so a failure halfway cannot leave the listing with
   * duplicate or missing positions -- which would make the public ordering
   * non-deterministic until someone reordered again.
   */
  async applyOrdering(orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) {
      return;
    }

    await this.db.transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx
          .update(projects)
          .set({ order: index })
          .where(and(eq(projects.id, id), isNull(projects.deletedAt)));
      }
    });
  }

  private scopedById(id: string, includeDeleted: boolean) {
    const byId = eq(projects.id, id);
    return includeDeleted ? byId : and(byId, isNull(projects.deletedAt));
  }
}
