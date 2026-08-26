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
 * The gradient ring (docs/design-aurora-futurista.md) is a fixed-width
 * padding around the actual photo/initials circle, not a border -- a CSS
 * border on a circle draws mitered corners that break the round shape at
 * small radii, padding does not.
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
  const ring =
    'from-accent via-aurora-purple to-aurora-cyan shadow-accent/40 rounded-full bg-gradient-to-br p-[3px] shadow-[0_0_28px_-6px]';

  if (!photoUrl) {
    return (
      <div className={`${size} ${className} ${ring}`}>
        <div
          // aria-hidden with the name already in the adjacent heading: read
          // out, the initials would just repeat it
          aria-hidden="true"
          className="bg-background flex h-full w-full items-center justify-center rounded-full text-xl font-semibold tracking-wide select-none"
        >
          {initialsOf(name)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${size} ${className} ${ring}`}>
      {/* plain <img>, not next/image, for the same reason the project cards
          use one: photoUrl is an arbitrary external URL the owner pastes
          in, and the optimizer would need remotePatterns wide enough to
          cover any host -- which turns /_next/image into an open proxy for
          whatever a request's url param names. Without that config
          next/image also throws outright on any remote host, so this is
          what keeps setting photoUrl from breaking the pages that render
          the avatar. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={name}
        width={160}
        height={160}
        className="h-full w-full rounded-full object-cover"
      />
    </div>
  );
}
