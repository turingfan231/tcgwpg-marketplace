export default function BrandLogo({
  variant = "horizontal",
  alt = "TCG WPG",
  className = "",
  imgClassName = "",
  titleClassName = "",
  subtitleClassName = "",
  subtitle = "Winnipeg, MB",
  withSubtitle = false,
  loading = "eager",
  fetchPriority = "high",
}) {
  const src = "/brand/tcgwpg-app-icon-20260406.png";
  const imageClasses = `object-contain ${imgClassName}`.trim();

  if (variant === "badge") {
    return (
      <span className={`inline-flex items-center ${className}`.trim()}>
        <img
          alt={alt}
          className={imageClasses}
          fetchPriority={fetchPriority}
          loading={loading}
          src={src}
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <img
        alt={alt}
        className={imageClasses}
        fetchPriority={fetchPriority}
        loading={loading}
        src={src}
      />
      <span className="flex min-w-0 flex-col">
        <span className={titleClassName}>TCG WPG</span>
        {withSubtitle ? <span className={subtitleClassName}>{subtitle}</span> : null}
      </span>
    </span>
  );
}
