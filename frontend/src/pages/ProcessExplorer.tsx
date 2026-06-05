import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, ArrowUpDown, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { cn, formatBytes, formatPct } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import type { ProcessInfo, ProcessDetail } from "@/lib/types";

type SortKey = "cpu" | "memory" | "threads" | "name" | "pid";

const STATE_TONE: Record<string, string> = {
  running: "bg-lime",
  sleeping: "bg-paper",
  stopped: "bg-warn",
  "disk-sleep": "bg-info text-paper",
  zombie: "bg-danger text-paper",
};

export default function ProcessExplorer() {
  const [procs, setProcs] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<ProcessInfo | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/processes?limit=300"));
      const data = await res.json();
      setProcs(data.processes ?? []);
    } catch {
      setProcs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = procs;
    if (q) {
      list = procs.filter(
        (p) => p.name.toLowerCase().includes(q) || String(p.pid).includes(q)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
  }, [procs, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <Card className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 border-2 border-ink bg-paper px-3 py-2 md:w-80">
          <Search size={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or PID…  (e.g. chrome)"
            className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={15} className="text-muted hover:text-ink" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Pill variant="ghost">{filtered.length} shown</Pill>
          <button onClick={load} className="btn-ghost !px-3 !py-2 text-xs">
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </Card>

      {/* table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-3 border-ink bg-ink text-paper">
                <Th onClick={() => toggleSort("pid")} active={sortKey === "pid"} className="w-20">PID</Th>
                <Th onClick={() => toggleSort("name")} active={sortKey === "name"}>Name</Th>
                <Th onClick={() => toggleSort("cpu")} active={sortKey === "cpu"} className="w-28">CPU %</Th>
                <Th onClick={() => toggleSort("memory")} active={sortKey === "memory"} className="w-32">Memory</Th>
                <Th onClick={() => toggleSort("threads")} active={sortKey === "threads"} className="w-24">Threads</Th>
                <th className="px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider">State</th>
              </tr>
            </thead>
            <tbody>
              {loading && procs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center font-mono text-muted">loading processes…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center font-mono text-muted">no matching processes</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.pid}
                    onClick={() => setSelected(p)}
                    className="cursor-pointer border-b-2 border-ink/10 transition-colors hover:bg-lime/20"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted">{p.pid}</td>
                    <td className="px-3 py-2 font-semibold">{p.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 border border-ink bg-paper">
                          <div className="h-full bg-lime-deep" style={{ width: `${Math.min(100, p.cpu)}%` }} />
                        </div>
                        <span className="font-mono text-xs tabular-nums">{formatPct(p.cpu, 1)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">{formatBytes(p.memory_bytes)}</td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">{p.threads}</td>
                    <td className="px-3 py-2">
                      <span className={cn("pill text-[9px]", STATE_TONE[p.status] ?? "bg-paper")}>{p.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && <ProcessDrawer proc={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-2.5 text-left", className)}>
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider",
          active ? "text-lime" : "text-paper/80 hover:text-paper"
        )}
      >
        {children}
        <ArrowUpDown size={11} />
      </button>
    </th>
  );
}

function ProcessDrawer({ proc, onClose }: { proc: ProcessInfo; onClose: () => void }) {
  const [detail, setDetail] = useState<ProcessDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(apiUrl(`/api/processes/${proc.pid}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setDetail(d))
      .catch(() => alive && setDetail(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [proc.pid]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l-3 border-ink bg-panel shadow-brutal-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b-3 border-ink bg-ink px-5 py-4 text-paper">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-paper/60">PID {proc.pid}</p>
            <h3 className="truncate font-display text-xl font-bold">{proc.name}</h3>
          </div>
          <button onClick={onClose} className="border-2 border-paper p-1.5 hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <DetailRow label="Parent" value={detail?.parent_name ? `${detail.parent_name} (${detail.ppid})` : loading ? "…" : String(detail?.ppid ?? "—")} />
          <DetailRow label="CPU Usage" value={formatPct(detail?.cpu ?? proc.cpu, 1)} />
          <DetailRow label="Memory" value={`${formatBytes(detail?.memory_bytes ?? proc.memory_bytes)} (${formatPct(detail?.memory ?? proc.memory, 1)})`} />
          <DetailRow label="Threads" value={String(detail?.threads ?? proc.threads)} />
          <DetailRow label="State" value={detail?.status ?? proc.status} />
          <DetailRow label="User" value={detail?.username ?? (loading ? "…" : "—")} />
          <DetailRow
            label="Started"
            value={detail?.create_time ? new Date(detail.create_time * 1000).toLocaleString() : loading ? "…" : "—"}
          />
          {detail?.exe && (
            <div className="border-2 border-ink px-3 py-2.5">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Path</p>
              <p className="break-all font-mono text-xs">{detail.exe}</p>
            </div>
          )}

          {detail && detail.children.length > 0 && (
            <div className="border-2 border-ink">
              <p className="border-b-2 border-ink bg-paper px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                Child Processes ({detail.num_children})
              </p>
              <ul className="max-h-44 overflow-y-auto">
                {detail.children.map((c) => (
                  <li key={c.pid} className="flex justify-between border-b border-ink/10 px-3 py-1.5 text-sm">
                    <span className="font-semibold">{c.name}</span>
                    <span className="font-mono text-xs text-muted">{c.pid}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-2 border-ink px-3 py-2.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
