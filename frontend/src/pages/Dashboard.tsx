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
  Gauge,
} from "lucide-react";
import { useMetricsContext } from "@/hooks/MetricsContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { RingGauge } from "@/components/ui/RingGauge";
import { MetricArea } from "@/components/ui/MetricArea";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatBytes, formatPct } from "@/lib/utils";

export default function Dashboard() {
  const { snapshot, history } = useMetricsContext();

  if (!snapshot) {
    return <DashboardSkeleton />;
  }

  const { cpu, memory, disk, network, system } = snapshot;
  const tail = history.slice(-60);
  const cpuHist = tail.map((h) => h.cpu.percent);
  const memHist = tail.map((h) => h.memory.percent);
  const netDownHist = tail.map((h) => h.network.download_speed);

  return (
    <div className="space-y-6">
      {/* ---- dark hero banner ---- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card-ink grid-noise flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <HeroStat label="Host" value={system.hostname} />
          <HeroStat label="OS" value={system.os} />
          <HeroStat label="Uptime" value={formatUptime(system.uptime)} icon={<Clock size={13} />} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DarkPill icon={<Boxes size={13} />} value={system.process_count} label="processes" />
          <DarkPill icon={<Activity size={13} />} value={system.thread_count} label="threads" />
          <span className="flex items-center gap-2 border-2 border-lime/60 bg-lime/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-lime">
            <span className="h-2 w-2 glow-dot animate-pulse-bar bg-lime" />
            streaming
          </span>
        </div>
      </motion.div>

      {/* ---- gauge cards ---- */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <GaugeCard title="CPU" icon={<Cpu size={15} />} delay={0}>
          <RingGauge value={cpu.percent} label={formatPct(cpu.percent, 0)} sublabel="load" />
          <div className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-ink-soft">
            <span>{cpu.cores_logical} threads</span>
            <span>{cpu.cores_physical} cores</span>
            {cpu.freq_mhz != null && <span>{(cpu.freq_mhz / 1000).toFixed(2)} GHz</span>}
            {cpu.temperature_c != null && (
              <span className="flex items-center gap-1">
                <Thermometer size={11} /> {cpu.temperature_c}°C
              </span>
            )}
          </div>
        </GaugeCard>

        <GaugeCard title="Memory" icon={<MemoryStick size={15} />} delay={0.05}>
          <RingGauge value={memory.percent} label={formatPct(memory.percent, 0)} sublabel="used" tone="info" />
          <div className="mt-3 w-full space-y-1 font-mono text-[11px] text-ink-soft">
            <Row k="Used" v={formatBytes(memory.used)} />
            <Row k="Free" v={formatBytes(memory.available)} />
            <Row k="Total" v={formatBytes(memory.total)} />
          </div>
        </GaugeCard>

        <GaugeCard title="Storage" icon={<HardDrive size={15} />} delay={0.1}>
          <RingGauge value={disk.percent} label={formatPct(disk.percent, 0)} sublabel="used" />
          <div className="mt-3 grid w-full grid-cols-2 gap-2 font-mono text-[11px]">
            <SpeedTile dir="read" value={disk.read_speed} icon={<ArrowDown size={12} />} />
            <SpeedTile dir="write" value={disk.write_speed} icon={<ArrowUp size={12} />} />
          </div>
        </GaugeCard>

        {/* network: not a percentage → stat-led card */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card hover className="h-full bg-grad-panel">
            <CardHeader title="Network" icon={<Wifi size={15} />} />
            <div className="p-4">
              <div className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold tabular-nums">{network.connections}</span>
                <span className="text-xs text-muted">connections</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <SpeedTile dir="down" value={network.download_speed} icon={<ArrowDown size={12} />} />
                <SpeedTile dir="up" value={network.upload_speed} icon={<ArrowUp size={12} />} />
              </div>
              <div className="mt-3 -mb-1">
                <Sparkline data={netDownHist} width={240} height={40} fill="#14B8A6" stroke="#0B0B0B" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ---- history charts ---- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="CPU Load" icon={<Cpu size={14} />} current={formatPct(cpu.percent, 0)}>
          <MetricArea values={cpuHist} color="#84CC16" fixed100 height={200} fmt={(n) => formatPct(n, 0)} />
        </ChartCard>
        <ChartCard title="Memory" icon={<MemoryStick size={14} />} current={formatPct(memory.percent, 0)}>
          <MetricArea values={memHist} color="#3B82F6" fixed100 height={200} fmt={(n) => formatPct(n, 0)} />
        </ChartCard>
      </div>

      {/* ---- per-core load ---- */}
      <Card className="bg-grad-panel">
        <CardHeader title="Per-Core Load" icon={<Gauge size={14} />} right={<span className="font-mono text-[10px] uppercase text-muted">{cpu.per_core.length} logical cores</span>} />
        <div className="grid grid-cols-4 gap-2 p-4 sm:grid-cols-8 xl:grid-cols-12">
          {cpu.per_core.map((v, i) => (
            <div key={i} title={`Core ${i}: ${v}%`} className="space-y-1">
              <div className="relative h-20 border-2 border-ink bg-paper">
                <motion.div
                  className="absolute bottom-0 left-0 right-0"
                  style={{ background: coreGradient(v) }}
                  initial={{ height: 0 }}
                  animate={{ height: `${v}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                />
              </div>
              <div className="text-center font-mono text-[9px] tabular-nums text-muted">{Math.round(v)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function GaugeCard({
  title,
  icon,
  children,
  delay,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      <Card hover className="h-full bg-grad-panel">
        <CardHeader title={title} icon={icon} />
        <div className="flex flex-col items-center p-4">{children}</div>
      </Card>
    </motion.div>
  );
}

function ChartCard({
  title,
  icon,
  current,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-grad-panel">
      <CardHeader
        title={`${title} — last 60s`}
        icon={icon}
        right={<span className="font-display text-lg font-bold tabular-nums">{current}</span>}
      />
      <div className="p-4">{children}</div>
    </Card>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-lime/70">
        {icon}
        {label}
      </div>
      <div className="font-display text-base font-bold text-paper">{value}</div>
    </div>
  );
}

function DarkPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <span className="flex items-center gap-2 border-2 border-paper/25 bg-paper/5 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-paper/90">
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="text-paper/50">{label}</span>
    </span>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <b className="text-ink">{v}</b>
    </div>
  );
}

function SpeedTile({ dir, value, icon }: { dir: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border-2 border-ink bg-paper px-2 py-1.5 font-mono">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
        {icon} {dir}
      </div>
      <div className="text-sm font-bold text-ink">{formatBytes(value)}/s</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card-ink h-20 animate-pulse-bar" />
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-64 animate-pulse-bar p-4">
            <div className="mb-4 h-6 w-24 bg-paper" />
            <div className="mx-auto h-28 w-28 rounded-full bg-paper" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function coreGradient(v: number): string {
  if (v > 85) return "linear-gradient(to top, #FF4D4D, #FF7A7A)";
  if (v > 60) return "linear-gradient(to top, #FFB020, #FFCA5A)";
  return "linear-gradient(to top, #84CC16, #C6FF3D)";
}

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
