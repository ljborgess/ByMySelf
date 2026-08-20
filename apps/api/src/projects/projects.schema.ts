import { isNull } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Bilingual text. `en` is optional on purpose: the i18n decision fixes the
 * shape from the first migration so adding a translation later is a data
 * change rather than a schema change, but Fase 1 ships PT-only content and
 * the public site falls back to `pt` while `en` is missing.
 */
export interface LocalizedText {
  pt: string;
  en?: string;
}

export const projectStatus = pgEnum('project_status', [
  'in_progress',
  'completed',
  'archived',
]);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // jsonb rather than one column per locale: adding a third language would
    // otherwise mean three new columns and a migration on every text field.
    title: jsonb('title').$type<LocalizedText>().notNull(),
    description: jsonb('description').$type<LocalizedText>().notNull(),
    content: jsonb('content').$type<LocalizedText>().notNull(),

    // shared across locales so /pt/projetos/x and /en/projects/x resolve to
    // the same row and a URL never changes when a translation lands
    slug: varchar('slug', { length: 255 }).notNull(),

    // not localized -- these are proper nouns ("NestJS", "PostgreSQL")
    techStack: text('tech_stack').array().notNull().default([]),

    repoUrl: varchar('repo_url', { length: 2048 }),
    demoUrl: varchar('demo_url', { length: 2048 }),
    coverImageUrl: varchar('cover_image_url', { length: 2048 }),

    status: projectStatus('status').notNull().default('in_progress'),
    featured: boolean('featured').notNull().default(false),
    // manual ordering, maintained by the reorder endpoint
    order: integer('order').notNull().default(0),

    // a day, not an instant -- "finished in March" has no meaningful time
    completedAt: date('completed_at'),

    // soft delete (RF-PROJ3). See `notDeleted` below.
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Unique across every row, soft-deleted ones included. That means a
    // deleted project keeps holding its slug, so re-creating one under the
    // same slug fails until the original is restored or purged. Deliberate:
    // soft delete exists to make deletion recoverable, and a restore that
    // fails because the slug was taken in the meantime would defeat it. The
    // insert failing instead is loud, immediate and fixable.
    uniqueIndex('projects_slug_unique').on(table.slug),
    // listing is ordered by `order` and filtered on deletedAt, so the index
    // carries both columns
    index('projects_order_idx').on(table.deletedAt, table.order),
    index('projects_status_idx').on(table.status),
  ],
);

/**
 * The soft-delete predicate every Project query is expected to carry.
 *
 * Drizzle has no equivalent of MikroORM's global entity filter, so this
 * cannot be applied automatically the way the original spec assumed --
 * omitting it silently returns deleted rows. The guarantee is therefore
 * moved up a layer: the repository introduced by the CRUD sub-issue owns
 * all Project access and applies this by default, exposing an explicit
 * opt-out rather than leaving each call site to remember.
 */
export const notDeleted = isNull(projects.deletedAt);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
