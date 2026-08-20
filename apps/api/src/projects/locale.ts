import {
  DEFAULT_LOCALE,
  Locale,
  PublicProject,
  PublicProjectSummary,
} from '@portfolio/shared';
import { LocalizedText, Project } from './projects.schema';

/**
 * RF-PROJ6. Returns the requested locale's text when it exists and is not
 * blank, otherwise the pt value -- so a page never renders empty just
 * because a translation is still pending.
 *
 * Blank (`''` or whitespace) is treated the same as absent. The create/update
 * schemas already reject an empty `en`, precisely so the stored data can
 * distinguish "not translated" from "deliberately blank"; this also covers a
 * row written directly to the database, where that guarantee does not hold.
 *
 * Never throws. If pt is missing too -- impossible through the API, since
 * the column is NOT NULL and the schema requires it, but reachable via a
 * hand-written row -- the result is an empty string. A public endpoint
 * should not answer 500 because one field of one row is malformed.
 */
export function resolveText(
  text: LocalizedText | null | undefined,
  locale: Locale,
): string {
  if (!text) {
    return '';
  }

  if (locale !== DEFAULT_LOCALE) {
    const translated = text[locale];
    if (translated?.trim()) {
      return translated;
    }
  }

  return text.pt?.trim() ? text.pt : '';
}

/**
 * Projects a stored row onto the public shape, resolving every bilingual
 * field through `resolveText`. Defined here alone so the fallback rule has a
 * single home.
 *
 * Deliberately not used by the admin routes: editing a translation requires
 * seeing both locales, so those return the raw row. "One definition of the
 * fallback" is the point -- not applying it everywhere.
 */
export function toPublicProject(
  project: Project,
  locale: Locale,
): PublicProject {
  return {
    ...toPublicProjectSummary(project, locale),
    content: resolveText(project.content, locale),
  };
}

/**
 * The listing projection: the same resolution, minus `content`. Built by
 * omission rather than by listing fields again, so a field added to the
 * public shape cannot be silently missing from cards.
 */
export function toPublicProjectSummary(
  project: Project,
  locale: Locale,
): PublicProjectSummary {
  return {
    id: project.id,
    slug: project.slug,
    title: resolveText(project.title, locale),
    description: resolveText(project.description, locale),
    techStack: project.techStack,
    repoUrl: project.repoUrl,
    demoUrl: project.demoUrl,
    coverImageUrl: project.coverImageUrl,
    status: project.status,
    featured: project.featured,
    completedAt: project.completedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
