import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  History as HistoryIcon,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useMetricsContext } from "@/hooks/MetricsContext";
import { cn } from "@/lib/utils";
import type { MetricsSnapshot } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Rule-based anomaly detection over the live metrics stream.
 * Rules evaluate against the current snapshot (live status) and are
 * replayed over history to build the firing log. Thresholds are
 * editable and rules can be toggled on/off.
 * ------------------------------------------------------------------ */

type Severity = "warning" | "critical";

interface Rule {
  id: string;
  label: string;
  desc: string;
  unit: string;
  severity: Severity;
  threshold: number;
  enabled: boolean;
  /** Current measured value for a snapshot (prev given for rate rules). */
  value: (cur: MetricsSnapshot, prev?: MetricsSnapshot) => number;
}

const DEFAULT_RULES: Rule[] = [
  { id: "cpu-crit", label: "High CPU Load", desc: "Sustained CPU utilization", unit: "%", severity: "critical", threshold: 90, enabled: true, value: (s) => s.cpu.percent },
  { id: "cpu-warn", label: "Elevated CPU", desc: "CPU climbing toward saturation", unit: "%", severity: "warning", threshold: 75, enabled: true, value: (s) => s.cpu.percent },
  { id: "mem-crit", label: "High Memory", desc: "Physical memory near capacity", unit: "%", severity: "critical", threshold: 85, enabled: true, value: (s) => s.memory.percent },
  { id: "disk-crit", label: "Disk Almost Full", desc: "Disk usage approaching limit", unit: "%", severity: "critical", threshold: 90, enabled: true, value: (s) => s.disk.percent },
  { id: "swap-warn", label: "Swap In Use", desc: "System is paging to swap", unit: "%", severity: "warning", threshold: 50, enabled: true, value: (s) => s.memory.swap_percent },
  { id: "proc-burst", label: "Process Burst", desc: "Rapid process creation (per sample)", unit: " procs", severity: "warning", threshold: 5, enabled: true, value: (cur, prev) => (prev ? Math.max(0, cur.system.process_count - prev.system.process_count) : 0) },
];

interface FireEvent {
  ruleId: string;
  label: string;
  severity: Severity;
  index: number;
  value: number;
  unit: string;
  threshold: number;
}

