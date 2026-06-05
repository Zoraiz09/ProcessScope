import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCw, Activity, Cpu, ChevronDown } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import type { ProcessInfo, ThreadSnapshot, ThreadInfo } from "@/lib/types";

// Kernel / SYSTEM-owned processes whose threads psutil can't enumerate.
const HIDDEN = new Set([
  "System",
  "System Idle Process",
  "Registry",
  "Secure System",
  "MemCompression",
  "Memory Compression",
  "vmmem",
  "vmmemWSL",
]);

/** Pick a sensible default process — prefer a real userland .exe with threads. */
function pickDefault(list: ProcessInfo[]): number | null {
  if (!list.length) return null;
  const userApp = list.find((p) => /\.exe$/i.test(p.name));
  return (userApp ?? list[0]).pid;
}

export default function ThreadExplorer() {
  const [procs, setProcs] = useState<ProcessInfo[]>([]);
  const [pid, setPid] = useState<number | null>(null);
  const [snap, setSnap] = useState<ThreadSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Load process list (sorted by thread count) once.
  useEffect(() => {
    fetch("/api/processes?limit=400")
      .then((r) => r.json())
      .then((d) => {
        const list: ProcessInfo[] = (d.processes ?? [])
          .filter((p: ProcessInfo) => !HIDDEN.has(p.name) && p.threads > 0)
          .sort((a: ProcessInfo, b: ProcessInfo) => b.threads - a.threads);
        setProcs(list);
        if (list.length && pid === null) setPid(pickDefault(list));
      })
      .catch(() => setProcs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll threads for the selected process.
  const pidRef = useRef(pid);
  pidRef.current = pid;
  useEffect(() => {
    if (pid === null) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/processes/${pid}/threads`);
        if (r.ok && alive && pidRef.current === pid) setSnap(await r.json());
        else if (!r.ok && alive) setSnap(null);
      } catch {
        if (alive) setSnap(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    setSnap(null);
    load();
    const id = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pid]);

  const selected = procs.find((p) => p.pid === pid);
  const filteredProcs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? procs.filter((p) => p.name.toLowerCase().includes(q) || String(p.pid).includes(q))
      : procs;
  }, [procs, query]);

  const maxTotal = snap ? Math.max(...snap.threads.map((t) => t.total_time), 0.01) : 1;

  return (
    <div className="space-y-5">
      {/* process selector */}
      <Card className="relative p-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Process</span>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="flex flex-1 items-center justify-between border-2 border-ink bg-paper px-3 py-2 text-left transition-colors hover:bg-lime/20 md:flex-none md:w-96"
          >
            <span className="truncate font-semibold">
              {selected ? `${selected.name}` : "Select a process…"}
              {selected && <span className="ml-2 font-mono text-xs text-muted">PID {selected.pid}</span>}
            </span>
            <ChevronDown size={16} className={cn("transition-transform", pickerOpen && "rotate-180")} />
          </button>
          {selected && (
            <Pill variant="ghost" className="hidden sm:inline-flex">
              <Activity size={12} /> {selected.threads} threads
            </Pill>
          )}
        </div>

        {pickerOpen && (
          <div className="absolute left-3 right-3 top-full z-30 mt-1 border-3 border-ink bg-panel shadow-brutal-lg md:left-[5.5rem] md:w-96">
            <div className="flex items-center gap-2 border-b-2 border-ink px-3 py-2">
              <Search size={14} className="text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter processes…"
                className="w-full bg-transparent font-mono text-sm outline-none"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {filteredProcs.slice(0, 80).map((p) => (
                <li key={p.pid}>
                  <button
                    onClick={() => {
                      setPid(p.pid);
                      setPickerOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-lime/30",
                      p.pid === pid && "bg-ink text-paper hover:bg-ink"
                    )}
                  >
                    <span className="truncate font-semibold">{p.name}</span>
                    <span className="ml-2 flex items-center gap-1 font-mono text-xs opacity-70">
                      <Activity size={11} /> {p.threads}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* headline */}
      {selected && (
        <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
          <Card className="flex flex-col justify-between p-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Thread count</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-display text-6xl font-bold tabular-nums">
                  {snap?.count ?? selected.threads}
                </span>
                <span className="font-display text-lg font-bold">Threads</span>
              </div>
              <p className="mt-1 truncate text-sm text-muted">{selected.name}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill variant="lime">
                <span className="h-1.5 w-1.5 bg-ink" /> {snap?.active ?? 0} active
              </Pill>
              <Pill variant="ghost">
                {(snap?.count ?? 0) - (snap?.active ?? 0)} idle
              </Pill>
              <button
                onClick={() => setPid((x) => x)}
                className="pill bg-panel hover:bg-paper"
                title="refresh"
              >
                <RefreshCw size={12} className={cn(loading && "animate-spin")} /> live
              </button>
            </div>
          </Card>

          {/* activity grid */}
          <Card>
            <CardHeader title="Thread Activity Map" icon={<Cpu size={14} />} />
            <div className="p-4">
              {!snap ? (
                <div className="flex h-32 items-center justify-center font-mono text-sm text-muted">
                  sampling threads…
                </div>
              ) : snap.threads.length === 0 ? (
                <div className="flex h-32 items-center justify-center font-mono text-sm text-muted">
                  no enumerable threads (access restricted)
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {snap.threads.map((t) => (
                      <ThreadCell key={t.id} t={t} maxTotal={maxTotal} />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted">
                    <span className="flex items-center gap-1"><span className="h-3 w-3 border border-ink bg-lime-deep" /> running</span>
                    <span className="flex items-center gap-1"><span className="h-3 w-3 border border-ink bg-paper" /> waiting</span>
                    <span>· brightness ∝ accumulated CPU time</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* thread table */}
      {snap && snap.threads.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader
            title={`Threads — ${snap.name}`}
            icon={<Activity size={14} />}
            right={<span className="font-mono text-xs text-muted">{snap.count} total</span>}
          />
          <div className="max-h-[28rem] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0">
                <tr className="border-b-3 border-ink bg-ink text-paper">
                  <Th className="w-28">TID</Th>
                  <Th className="w-32">CPU %</Th>
                  <Th>User Time</Th>
                  <Th>System Time</Th>
                  <Th>Total CPU</Th>
                  <Th className="w-24">State</Th>
                </tr>
              </thead>
              <tbody>
                {snap.threads.map((t) => (
                  <tr key={t.id} className="border-b-2 border-ink/10 hover:bg-lime/15">
                    <td className="px-3 py-2 font-mono text-xs text-muted">{t.id}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 border border-ink bg-paper">
                          <div className="h-full bg-lime-deep" style={{ width: `${Math.min(100, t.cpu)}%` }} />
                        </div>
                        <span className="font-mono text-xs tabular-nums">{t.cpu.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">{t.user_time.toFixed(2)}s</td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">{t.system_time.toFixed(2)}s</td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">{t.total_time.toFixed(2)}s</td>
                    <td className="px-3 py-2">
                      <span className={cn("pill text-[9px]", t.state === "running" ? "bg-lime" : "bg-paper")}>
                        {t.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="font-mono text-[11px] text-muted">
        Note: psutil exposes cumulative thread CPU time but not live state. CPU %
        is sampled over a 0.4 s window; state is derived (running = consumed CPU
        this window). Some system processes restrict thread enumeration.
      </p>
    </div>
  );
}

function ThreadCell({ t, maxTotal }: { t: ThreadInfo; maxTotal: number }) {
  const intensity = Math.min(1, t.total_time / maxTotal);
  const bg =
    t.state === "running"
      ? "#84CC16"
      : `rgba(11,11,11,${0.06 + intensity * 0.5})`;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      title={`TID ${t.id} · ${t.cpu.toFixed(1)}% · total ${t.total_time.toFixed(2)}s · ${t.state}`}
      className="h-7 w-7 border-2 border-ink"
      style={{ background: bg }}
    />
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider", className)}>
      {children}
    </th>
  );
}
