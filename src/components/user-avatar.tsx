// Profile picture, or initials when there isn't one yet.
export function UserAvatar({
  name,
  pictureUrl,
  size = 36,
  className = "",
}: {
  name: string;
  pictureUrl?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  return pictureUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL
    <img
      src={pictureUrl}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-clay/15 font-semibold text-clay ${className}`}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
