import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware replacements for next/link and the navigation hooks. Importing
 * `Link` from here rather than from `next/link` is what keeps the current
 * locale in every internal href automatically -- otherwise each link would
 * have to hardcode `/pt/...` and every one of them would need editing when
 * `en` is activated.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