export default function Alerts() {
  const { snapshot, history, status } = useMetricsContext();
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);

  const prev = history.length >= 2 ? history[history.length - 2] : undefined;

  // Live evaluation against the current snapshot.
  const live = useMemo(() => {
    if (!snapshot) return [];
    return rules.map((r) => {
      const v = r.value(snapshot, prev);
      return { rule: r, value: v, firing: r.enabled && v > r.threshold };
    });
  }, [rules, snapshot, prev]);

  // Replay rules over history → firing log (rising edges only).
  const log = useMemo(() => buildLog(rules, history), [rules, history]);

  const active = live.filter((l) => l.firing);
  const worst: Severity | null = active.some((a) => a.rule.severity === "critical")
    ? "critical"
    : active.length
      ? "warning"
      : null;

  const setThreshold = (id: string, t: number) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, threshold: t } : r)));
  const toggle = (id: string) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  return (
    <div className="space-y-5">
      {/* status banner */}
      <motion.div
        key={worst ?? "ok"}
        initial={{ scale: 0.99, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "card flex items-center gap-4 p-5",
          worst === "critical" ? "bg-danger text-paper" : worst === "warning" ? "bg-warn text-ink" : "bg-lime text-ink"
        )}
      >
        {worst === "critical" ? (
          <AlertOctagon size={34} strokeWidth={2.4} />
        ) : worst === "warning" ? (
          <AlertTriangle size={34} strokeWidth={2.4} />
        ) : (
          <ShieldCheck size={34} strokeWidth={2.4} />
        )}
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
            {worst === "critical" ? "Critical Alerts Active" : worst === "warning" ? "Warnings Active" : "All Systems Nominal"}
          </h2>
          <p className="text-sm opacity-80">
            {active.length
              ? `${active.length} rule${active.length > 1 ? "s" : ""} firing: ${active.map((a) => a.rule.label).join(", ")}.`
              : status === "live"
                ? "No rules are tripping against the live stream."
                : `Metrics stream ${status} — evaluation paused.`}
          </p>
        </div>
        {active.length > 0 && (
          <span className="ml-auto font-display text-5xl font-bold tabular-nums">{active.length}</span>
        )}
      </motion.div>

      {/* rule cards */}
      <Card>
        <CardHeader title="Detection Rules" icon={<SlidersHorizontal size={14} />} right={<span className="font-mono text-[11px] text-muted">live evaluation · editable thresholds</span>} />
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {live.map(({ rule, value, firing }) => (
            <div
              key={rule.id}
              className={cn(
                "border-3 border-ink p-3 transition-colors",
                !rule.enabled ? "bg-paper opacity-55" : firing ? (rule.severity === "critical" ? "bg-danger/15" : "bg-warn/20") : "bg-paper"
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold">{rule.label}</span>
                    <SevPill severity={rule.severity} />
                    {firing && rule.enabled && (
                      <span className="border-2 border-ink bg-ink px-1.5 font-mono text-[10px] font-bold uppercase text-paper animate-blink">
                        firing
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-muted">{rule.desc}</p>
                </div>
                <Toggle on={rule.enabled} onClick={() => toggle(rule.id)} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1">
                  <span className={cn("font-display text-2xl font-bold tabular-nums", firing && rule.enabled && "text-danger")}>
                    {fmtVal(value, rule.unit)}
                  </span>
                  <span className="font-mono text-[11px] text-muted">now</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted">trip &gt;</label>
                  <input
                    type="number"
                    value={rule.threshold}
                    onChange={(e) => setThreshold(rule.id, parseFloat(e.target.value || "0"))}
                    className="w-16 border-2 border-ink bg-panel px-1.5 py-1 text-center font-mono text-sm font-bold outline-none focus:bg-lime/20"
                  />
                  <span className="font-mono text-[11px] text-muted">{rule.unit.trim()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* firing log */}
      <Card>
        <CardHeader
          title="Alert History"
          icon={<HistoryIcon size={14} />}
          accent="bg-info"
          right={<span className="font-mono text-[11px] text-muted">{log.length} event{log.length === 1 ? "" : "s"} this session</span>}
        />
        <div className="max-h-72 overflow-y-auto p-3">
          {log.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-8 font-mono text-sm text-muted">
              <BellRing size={15} /> no alerts have fired yet — history is clean.
            </p>
          ) : (
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {log.map((e, i) => (
                  <motion.li
                    key={`${e.ruleId}-${e.index}-${i}`}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 border-2 border-ink bg-paper px-3 py-1.5 text-sm"
                  >
                    {e.severity === "critical" ? (
                      <AlertOctagon size={15} className="shrink-0 text-danger" />
                    ) : (
                      <AlertTriangle size={15} className="shrink-0 text-warn" />
                    )}
                    <span className="font-bold">{e.label}</span>
                    <span className="font-mono text-[11px] text-muted">
                      hit {fmtVal(e.value, e.unit)} (&gt;{e.threshold}{e.unit.trim()})
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-muted">−{history.length - 1 - e.index}s</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- bits ---------------- */

function SevPill({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "border-2 border-ink px-1.5 font-mono text-[10px] font-bold uppercase tracking-wide",
        severity === "critical" ? "bg-danger text-paper" : "bg-warn text-ink"
      )}
    >
      {severity}
    </span>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Disable rule" : "Enable rule"}
      className={cn(
        "flex h-6 w-11 shrink-0 items-center border-2 border-ink p-0.5 transition-colors",
        on ? "bg-lime" : "bg-paper"
      )}
    >
      <span className={cn("h-4 w-4 border-2 border-ink bg-paper transition-transform", on && "translate-x-5")} />
    </button>
  );
}

function fmtVal(v: number, unit: string): string {
  const n = unit === "%" ? `${v.toFixed(0)}` : `${Math.round(v)}`;
  return `${n}${unit}`;
}

function buildLog(rules: Rule[], history: MetricsSnapshot[]): FireEvent[] {
  const out: FireEvent[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    let armed = true; // only log rising edges (don't spam while held high)
    for (let i = 0; i < history.length; i++) {
      const v = r.value(history[i], history[i - 1]);
      const tripped = v > r.threshold;
      if (tripped && armed) {
        out.push({ ruleId: r.id, label: r.label, severity: r.severity, index: i, value: v, unit: r.unit, threshold: r.threshold });
        armed = false;
      } else if (!tripped) {
        armed = true;
      }
    }
  }
  // newest first
  return out.sort((a, b) => b.index - a.index).slice(0, 100);
}
