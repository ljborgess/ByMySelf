import { z } from 'zod';

export const PROJECT_STATUSES = [
  'in_progress',
  'completed',
  'archived',
] as const;

export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

/**
 * Bilingual text. `pt` is required and `en` optional throughout: RF-PROJ1
 * says publishing must never be blocked on a missing translation, and
 * RF-PROJ6 has the public site fall back to `pt` while `en` is absent.
 *
 * An empty `en` is rejected rather than accepted -- omit the key to mean
 * "not translated yet". Storing `""` would make the fallback ambiguous,
 * since the site cannot tell a deliberate blank from an untranslated field.
 */
export const localizedTextSchema = z.object({
  pt: z.string().trim().min(1, 'Obrigatório em português'),
  en: z.string().trim().min(1).optional(),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;

// lowercase, digits and single hyphens -- no leading, trailing or repeated
// hyphen, so a slug always round-trips through a URL unchanged
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const projectSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(
    SLUG_PATTERN,
    'Use apenas minúsculas, números e hífens simples (ex: meu-projeto)',
  );

/**
 * Field shapes without any `.default()`, kept separate because create and
 * update need different defaulting behaviour and Zod's `.partial()` does
 * *not* strip defaults -- it only makes keys optional. Deriving the update
 * schema straight from the create one would therefore make every PATCH
 * silently re-apply `techStack: []` and `status: 'in_progress'`, wiping
 * fields the caller never mentioned.
 *
 * `order` is absent on purpose: the service assigns it as max+1 among live
 * projects, so a caller cannot create a project that collides with, or
 * leapfrogs, the existing manual ordering. Changing it is the reorder
 * endpoint's job.
 */
/**
 * `z.url()` alone is a WHATWG URL parse with no scheme constraint, so it
 * accepts `javascript:`, `data:`, `vbscript:` and `file:` just as readily as
 * https. Every one of these fields is rendered straight into an `href` or an
 * `img src` on the public site, so the scheme is pinned here.
 *
 * React currently refuses to render a `javascript:` href and browsers block
 * top-level `data:` navigation, which is why this was never exploitable --
 * but that is a framework default this project never chose. Validating at
 * the edge makes it the app's own guarantee instead of a borrowed one.
 *
 * The `refine` is not redundant with the `protocol` option: `https:evil`
 * parses with protocol `https:` and would pass the option alone, so the
 * authority-slashes are checked separately.
 */
const publicHttpUrlSchema = z
  .url({ protocol: /^https?$/ })
  .max(2048)
  .refine((value) => /^https?:\/\//i.test(value), {
    message: 'Use uma URL http(s)',
  });

const projectFields = {
  title: localizedTextSchema,
  description: localizedTextSchema,
  content: localizedTextSchema,
  slug: projectSlugSchema,
  techStack: z.array(z.string().trim().min(1)),
  repoUrl: publicHttpUrlSchema.optional(),
  demoUrl: publicHttpUrlSchema.optional(),
  // external URL only -- there is no upload in this project (backlog.md)
  coverImageUrl: publicHttpUrlSchema.optional(),
  status: projectStatusSchema,
  featured: z.boolean(),
  completedAt: z.iso.date().optional(),
};

export const createProjectSchema = z.object({
  ...projectFields,
  techStack: projectFields.techStack.default([]),
  status: projectFields.status.default('in_progress'),
  featured: projectFields.featured.default(false),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * The nullable columns restated for update, so a PATCH can actually empty
 * one. `optional()` alone cannot: on a partial update an absent key means
 * "leave this alone", so without an explicit `null` there is no way to say
 * "remove the demo link" -- clearing the field in the admin panel would look
 * like it worked and change nothing.
 *
 * Create needs no equivalent: there is nothing to leave alone yet, so an
 * omitted key there already means "no value".
 */
const nullableOnUpdate = {
  repoUrl: projectFields.repoUrl.nullable(),
  demoUrl: projectFields.demoUrl.nullable(),
  coverImageUrl: projectFields.coverImageUrl.nullable(),
  completedAt: projectFields.completedAt.nullable(),
};

/**
 * Every field optional and nothing defaulted, so a PATCH touches exactly
 * the fields it names.
 *
 * A field that *is* present must still be complete -- `title` requires
 * `pt`. Filling in a translation therefore means sending the whole object
 * (`{ pt, en }`), not just the new half: these are jsonb columns, and a
 * partial merge would leave no way to express "remove the English text"
 * versus "leave it alone".
 */
export const updateProjectSchema = z
  .object({ ...projectFields, ...nullableOnUpdate })
  .partial();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/**
 * docs/dominio.md describes `completedAt` as "preenchido quando status =
 * completed". A completion date on a project that is not completed is
 * nonsense, so it is refused -- but a `completed` project without a date is
 * allowed, since marking something done and filling the date in later is a
 * reasonable flow and forcing it would block the more common action.
 *
 * A rule rather than a schema refinement because a PATCH can only be judged
 * against the *merged* state: a body that changes `status` alone still has
 * to be weighed against the `completedAt` already stored, which no schema
 * validating the body in isolation can see.
 *
 * Lives here so the admin form warns about exactly the rule the API
 * enforces, rather than a hand-kept copy that drifts (RF-PROJ1, user
 * story 5).
 */
export function isCompletionConsistent(
  status: ProjectStatus,
  completedAt: string | null | undefined,
): boolean {
  return status === 'completed' || !completedAt;
}

/**
 * Target *position* in the active listing, zero-based -- not an arbitrary
 * order column value. Reordering reindexes every active project to a
 * contiguous 0..n-1 sequence, so a raw column value would be meaningless
 * to send.
 *
 * No upper bound: the caller would have to know the exact project count to
 * respect one, and that count can change between the read and the write.
 * A position past the end is clamped to last, which is also the natural way
 * to express "move to the end".
 */
export const reorderProjectSchema = z.object({
  order: z.number().int().min(0),
});

export type ReorderProjectInput = z.infer<typeof reorderProjectSchema>;

export const LOCALES = ['pt', 'en'] as const;

export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const DEFAULT_LOCALE: Locale = 'pt';

/** `?locale=en`, defaulting to pt (RNF-I18N1 makes PT-BR the default). */
export const localeQuerySchema = z.object({
  locale: localeSchema.default(DEFAULT_LOCALE),
});

/**
 * `?includeDeleted=true` on the admin listing, so a soft-deleted project can
 * be found and restored. Without it RF-PROJ3's "recoverable" would only be
 * true with direct database access.
 */
export const adminListQuerySchema = z.object({
  includeDeleted: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((value) => value === true || value === 'true')
    .default(false),
});

/**
 * What the public routes return: bilingual fields already resolved to a
 * single string for the requested locale, and the internal bookkeeping
 * (`order`, `deletedAt`) left out. An explicit shape rather than the raw row
 * so the soft-delete mechanism is not part of the public contract and
 * cannot leak by accident.
 */
export interface PublicProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  techStack: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  coverImageUrl: string | null;
  status: ProjectStatus;
  featured: boolean;
  completedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The listing shape: everything a card needs, and no `content`.
 *
 * `content` is the detail page's markdown (docs/dominio.md calls
 * `description` "curta, para card de listagem" and `content` "markdown,
 * página de detalhe"), so it is not listing data by definition. Sending it
 * anyway meant a listing of ten real projects shipping hundreds of kilobytes
 * no card renders -- straight into mobile LCP (RNF-USA1) and the SSR payload
 * (RNF-SEO2).
 */
export type PublicProjectSummary = Omit<PublicProject, 'content'>;
