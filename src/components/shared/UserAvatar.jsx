function buildInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

export default function UserAvatar({
  user,
  src,
  name,
  initials,
  className = "",
  imageClassName = "",
  textClassName = "",
}) {
  const avatarUrl = src || user?.avatarUrl || "";
  const label = initials || user?.initials || buildInitials(name || user?.name);

  if (avatarUrl) {
    return (
      <img
        alt={name || user?.publicName || user?.name || "User avatar"}
        className={`overflow-hidden rounded-full object-cover ${className} ${imageClassName}`.trim()}
        src={avatarUrl}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-navy text-white ${className}`.trim()}
    >
      <span className={`font-semibold ${textClassName}`.trim()}>{label}</span>
    </div>
  );
}
