import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "auto" | "lime" | "info" | "warn" | "danger";

const STOPS: Record<Exclude<Tone, "auto">, [string, string]> = {
  lime: ["#C6FF3D", "#84CC16"],
  info: ["#60A5FA", "#3B82F6"],
  warn: ["#FFCA5A", "#FFB020"],
  danger: ["#FF7A7A", "#FF4D4D"],
};

function toneFor(value: number, tone: Tone): Exclude<Tone, "auto"> {
  if (tone !== "auto") return tone;
  if (value > 85) return "danger";
  if (value > 65) return "warn";
  return "lime";
}

/**
 * Animated radial gauge — gradient stroke + soft glow over a recessed track.
 * The arc springs to its value; color shifts by threshold when tone="auto".
 */
export function RingGauge({
  value,
  max = 100,
  size = 132,
  thickness = 14,
  tone = "auto",
  label,
  sublabel,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const id = useId();
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const t = toneFor((value / max) * 100, tone);
  const [from, to] = STOPS[t];

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <filter id={`f-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={to} floodOpacity="0.7" />
          </filter>
        </defs>

        {/* recessed track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E4E4DE" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0B0B0B" strokeWidth={1} opacity={0.25} />

        {/* animated progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g-${id})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          filter={`url(#f-${id})`}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="font-display text-2xl font-bold leading-none tabular-nums">{label}</span>}
        {sublabel && <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
