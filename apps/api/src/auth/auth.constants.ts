// Shared by AuthController (sets/reads/clears these cookies) and AuthGuard
// (reads the access token cookie) -- a single source keeps them from ever
// silently drifting apart.
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
