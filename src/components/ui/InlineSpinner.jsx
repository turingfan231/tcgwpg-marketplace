export default function InlineSpinner({ size = 14, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}
