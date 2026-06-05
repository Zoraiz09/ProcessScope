import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircuitBoard,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  Gauge,
  ScrollText,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ProcessState } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * A self-contained teaching simulation of the OS process lifecycle.
 * No backend — it models New → Ready → Running → Waiting → Terminated
 * with a single CPU, a round-robin quantum, and random I/O waits.
 * ------------------------------------------------------------------ */

interface Proc {
  id: number;
  name: string;
  state: ProcessState;
  burst: number; // total CPU ticks required
  remaining: number; // CPU ticks left
  ranThisQuantum: number; // ticks since last dispatch
  ioLeft: number; // ticks left in the waiting state
  color: string;
}

interface LogEntry {
  id: number;
  tick: number;
  pid: string;
  from: ProcessState | "—";
  to: ProcessState;
  label: string;
}

const QUANTUM = 3; // round-robin time slice
const IO_CHANCE = 0.22; // chance a running process blocks for I/O each tick
const COLORS = ["#BEF264", "#3B82F6", "#FFB020", "#FF4D4D", "#22C55E", "#A855F7", "#EC4899", "#14B8A6"];

const STATES: { key: ProcessState; label: string; tone: string }[] = [
  { key: "new", label: "New", tone: "bg-panel" },
  { key: "ready", label: "Ready", tone: "bg-lime/40" },
  { key: "running", label: "Running", tone: "bg-lime" },
  { key: "waiting", label: "Waiting", tone: "bg-warn/50" },
  { key: "terminated", label: "Terminated", tone: "bg-ink text-paper" },
];

const TRANSITIONS: { from: ProcessState; to: ProcessState; label: string; note: string }[] = [
  { from: "new", to: "ready", label: "admit", note: "Long-term scheduler accepts the process" },
  { from: "ready", to: "running", label: "dispatch", note: "Scheduler gives it the CPU" },
  { from: "running", to: "ready", label: "preempt", note: "Time quantum expired" },
  { from: "running", to: "waiting", label: "block (I/O)", note: "Process requests I/O / event wait" },
  { from: "waiting", to: "ready", label: "wake", note: "I/O complete / event arrived" },
  { from: "running", to: "terminated", label: "exit", note: "Process finished execution" },
];

let PID = 0;
let LOGID = 0;

function makeProc(): Proc {
  const burst = 3 + Math.floor(Math.random() * 6);
  const idx = PID;
  return {
    id: PID,
    name: `P${PID++}`,
    state: "new",
    burst,
    remaining: burst,
    ranThisQuantum: 0,
    ioLeft: 0,
    color: COLORS[idx % COLORS.length],
  };
}

function initialProcs(): Proc[] {
  PID = 0;
  return Array.from({ length: 4 }, makeProc);
}

