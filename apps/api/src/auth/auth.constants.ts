// Shared by AuthController (sets/reads/clears these cookies) and AuthGuard
// (reads the access token cookie) -- a single source keeps them from ever
// silently drifting apart.
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// RNF-SEG5: per-IP fixed-window limit on the auth endpoints, on top of the
// separate per-account progressive backoff in AccountBackoffService.
export const AUTH_IP_THROTTLE_NAME = 'auth-ip';
export const AUTH_IP_THROTTLE_TTL_MS = 15 * 60 * 1000;
export const AUTH_IP_THROTTLE_LIMIT = 10;

/**
 * Separate, far looser bucket for the public read endpoints.
 *
 * These are unauthenticated and were left unthrottled while nothing called
 * them. The Site Público epic made them the SSR data path for every public
 * page -- including sitemap.xml, which crawlers fetch repeatedly and which
 * fans out to a live database query on each hit. Without a ceiling, that is
 * an unauthenticated amplification path into Postgres.
 *
 * Sized to be invisible to a real visitor (a page view costs one request,
 * and a burst of tab-opening a few dozen) while still capping a scripted
 * loop.
 */
export const PUBLIC_READ_THROTTLE_NAME = 'public-read';
export const PUBLIC_READ_THROTTLE_TTL_MS = 60 * 1000;
export const PUBLIC_READ_THROTTLE_LIMIT = 120;
