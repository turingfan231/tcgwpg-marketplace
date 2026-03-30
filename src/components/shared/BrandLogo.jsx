export default function BrandLogo({
  variant = "horizontal",
  alt = "TCG Wpg Marketplace",
  className = "",
  imgClassName = "",
  loading = "eager",
  fetchPriority = "high",
}) {
  const src =
    variant === "badge"
      ? "/brand/tcgwpg-badge-square.png"
      : "/brand/tcgwpg-logo-horizontal-cropped.png";

  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <img
        alt={alt}
        className={imgClassName}
        fetchPriority={fetchPriority}
        loading={loading}
        src={src}
      />
    </span>
  );
}
