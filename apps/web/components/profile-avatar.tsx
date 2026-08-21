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
  const size = 'size-24 sm:size-28';

  if (!photoUrl) {
    return (
      <div
        // aria-hidden with the name already in the adjacent heading: read out,
        // the initials would just repeat it
        aria-hidden="true"
        className={`${size} ${className} flex shrink-0 items-center justify-center rounded-full bg-black/5 text-xl font-semibold tracking-wide select-none dark:bg-white/10`}
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    // plain <img>, not next/image, for the same reason the project cards use
    // one: photoUrl is an arbitrary external URL the owner pastes in, and the
    // optimizer would need `remotePatterns` wide enough to cover any host --
    // which turns /_next/image into an open proxy for whatever a request's
    // `url` param names. Without that config next/image also throws outright
    // on any remote host, so this is what keeps setting photoUrl from
    // breaking the pages that render the avatar.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      width={112}
      height={112}
      className={`${size} ${className} shrink-0 rounded-full object-cover`}
    />
  );
}
