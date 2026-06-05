import { useId } from "react";

/**
 * Minimal dependency-free sparkline for inline metric history.
 */
export function Sparkline({
  data,
  width = 120,
  height = 34,
  stroke = "#0B0B0B",
  fill = "#BEF264",
  max,
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  max?: number;
}) {
  const id = useId();
  if (data.length < 2) {
    return <svg width={width} height={height} className="block" />;
  }
  const hi = max ?? Math.max(...data, 1);
  const lo = 0;
  const span = hi - lo || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d - lo) / span) * (height - 2) - 1;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg width={width} height={height} className="block overflow-visible">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.6" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
