const SAFE_SCHEMES = new Set(['http:', 'https:']);

/**
 * Validates that a URL uses http(s) before it reaches an href attribute.
 * Returns null for javascript:, data:, and any other scheme — the caller
 * omits the link rather than rendering an unsafe one.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return SAFE_SCHEMES.has(protocol) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Builds a mailto: href from a bare email address.
 * Rejects anything that isn't a plain address to block header-injection
 * via query parameters (e.g. "?body=...").
 */
export function safeMailto(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    ? `mailto:${trimmed}`
    : null;
}
