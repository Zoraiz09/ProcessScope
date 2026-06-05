import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart as LineChartIcon,
  Cpu,
  MemoryStick,
  HardDrive,
  Boxes,
  Activity,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { MetricArea } from "@/components/ui/MetricArea";
import { useMetricsContext } from "@/hooks/MetricsContext";
import { formatBytes, formatPct, cn } from "@/lib/utils";
import type { MetricsSnapshot } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Charts the rolling in-memory metrics history captured by useMetrics.
 * History only accumulates while the app is open, so ranges are capped
 * at what's actually been collected (~10 min buffer).
 * ------------------------------------------------------------------ */

type MetricKey = "cpu" | "memory" | "disk" | "procs" | "threads" | "down" | "up";

interface MetricDef {
  key: MetricKey;
  label: string;
  icon: typeof Cpu;
  color: string;
  pick: (s: MetricsSnapshot) => number;
  fmt: (n: number) => string;
  fixed100?: boolean; // percentage metrics share a 0–100 axis
}

const METRICS: MetricDef[] = [
  { key: "cpu", label: "CPU", icon: Cpu, color: "#84CC16", pick: (s) => s.cpu.percent, fmt: (n) => formatPct(n), fixed100: true },
  { key: "memory", label: "Memory", icon: MemoryStick, color: "#3B82F6", pick: (s) => s.memory.percent, fmt: (n) => formatPct(n), fixed100: true },
  { key: "disk", label: "Disk", icon: HardDrive, color: "#A855F7", pick: (s) => s.disk.percent, fmt: (n) => formatPct(n), fixed100: true },
  { key: "procs", label: "Processes", icon: Boxes, color: "#FFB020", pick: (s) => s.system.process_count, fmt: (n) => `${Math.round(n)}` },
  { key: "threads", label: "Threads", icon: Activity, color: "#EC4899", pick: (s) => s.system.thread_count, fmt: (n) => `${Math.round(n)}` },
  { key: "down", label: "Net ↓", icon: ArrowDown, color: "#14B8A6", pick: (s) => s.network.download_speed, fmt: (n) => `${formatBytes(n)}/s` },
  { key: "up", label: "Net ↑", icon: ArrowUp, color: "#FF4D4D", pick: (s) => s.network.upload_speed, fmt: (n) => `${formatBytes(n)}/s` },
];

const RANGES: { key: string; label: string; secs: number }[] = [
  { key: "1m", label: "1m", secs: 60 },
  { key: "5m", label: "5m", secs: 300 },
  { key: "10m", label: "10m", secs: 600 },
  { key: "all", label: "All", secs: Infinity },
];

export default function Analytics() {
  const { history, status } = useMetricsContext();
  const [active, setActive] = useState<MetricKey>("cpu");
  const [range, setRange] = useState("5m");

  const windowed = useMemo(() => {
    const secs = RANGES.find((r) => r.key === range)!.secs;
    if (secs === Infinity) return history;
    return history.slice(-secs);
  }, [history, range]);

  const def = METRICS.find((m) => m.key === active)!;
  const series = windowed.map(def.pick);
  const stats = useMemo(() => computeStats(series), [series]);

  if (history.length < 2) {
    return <Collecting status={status} count={history.length} />;
  }

  return (
    <div className="space-y-5">
      {/* range selector */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Range</span>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "border-2 border-ink px-3 py-1.5 font-mono text-xs font-bold transition-colors",
                range === r.key ? "bg-ink text-paper" : "bg-panel hover:bg-lime/30"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-muted">
          {windowed.length} samples · {Math.round(windowed.length)}s window
        </span>
      </Card>

      {/* stat tiles for the selected metric */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Current" value={def.fmt(series[series.length - 1] ?? 0)} accent />
        <StatTile label="Average" value={def.fmt(stats.avg)} />
        <StatTile label="Peak" value={def.fmt(stats.max)} />
        <StatTile label="Min" value={def.fmt(stats.min)} />
      </div>

      {/* main chart */}
      <Card>
        <CardHeader
          title={`${def.label} — over time`}
          icon={<def.icon size={14} />}
          right={
            <div className="flex flex-wrap gap-1.5">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setActive(m.key)}
                  className={cn(
                    "border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold transition-colors",
                    active === m.key ? "text-paper" : "bg-panel hover:bg-lime/30"
                  )}
                  style={active === m.key ? { background: m.color } : undefined}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="p-4">
          <MetricArea values={series} color={def.color} fmt={def.fmt} fixed100={def.fixed100} height={260} />
        </div>
      </Card>

      {/* all-metric mini grid */}
      <Card>
        <CardHeader title="All Signals" icon={<LineChartIcon size={14} />} accent="bg-info" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {METRICS.map((m) => {
            const vals = windowed.map(m.pick);
            const cur = vals[vals.length - 1] ?? 0;
            return (
              <button
                key={m.key}
                onClick={() => setActive(m.key)}
                className={cn(
                  "group border-2 border-ink bg-paper p-3 text-left transition-transform hover:-translate-y-[2px]",
                  active === m.key && "shadow-brutal-sm"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
                    <m.icon size={12} /> {m.label}
                  </span>
                </div>
                <div className="mb-1 font-display text-xl font-bold tabular-nums">{m.fmt(cur)}</div>
                <MetricArea values={vals} color={m.color} fixed100={m.fixed100} height={48} grid={false} axis={false} />
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- bits ---------------- */

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "card p-3",
        accent ? "bg-grad-lime shadow-brutal-glow" : "bg-grad-panel"
      )}
    >
      <div className={cn("font-mono text-[10px] uppercase tracking-wider", accent ? "text-ink/70" : "text-muted")}>
        {label}
      </div>
      <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
    </motion.div>
  );
}

function computeStats(values: number[]) {
  if (!values.length) return { avg: 0, min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { avg: sum / values.length, min, max };
}

function Collecting({ status, count }: { status: string; count: number }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <LineChartIcon size={36} className="mx-auto mb-3 text-lime-dark" />
        <h2 className="mb-1 font-display text-xl font-bold">Collecting telemetry…</h2>
        <p className="font-mono text-sm text-muted">
          {status === "live"
            ? `Buffering live samples (${count} so far). Charts appear after a couple of seconds.`
            : `Waiting for the metrics stream — status: ${status}.`}
        </p>
      </Card>
    </div>
  );
}
