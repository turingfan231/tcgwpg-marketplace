function buildPath(points, width, height, padding) {
  if (!points.length) {
    return "";
  }

  const values = points.map((point) => Number(point.value) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return points
    .map((point, index) => {
      const x =
        points.length === 1
          ? width / 2
          : padding + (usableWidth * index) / (points.length - 1);
      const normalizedY =
        max === min ? 0.5 : 1 - ((Number(point.value) || 0) - min) / (max - min);
      const y = padding + normalizedY * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export default function Sparkline({
  points = [],
  width = 280,
  height = 80,
  stroke = "#14364a",
  fill = "rgba(26,91,120,0.08)",
  className = "",
}) {
  const normalizedPoints =
    points.length > 1
      ? points
      : [
          { value: 0 },
          { value: 0 },
        ];
  const padding = 6;
  const path = buildPath(normalizedPoints, width, height, padding);

  if (!path) {
    return null;
  }

  const areaPath = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg
      className={className}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <path d={areaPath} fill={fill} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