export default function StateVisualizer() {
  const [procs, setProcs] = useState<Proc[]>(initialProcs);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const tickRef = useRef(0);

  const step = useCallback(() => {
    tickRef.current += 1;
    const t = tickRef.current;
    const events: LogEntry[] = [];
    const emit = (p: Proc, from: ProcessState, to: ProcessState, label: string) =>
      events.push({ id: LOGID++, tick: t, pid: p.name, from, to, label });

    setProcs((prev) => {
      // Work on a shallow copy of each proc.
      let next = prev.map((p) => ({ ...p }));

      // 1. Admit one New → Ready (long-term scheduler).
      const firstNew = next.find((p) => p.state === "new");
      if (firstNew) {
        emit(firstNew, "new", "ready", "admit");
        firstNew.state = "ready";
      }

      // 2. Advance every Waiting process; wake those whose I/O finished.
      for (const p of next) {
        if (p.state === "waiting") {
          p.ioLeft -= 1;
          if (p.ioLeft <= 0) {
            emit(p, "waiting", "ready", "wake");
            p.state = "ready";
          }
        }
      }

      // 3. Handle the Running process (single CPU).
      const running = next.find((p) => p.state === "running");
      if (running) {
        running.remaining -= 1;
        running.ranThisQuantum += 1;

        if (running.remaining <= 0) {
          emit(running, "running", "terminated", "exit");
          running.state = "terminated";
        } else if (Math.random() < IO_CHANCE) {
          running.ioLeft = 2 + Math.floor(Math.random() * 3);
          running.ranThisQuantum = 0;
          emit(running, "running", "waiting", "block (I/O)");
          running.state = "waiting";
        } else if (running.ranThisQuantum >= QUANTUM) {
          running.ranThisQuantum = 0;
          emit(running, "running", "ready", "preempt");
          running.state = "ready";
        }
      }

      // 4. Dispatch a Ready → Running if the CPU is now idle.
      const cpuBusy = next.some((p) => p.state === "running");
      if (!cpuBusy) {
        const candidate = next.find((p) => p.state === "ready");
        if (candidate) {
          candidate.ranThisQuantum = 0;
          emit(candidate, "ready", "running", "dispatch");
          candidate.state = "running";
        }
      }

      // Recycle: if everything is terminated, drip in fresh work so the
      // visualization keeps breathing instead of flat-lining.
      const allDone = next.every((p) => p.state === "terminated");
      if (allDone) next = [...next.slice(-3), makeProc()];

      return next;
    });

    if (events.length) setLog((l) => [...events.reverse(), ...l].slice(0, 80));
    setTick(t);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(step, 900 / speed);
    return () => clearInterval(id);
  }, [playing, speed, step]);

  const reset = () => {
    tickRef.current = 0;
    LOGID = 0;
    setProcs(initialProcs());
    setLog([]);
    setTick(0);
  };

  const addProc = () => setProcs((p) => [...p, makeProc()]);

  const byState = useMemo(() => {
    const m: Record<ProcessState, Proc[]> = {
      new: [],
      ready: [],
      running: [],
      waiting: [],
      terminated: [],
    };
    for (const p of procs) m[p.state].push(p);
    return m;
  }, [procs]);

  const lastTransition = log[0];

  return (
    <div className="space-y-5">
      {/* control bar */}
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setPlaying((p) => !p)} className="btn-primary !px-3 !py-2 text-xs">
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? "Pause" : "Play"}
          </button>
          <button onClick={step} className="btn-ghost !px-3 !py-2 text-xs" disabled={playing}>
            <SkipForward size={14} /> Step
          </button>
          <button onClick={reset} className="btn-ghost !px-3 !py-2 text-xs">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={addProc} className="btn-lime !px-3 !py-2 text-xs">
            <Plus size={14} /> Process
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-muted" />
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "border-2 border-ink px-2.5 py-1 font-mono text-xs font-bold transition-colors",
                speed === s ? "bg-ink text-paper" : "bg-panel hover:bg-lime/30"
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4 font-mono text-xs text-muted">
          <span>tick <b className="text-ink tabular-nums">{tick}</b></span>
          <span>quantum <b className="text-ink">{QUANTUM}</b></span>
          <span>{procs.length} procs</span>
        </div>
      </Card>

      {/* state machine diagram */}
      <Card>
        <CardHeader
          title="Lifecycle State Machine"
          icon={<CircuitBoard size={14} />}
          right={
            lastTransition && (
              <span className="font-mono text-[11px] text-muted">
                <b className="text-ink">{lastTransition.pid}</b> {lastTransition.from} → {lastTransition.to}
              </span>
            )
          }
        />
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {STATES.map((s) => {
              const members = byState[s.key];
              const active = members.length > 0;
              return (
                <div
                  key={s.key}
                  className={cn(
                    "flex min-h-[160px] flex-col border-3 border-ink p-2 transition-shadow",
                    s.tone,
                    active ? "shadow-brutal-sm" : "opacity-80"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-sm font-bold uppercase tracking-wide">
                      {s.label}
                    </span>
                    <span
                      className={cn(
                        "flex h-5 min-w-5 items-center justify-center border-2 border-ink px-1 font-mono text-[11px] font-bold",
                        s.key === "terminated" ? "bg-paper text-ink" : "bg-paper"
                      )}
                    >
                      {members.length}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-wrap content-start gap-1.5">
                    <AnimatePresence mode="popLayout">
                      {members.map((p) => (
                        <motion.span
                          key={p.id}
                          layout
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          title={`${p.name} · ${p.remaining}/${p.burst} ticks left${
                            p.state === "waiting" ? ` · I/O ${p.ioLeft}` : ""
                          }`}
                          className="flex items-center gap-1 border-2 border-ink bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink"
                          style={{ boxShadow: `2px 2px 0 0 ${p.color}` }}
                        >
                          <span className="h-2 w-2 border border-ink" style={{ background: p.color }} />
                          {p.name}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          {/* transition legend */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TRANSITIONS.map((tr) => {
              const hot = lastTransition?.from === tr.from && lastTransition?.to === tr.to;
              return (
                <div
                  key={tr.label}
                  className={cn(
                    "flex items-center gap-2 border-2 border-ink px-2.5 py-1.5 text-xs transition-colors",
                    hot ? "bg-lime" : "bg-paper"
                  )}
                >
                  <code className="font-mono text-[11px] font-bold">
                    {tr.from} → {tr.to}
                  </code>
                  <span className="text-muted">·</span>
                  <span className="font-bold">{tr.label}</span>
                  <span className="ml-auto hidden text-[10px] text-muted lg:inline">{tr.note}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* transition log */}
      <Card>
        <CardHeader title="Transition Log" icon={<ScrollText size={14} />} accent="bg-info" />
        <div className="max-h-72 overflow-y-auto p-2">
          {log.length === 0 ? (
            <p className="py-8 text-center font-mono text-sm text-muted">
              press Play or Step to drive the scheduler…
            </p>
          ) : (
            <ul className="space-y-1">
              <AnimatePresence initial={false}>
                {log.map((e) => (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 border-2 border-ink bg-paper px-2.5 py-1 font-mono text-xs"
                  >
                    <span className="w-10 shrink-0 tabular-nums text-muted">t{e.tick}</span>
                    <span className="w-8 shrink-0 font-bold">{e.pid}</span>
                    <span className="text-muted">{e.from}</span>
                    <span className="text-ink">→</span>
                    <span className="font-bold">{e.to}</span>
                    <span className="ml-auto border-2 border-ink bg-lime/50 px-1.5 text-[10px] uppercase tracking-wide">
                      {e.label}
                    </span>
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
