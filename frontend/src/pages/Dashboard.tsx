import { motion } from "framer-motion";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Thermometer,
  ArrowUp,
  ArrowDown,
  Clock,
  Boxes,
  Activity,
} from "lucide-react";
import { useMetricsContext } from "@/hooks/MetricsContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentBar } from "@/components/ui/SegmentBar";
import { Sparkline } from "@/components/ui/Sparkline";
import { Pill } from "@/components/ui/Pill";
import { formatBytes, formatPct } from "@/lib/utils";

export default function Dashboard() {
  const { snapshot, history } = useMetricsContext();

  if (!snapshot) {
    return <DashboardSkeleton />;
  }

  const { cpu, memory, disk, network, system } = snapshot;
  const cpuHist = history.map((h) => h.cpu.percent);
  const memHist = history.map((h) => h.memory.percent);
  const netDownHist = history.map((h) => h.network.download_speed);

  return (
    <div className="space-y-6">
      {/* system banner */}
      <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Stat label="Host" value={system.hostname} />
          <Stat label="OS" value={system.os} />
          <Stat label="Uptime" value={formatUptime(system.uptime)} icon={<Clock size={13} />} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill variant="ghost"><Boxes size={12} /> {system.process_count} processes</Pill>
          <Pill variant="ghost"><Activity size={12} /> {system.thread_count} threads</Pill>
        </div>
      </Card>

      {/* primary grid */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {/* CPU */}
        <OverviewCard
          title="CPU"
          icon={<Cpu size={15} />}
          delay={0}
          headline={formatPct(cpu.percent, 0)}
          sub={`${cpu.cores_logical} logical · ${cpu.cores_physical} physical`}
        >
          <SegmentBar value={cpu.percent} segments={12} className="mb-3" />
          <div className="flex items-end justify-between">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-ink-soft">
              {cpu.freq_mhz != null && <span>{(cpu.freq_mhz / 1000).toFixed(2)} GHz</span>}
              {cpu.temperature_c != null && (
                <span className="flex items-center gap-1">
                  <Thermometer size={11} /> {cpu.temperature_c}°C
                </span>
              )}
              <span>{cpu.per_core.length} threads</span>
            </div>
            <Sparkline data={cpuHist} />
          </div>
          {/* per-core mini grid */}
          <div className="mt-3 grid grid-cols-8 gap-1 sm:grid-cols-12 xl:grid-cols-8">
            {cpu.per_core.map((c, i) => (
              <div
                key={i}
                title={`Core ${i}: ${c}%`}
                className="h-6 border border-ink"
                style={{
                  background: `linear-gradient(to top, ${coreColor(c)} ${c}%, #F4F4F0 ${c}%)`,
                }}
              />
            ))}
          </div>
        </OverviewCard>

        {/* Memory */}
        <OverviewCard
          title="Memory"
          icon={<MemoryStick size={15} />}
          delay={0.05}
          headline={formatPct(memory.percent, 0)}
          sub={`${formatBytes(memory.used)} / ${formatBytes(memory.total)}`}
        >
          <SegmentBar value={memory.percent} segments={12} className="mb-3" />
          <div className="flex items-end justify-between">
            <div className="space-y-1 font-mono text-[11px] text-ink-soft">
              <div>Used: <b className="text-ink">{formatBytes(memory.used)}</b></div>
              <div>Free: <b className="text-ink">{formatBytes(memory.available)}</b></div>
              {memory.swap_total > 0 && (
                <div>Swap: {formatPct(memory.swap_percent)}</div>
              )}
            </div>
            <Sparkline data={memHist} fill="#A3E635" />
          </div>
        </OverviewCard>

        {/* Storage */}
        <OverviewCard
          title="Storage"
          icon={<HardDrive size={15} />}
          delay={0.1}
          headline={formatPct(disk.percent, 0)}
          sub={`${formatBytes(disk.used)} / ${formatBytes(disk.total)}`}
        >
          <SegmentBar value={disk.percent} segments={12} className="mb-3" />
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <SpeedTile dir="read" value={disk.read_speed} icon={<ArrowDown size={12} />} />
            <SpeedTile dir="write" value={disk.write_speed} icon={<ArrowUp size={12} />} />
          </div>
          <p className="mt-3 font-mono text-[11px] text-ink-soft">
            Free: <b className="text-ink">{formatBytes(disk.free)}</b>
          </p>
        </OverviewCard>

        {/* Network */}
        <OverviewCard
          title="Network"
          icon={<Wifi size={15} />}
          delay={0.15}
          headline={`${network.connections}`}
          sub="active connections"
        >
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <SpeedTile dir="down" value={network.download_speed} icon={<ArrowDown size={12} />} />
            <SpeedTile dir="up" value={network.upload_speed} icon={<ArrowUp size={12} />} />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="font-mono text-[11px] text-ink-soft">
              <div>↓ {formatBytes(network.bytes_recv)}</div>
              <div>↑ {formatBytes(network.bytes_sent)}</div>
            </div>
            <Sparkline data={netDownHist} fill="#3B82F6" max={undefined} />
          </div>
        </OverviewCard>
      </div>

      {/* live CPU history chart */}
      <Card>
        <CardHeader title="CPU Load — last 60s" icon={<Cpu size={14} />} />
        <div className="p-4">
          <BigChart data={cpuHist} />
        </div>
      </Card>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function OverviewCard({
  title,
  icon,
  headline,
  sub,
  children,
  delay,
}: {
  title: string;
  icon: React.ReactNode;
  headline: string;
  sub: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card hover>
        <CardHeader title={title} icon={icon} />
        <div className="p-4">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tabular-nums">{headline}</span>
            <span className="text-xs text-muted">{sub}</span>
          </div>
          {children}
        </div>
      </Card>
    </motion.div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted">
        {icon}
        {label}
      </div>
      <div className="font-display text-sm font-bold">{value}</div>
    </div>
  );
}

function SpeedTile({ dir, value, icon }: { dir: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border-2 border-ink bg-paper px-2 py-1.5">
      <div className="flex items-center gap-1 uppercase tracking-wider text-muted">
        {icon} {dir}
      </div>
      <div className="text-sm font-bold text-ink">{formatBytes(value)}/s</div>
    </div>
  );
}

function BigChart({ data }: { data: number[] }) {
  const w = 1000;
  const h = 160;
  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center font-mono text-sm text-muted">
        collecting samples…
      </div>
    );
  }
  const stepX = w / (data.length - 1);
  const pts = data.map((d, i) => [i * stepX, h - (d / 100) * (h - 8) - 4] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" preserveAspectRatio="none">
      {[25, 50, 75].map((g) => (
        <line key={g} x1="0" y1={h - (g / 100) * (h - 8) - 4} x2={w} y2={h - (g / 100) * (h - 8) - 4} stroke="#0B0B0B" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
      ))}
      <polygon points={area} fill="#BEF264" fillOpacity="0.35" />
      <polyline points={line} fill="none" stroke="#0B0B0B" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card h-56 animate-pulse-bar p-4">
          <div className="mb-4 h-6 w-24 bg-paper" />
          <div className="h-10 w-32 bg-paper" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function coreColor(v: number): string {
  if (v > 85) return "#FF4D4D";
  if (v > 60) return "#FFB020";
  return "#A3E635";
}

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
