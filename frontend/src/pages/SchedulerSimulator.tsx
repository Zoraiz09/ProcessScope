import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Play, Plus, Trash2, RotateCcw, Clock, Gauge, Timer, Zap } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { GanttChart } from "@/components/scheduler/GanttChart";
import { cn } from "@/lib/utils";
import {
  schedule,
  ALGORITHMS,
  PROC_COLORS,
  type AlgoKey,
  type SchedProcess,
  type SchedResult,
} from "@/lib/scheduler";

const DEFAULT_PROCS: SchedProcess[] = [
  { id: "P1", arrival: 0, burst: 5, priority: 2 },
  { id: "P2", arrival: 1, burst: 2, priority: 1 },
  { id: "P3", arrival: 2, burst: 8, priority: 3 },
  { id: "P4", arrival: 3, burst: 4, priority: 2 },
];

export default function SchedulerSimulator() {
  const [procs, setProcs] = useState<SchedProcess[]>(DEFAULT_PROCS);
  const [algo, setAlgo] = useState<AlgoKey>("fcfs");
  const [quantum, setQuantum] = useState(2);
  const [result, setResult] = useState<SchedResult | null>(null);
  const [runId, setRunId] = useState(0);

  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    procs.forEach((p, i) => m.set(p.id, PROC_COLORS[i % PROC_COLORS.length]));
    return m;
  }, [procs]);
  const colorOf = (pid: string) => colorMap.get(pid) ?? "#BEF264";

  const meta = ALGORITHMS.find((a) => a.key === algo)!;
  const needsQuantum = algo === "rr" || algo === "mlq";

  const run = () => {
    if (procs.length === 0) return;
    setResult(schedule(algo, procs, quantum));
    setRunId((x) => x + 1);
  };

  const addProc = () => {
    const n = procs.length + 1;
    setProcs([...procs, { id: `P${n}`, arrival: 0, burst: 3, priority: 1 }]);
  };
  const removeProc = (id: string) => setProcs(procs.filter((p) => p.id !== id));
  const reset = () => {
    setProcs(DEFAULT_PROCS);
    setResult(null);
  };
  const update = (id: string, field: keyof SchedProcess, value: number) =>
    setProcs(procs.map((p) => (p.id === id ? { ...p, [field]: Math.max(0, value) } : p)));

  return (
    <div className="space-y-5">
      {/* algorithm selector */}
      <Card className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted">Algorithm</p>
        <div className="flex flex-wrap gap-2">
          {ALGORITHMS.map((a) => (
            <button
              key={a.key}
              onClick={() => setAlgo(a.key)}
              className={cn(
                "border-3 border-ink px-4 py-2 font-display text-sm font-bold uppercase tracking-wide transition-all",
                algo === a.key
                  ? "bg-ink text-paper shadow-brutal-sm"
                  : "bg-panel hover:bg-lime/30"
              )}
            >
              {a.abbr}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 border-2 border-ink bg-paper px-3 py-2">
          <Pill variant="lime" className="shrink-0">{meta.preemptive ? "Preemptive" : "Non-preemptive"}</Pill>
          <p className="text-sm text-ink-soft">{meta.blurb}</p>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* process editor */}
        <Card>
          <CardHeader
            title="Processes"
            icon={<Clock size={14} />}
            right={
              <div className="flex gap-1.5">
                <button onClick={addProc} className="pill bg-lime hover:bg-lime-bright">
                  <Plus size={12} /> Add
                </button>
                <button onClick={reset} className="pill bg-panel hover:bg-paper">
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            }
          />
          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left font-mono text-[11px] uppercase tracking-wider text-muted">
                  <th className="pb-2 pr-2">Process</th>
                  <th className="pb-2 px-2">Arrival</th>
                  <th className="pb-2 px-2">Burst</th>
                  <th className={cn("pb-2 px-2", algo !== "priority" && algo !== "mlq" && "opacity-40")}>Priority</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {procs.map((p) => (
                  <tr key={p.id} className="border-b border-ink/10">
                    <td className="py-2 pr-2">
                      <span className="inline-flex items-center gap-2 font-bold">
                        <span className="h-4 w-4 border-2 border-ink" style={{ background: colorOf(p.id) }} />
                        {p.id}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput value={p.arrival} onChange={(v) => update(p.id, "arrival", v)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput value={p.burst} onChange={(v) => update(p.id, "burst", Math.max(1, v))} min={1} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput
                        value={p.priority}
                        onChange={(v) => update(p.id, "priority", v)}
                        disabled={algo !== "priority" && algo !== "mlq"}
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => removeProc(p.id)}
                        className="border-2 border-ink bg-panel p-1.5 hover:bg-danger hover:text-paper"
                        title="remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {needsQuantum && (
                <label className="flex items-center gap-2 border-2 border-ink bg-paper px-3 py-2">
                  <Timer size={14} />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Quantum</span>
                  <NumInput value={quantum} onChange={(v) => setQuantum(Math.max(1, v))} min={1} />
                </label>
              )}
              <button onClick={run} className="btn-lime ml-auto">
                Run {meta.abbr}
                <Play size={16} />
              </button>
            </div>
            {algo === "mlq" && (
              <p className="mt-3 font-mono text-[11px] text-muted">
                MLQ: priority ≤ 1 → high-priority Round Robin queue (runs first);
                priority &gt; 1 → low-priority FCFS queue.
              </p>
            )}
          </div>
        </Card>

        {/* summary metrics */}
        <div className="grid grid-cols-2 gap-4 self-start">
          <MetricCard icon={<Clock size={15} />} label="Avg Waiting" value={result ? result.avgWaiting.toFixed(2) : "—"} unit="ms" />
          <MetricCard icon={<RotateCcw size={15} />} label="Avg Turnaround" value={result ? result.avgTurnaround.toFixed(2) : "—"} unit="ms" />
          <MetricCard icon={<Zap size={15} />} label="Avg Response" value={result ? result.avgResponse.toFixed(2) : "—"} unit="ms" />
          <MetricCard icon={<Gauge size={15} />} label="Throughput" value={result ? result.throughput.toFixed(3) : "—"} unit="p/ms" />
        </div>
      </div>

      {/* gantt */}
      <Card>
        <CardHeader
          title="Gantt Chart"
          icon={<Play size={14} />}
          right={result ? <span className="font-mono text-xs text-muted">total {result.totalTime} ms</span> : undefined}
        />
        <div className="p-5">
          <GanttChart gantt={result?.gantt ?? []} colorOf={colorOf} animKey={runId} />
        </div>
      </Card>

      {/* per-process metrics */}
      {result && (
        <Card className="overflow-hidden">
          <CardHeader title="Per-Process Metrics" icon={<Gauge size={14} />} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-3 border-ink bg-ink text-paper">
                  {["Process", "Arrival", "Burst", "Completion", "Turnaround", "Waiting", "Response"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.metrics.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b-2 border-ink/10"
                  >
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 font-bold">
                        <span className="h-3.5 w-3.5 border-2 border-ink" style={{ background: colorOf(m.id) }} />
                        {m.id}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">{m.arrival}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{m.burst}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{m.completion}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{m.turnaround}</td>
                    <td className="px-3 py-2 font-mono font-bold tabular-nums">{m.waiting}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{m.response}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min = 0,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min={min}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
      className={cn(
        "w-16 border-2 border-ink bg-paper px-2 py-1 font-mono text-sm tabular-nums outline-none focus:bg-lime/20",
        disabled && "cursor-not-allowed opacity-40"
      )}
    />
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted">
        {icon} {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold tabular-nums">{value}</span>
        <span className="text-xs text-muted">{unit}</span>
      </div>
    </Card>
  );
}
