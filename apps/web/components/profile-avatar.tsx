function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Falls back to initials when there is no photo, rather than rendering a
 * broken image or an empty box. That makes `photoUrl` genuinely optional --
 * the hero looks finished either way, so shipping without a photo is a
 * choice rather than a defect waiting to be noticed.
 *
 * Plain circle, no ring: the gradient ring from the aurora epic (#109)
 * referenced tokens (--aurora-purple/--aurora-cyan) that don't exist
 * anymore (docs/design-clone-syahril.md, #124). The clone's own duotone,
 * full-bleed photo treatment lives on the Sobre page instead (#133) --
 * this stays the plain, compact identity photo used everywhere else.
 */
export function ProfileAvatar({
  name,
  photoUrl,
  className = '',
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  const size = 'size-32 sm:size-40';

  if (!photoUrl) {
    return (
      <div
        // aria-hidden with the name already in the adjacent heading: read
        // out, the initials would just repeat it
        aria-hidden="true"
        className={`${size} ${className} flex shrink-0 items-center justify-center rounded-full border border-white/15 text-xl font-semibold tracking-wide select-none`}
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    // plain <img>, not next/image, for the same reason the project cards
    // use one: photoUrl is an arbitrary external URL the owner pastes in,
    // and the optimizer would need remotePatterns wide enough to cover any
    // host -- which turns /_next/image into an open proxy for whatever a
    // request's url param names. Without that config next/image also
    // throws outright on any remote host, so this is what keeps setting
    // photoUrl from breaking the pages that render the avatar.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      width={160}
      height={160}
      className={`${size} ${className} shrink-0 rounded-full border border-white/15 object-cover`}
    />
  );
}
