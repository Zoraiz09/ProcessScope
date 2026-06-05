import { Link, useNavigate } from "react-router-dom";
import { useMetricsContext } from "@/hooks/MetricsContext";
import { StatusDot } from "./StatusDot";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Cpu, MemoryStick, Boxes, ChevronLeft, Home } from "lucide-react";
import { formatPct } from "@/lib/utils";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { snapshot, status } = useMetricsContext();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b-3 border-ink bg-paper/95 px-5 py-3 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          title="Go back"
          className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-panel shadow-brutal-sm transition-all hover:bg-lime active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-muted md:text-sm">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {snapshot && (
          <div className="hidden items-center gap-2 md:flex">
            <MiniStat icon={<Cpu size={14} />} value={snapshot.cpu.percent} fmt={(n) => formatPct(n, 0)} label="CPU" />
            <MiniStat
              icon={<MemoryStick size={14} />}
              value={snapshot.memory.percent}
              fmt={(n) => formatPct(n, 0)}
              label="MEM"
            />
            <MiniStat
              icon={<Boxes size={14} />}
              value={snapshot.system.process_count}
              fmt={(n) => String(Math.round(n))}
              label="PROC"
            />
          </div>
        )}
        <StatusDot status={status} />
        <Link
          to="/"
          title="Back to home"
          className="hidden h-9 items-center gap-1.5 border-2 border-ink bg-panel px-3 font-mono text-[11px] font-bold uppercase shadow-brutal-sm transition-all hover:bg-lime active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:flex"
        >
          <Home size={14} strokeWidth={2.5} />
          Home
        </Link>
      </div>
    </header>
  );
}

function MiniStat({
  icon,
  value,
  fmt,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  fmt: (n: number) => string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 border-2 border-ink bg-panel px-2.5 py-1.5">
      <span className="text-ink-soft">{icon}</span>
      <AnimatedNumber value={value} format={fmt} className="font-mono text-sm font-bold tabular-nums" />
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}
