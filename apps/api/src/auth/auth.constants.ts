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
