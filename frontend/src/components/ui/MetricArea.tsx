import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Vivid gradient area chart (recharts) with a glow stroke and a brutalist
 * tooltip. Animation is off by default so live-updating charts don't jitter.
 */
export function MetricArea({
  values,
  color = "#84CC16",
  height = 240,
  fixed100 = false,
  fmt = (n: number) => `${Math.round(n)}`,
  grid = true,
  axis = true,
  animate = false,
}: {
  values: number[];
  color?: string;
  height?: number;
  fixed100?: boolean;
  fmt?: (n: number) => string;
  grid?: boolean;
  axis?: boolean;
  animate?: boolean;
}) {
  const id = useId();
  const data = values.map((v, i) => ({ i, v }));

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center font-mono text-sm text-muted" style={{ height }}>
        collecting samples…
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="60%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {grid && <CartesianGrid stroke="#0B0B0B" strokeOpacity={0.12} strokeDasharray="3 4" vertical={false} />}

          <XAxis dataKey="i" hide />
          <YAxis
            hide={!axis}
            width={44}
            domain={fixed100 ? [0, 100] : [0, (max: number) => Math.ceil(max * 1.15) || 1]}
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", fill: "#7A7A75" }}
            tickFormatter={(v) => fmt(v)}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            cursor={{ stroke: "#0B0B0B", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload }) =>
              active && payload && payload.length ? (
                <div className="border-2 border-ink bg-panel px-2.5 py-1 font-mono text-xs font-bold shadow-brutal-sm">
                  {fmt(payload[0].value as number)}
                </div>
              ) : null
            }
          />

          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#fill-${id})`}
            isAnimationActive={animate}
            animationDuration={500}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "#0B0B0B", strokeWidth: 2 }}
            style={{ filter: `drop-shadow(0 2px 6px ${color}88)` }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
