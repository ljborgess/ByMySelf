/**
 * The only bucket left once the admin panel (and auth with it) was removed
 * (docs/decisao-projetos-github-pins.md). Sized to be invisible to a real
 * visitor (a page view costs one request, a burst of tab-opening a few
 * dozen) while still capping a scripted loop -- both `/projects` and
 * `/health` share it.
 */
export const PUBLIC_READ_THROTTLE_NAME = 'public-read';
export const PUBLIC_READ_THROTTLE_TTL_MS = 60 * 1000;
export const PUBLIC_READ_THROTTLE_LIMIT = 120;
