import { Link } from "react-router-dom";
import { useMetricsContext } from "@/hooks/MetricsContext";
import { StatusDot } from "./StatusDot";
import { Cpu, MemoryStick, Boxes } from "lucide-react";
import { formatPct } from "@/lib/utils";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { snapshot, status } = useMetricsContext();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b-3 border-ink bg-paper/95 px-5 py-3 backdrop-blur md:px-8">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted md:text-sm">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {snapshot && (
          <div className="hidden items-center gap-2 md:flex">
            <MiniStat icon={<Cpu size={14} />} value={formatPct(snapshot.cpu.percent)} label="CPU" />
            <MiniStat
              icon={<MemoryStick size={14} />}
              value={formatPct(snapshot.memory.percent)}
              label="MEM"
            />
            <MiniStat
              icon={<Boxes size={14} />}
              value={String(snapshot.system.process_count)}
              label="PROC"
            />
          </div>
        )}
        <StatusDot status={status} />
        <Link to="/" className="hidden font-mono text-[11px] uppercase text-muted hover:text-ink sm:block">
          ← Site
        </Link>
      </div>
    </header>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 border-2 border-ink bg-panel px-2.5 py-1.5">
      <span className="text-ink-soft">{icon}</span>
      <span className="font-mono text-sm font-bold tabular-nums">{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}
