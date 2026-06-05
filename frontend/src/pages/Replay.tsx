import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Cpu,
  MemoryStick,
  HardDrive,
  ArrowDown,
  ArrowUp,
  Boxes,
  Activity,
  Flag,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentBar } from "@/components/ui/SegmentBar";
import { useMetricsContext } from "@/hooks/MetricsContext";
import { formatBytes, formatPct, clamp, cn } from "@/lib/utils";
import type { MetricsSnapshot } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * "CCTV" for the metrics stream: scrub / play back the in-memory
 * history buffer and inspect the system state at any past moment.
 * ------------------------------------------------------------------ */

interface ReplayEvent {
  index: number;
  kind: "cpu" | "mem" | "procs";
  label: string;
  color: string;
}

export default function Replay() {
  const { history, status } = useMetricsContext();
  const len = history.length;

  const [cursor, setCursor] = useState(0);
  const [live, setLive] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const playRef = useRef<number | null>(null);

  const idx = live ? len - 1 : clamp(cursor, 0, Math.max(0, len - 1));
  const frame: MetricsSnapshot | undefined = history[idx];

  // playback loop
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setCursor((c) => {
        const n = c + 1;
        if (n >= len - 1) {
          setPlaying(false);
          setLive(true);
          return len - 1;
        }
        return n;
      });
    }, 700 / speed);
    playRef.current = id;
    return () => window.clearInterval(id);
  }, [playing, speed, len]);

  const seek = (i: number) => {
    setPlaying(false);
    setLive(false);
    setCursor(clamp(i, 0, len - 1));
  };

  const togglePlay = () => {
    if (idx >= len - 1) {
      setLive(false);
      setCursor(0);
    } else {
      setLive(false);
    }
    setPlaying((p) => !p);
  };

  const goLive = () => {
    setPlaying(false);
    setLive(true);
  };

  const events = useMemo(() => detectEvents(history), [history]);

  if (len < 2) {
    return <Collecting status={status} count={len} />;
  }

  const cpuSeries = history.map((h) => h.cpu.percent);
  const secsAgo = len - 1 - idx;

  return (
    <div className="space-y-5">
      {/* transport */}
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => seek(idx - 1)} className="btn-ghost !px-3 !py-2 text-xs">
            <SkipBack size={14} />
          </button>
          <button onClick={togglePlay} className="btn-primary !px-3 !py-2 text-xs">
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? "Pause" : "Play"}
          </button>
          <button onClick={() => seek(idx + 1)} className="btn-ghost !px-3 !py-2 text-xs">
            <SkipForward size={14} />
          </button>
          <button
            onClick={goLive}
            className={cn(
              "flex items-center gap-1.5 border-2 border-ink px-3 py-2 text-xs font-bold transition-colors",
              live ? "bg-danger text-paper" : "bg-panel hover:bg-lime/30"
            )}
          >
            <Radio size={14} className={live ? "animate-blink" : ""} /> LIVE
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "border-2 border-ink px-2 py-1 font-mono text-xs font-bold transition-colors",
                speed === s ? "bg-ink text-paper" : "bg-panel hover:bg-lime/30"
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="ml-auto font-mono text-xs text-muted">
          {live ? (
            <span className="font-bold text-danger">● LIVE</span>
          ) : (
            <span>
              −{secsAgo}s · frame <b className="text-ink tabular-nums">{idx + 1}</b>/{len}
            </span>
          )}
        </div>
      </Card>

      {/* timeline with playhead + event markers */}
      <Card>
        <CardHeader title="Timeline" icon={<History size={14} />} right={<span className="font-mono text-[11px] text-muted">CPU load · click to scrub</span>} />
        <div className="p-4">
          <Timeline values={cpuSeries} idx={idx} events={events} onSeek={seek} />
          <input
            type="range"
            min={0}
            max={len - 1}
            value={idx}
            onChange={(e) => seek(parseInt(e.target.value, 10))}
            className="mt-3 w-full accent-lime-dark"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
            <span>−{len - 1}s</span>
            <span>now</span>
          </div>
        </div>
      </Card>

      {/* frozen snapshot */}
      {frame && (
        <motion.div
          key={idx}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4"
        >
          <FrameCard title="CPU" icon={<Cpu size={15} />} value={formatPct(frame.cpu.percent)}>
            <SegmentBar value={frame.cpu.percent} segments={12} />
            <p className="mt-2 font-mono text-[11px] text-muted">{frame.cpu.cores_logical} logical cores</p>
          </FrameCard>

          <FrameCard title="Memory" icon={<MemoryStick size={15} />} value={formatPct(frame.memory.percent)}>
            <SegmentBar value={frame.memory.percent} segments={12} />
            <p className="mt-2 font-mono text-[11px] text-muted">
              {formatBytes(frame.memory.used)} / {formatBytes(frame.memory.total)}
            </p>
          </FrameCard>

          <FrameCard title="Disk" icon={<HardDrive size={15} />} value={formatPct(frame.disk.percent)}>
            <SegmentBar value={frame.disk.percent} segments={12} />
            <div className="mt-2 flex gap-3 font-mono text-[11px] text-muted">
              <span className="flex items-center gap-1"><ArrowDown size={11} />{formatBytes(frame.disk.read_speed)}/s</span>
              <span className="flex items-center gap-1"><ArrowUp size={11} />{formatBytes(frame.disk.write_speed)}/s</span>
            </div>
          </FrameCard>

          <FrameCard title="Network" icon={<ArrowDown size={15} />} value={`${frame.network.connections}`}>
            <div className="flex gap-3 font-mono text-xs">
              <span className="flex items-center gap-1 text-ink"><ArrowDown size={12} />{formatBytes(frame.network.download_speed)}/s</span>
              <span className="flex items-center gap-1 text-ink"><ArrowUp size={12} />{formatBytes(frame.network.upload_speed)}/s</span>
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted">connections</p>
          </FrameCard>

          <FrameCard title="Processes" icon={<Boxes size={15} />} value={`${frame.system.process_count}`}>
            <p className="font-mono text-[11px] text-muted">running on {frame.system.hostname}</p>
          </FrameCard>

          <FrameCard title="Threads" icon={<Activity size={15} />} value={`${frame.system.thread_count}`}>
            <p className="font-mono text-[11px] text-muted">total threads</p>
          </FrameCard>

          <FrameCard title="Swap" icon={<MemoryStick size={15} />} value={formatPct(frame.memory.swap_percent)}>
            <SegmentBar value={frame.memory.swap_percent} segments={12} tone="warn" />
          </FrameCard>

          <FrameCard title="Net Total" icon={<ArrowUp size={15} />} value={formatBytes(frame.network.bytes_recv)}>
            <p className="font-mono text-[11px] text-muted">↑ {formatBytes(frame.network.bytes_sent)}</p>
          </FrameCard>
        </motion.div>
      )}

      {/* event log */}
      <Card>
        <CardHeader title="Detected Events" icon={<Flag size={14} />} accent="bg-warn" />
        <div className="max-h-64 overflow-y-auto p-3">
          {events.length === 0 ? (
            <p className="py-6 text-center font-mono text-sm text-muted">
              no notable events in this window — system has been calm.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {[...events].reverse().map((e, i) => (
                <li key={i}>
                  <button
                    onClick={() => seek(e.index)}
                    className={cn(
                      "flex w-full items-center gap-3 border-2 border-ink bg-paper px-3 py-1.5 text-left text-sm transition-colors hover:bg-lime/20",
                      e.index === idx && "bg-lime/40"
                    )}
                  >
                    <span className="h-3 w-3 shrink-0 border-2 border-ink" style={{ background: e.color }} />
                    <span className="font-bold">{e.label}</span>
                    <span className="ml-auto font-mono text-[11px] text-muted">−{len - 1 - e.index}s</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- timeline ---------------- */

function Timeline({
  values,
  idx,
  events,
  onSeek,
}: {
  values: number[];
  idx: number;
  events: ReplayEvent[];
  onSeek: (i: number) => void;
}) {
  const id = useId();
  const w = 1000;
  const h = 120;
  const len = values.length;
  const stepX = w / (len - 1);
  const y = (v: number) => h - (v / 100) * (h - 8) - 4;
  const line = values.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const playX = idx * stepX;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-32 w-full cursor-pointer"
      preserveAspectRatio="none"
      onClick={(e) => {
        const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
        const frac = (e.clientX - rect.left) / rect.width;
        onSeek(Math.round(frac * (len - 1)));
      }}
    >
      <defs>
        <linearGradient id={`tl-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BEF264" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#BEF264" stopOpacity="0.04" />
        </linearGradient>
        <filter id={`tlg-${id}`} x="-5%" y="-20%" width="110%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#84CC16" floodOpacity="0.8" />
        </filter>
      </defs>

      {[50].map((g) => (
        <line key={g} x1="0" y1={y(g)} x2={w} y2={y(g)} stroke="#0B0B0B" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.2" />
      ))}
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#tl-${id})`} />
      <polyline points={line} fill="none" stroke="#84CC16" strokeWidth="2.5" strokeLinejoin="round" filter={`url(#tlg-${id})`} />

      {/* event markers */}
      {events.map((ev, i) => (
        <line key={i} x1={ev.index * stepX} y1="0" x2={ev.index * stepX} y2={h} stroke={ev.color} strokeWidth="2" opacity="0.7" />
      ))}

      {/* playhead */}
      <line x1={playX} y1="0" x2={playX} y2={h} stroke="#0B0B0B" strokeWidth="2.5" />
      <circle cx={playX} cy={y(values[idx] ?? 0)} r="5.5" fill="#C6FF3D" stroke="#0B0B0B" strokeWidth="2.5" />
    </svg>
  );
}

/* ---------------- bits ---------------- */

function FrameCard({
  title,
  icon,
  value,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card hover className="bg-grad-panel">
      <CardHeader title={title} icon={icon} />
      <div className="p-4">
        <div className="mb-3 font-display text-3xl font-bold tabular-nums">{value}</div>
        {children}
      </div>
    </Card>
  );
}

function detectEvents(history: MetricsSnapshot[]): ReplayEvent[] {
  const out: ReplayEvent[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const cur = history[i];
    if (cur.cpu.percent >= 85 && prev.cpu.percent < 85) {
      out.push({ index: i, kind: "cpu", label: `CPU spike — ${formatPct(cur.cpu.percent)}`, color: "#FF4D4D" });
    }
    if (cur.memory.percent >= 85 && prev.memory.percent < 85) {
      out.push({ index: i, kind: "mem", label: `Memory pressure — ${formatPct(cur.memory.percent)}`, color: "#3B82F6" });
    }
    const dProc = cur.system.process_count - prev.system.process_count;
    if (dProc >= 5) {
      out.push({ index: i, kind: "procs", label: `Process burst — +${dProc} processes`, color: "#FFB020" });
    }
  }
  return out;
}

function Collecting({ status, count }: { status: string; count: number }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <History size={36} className="mx-auto mb-3 text-lime-dark" />
        <h2 className="mb-1 font-display text-xl font-bold">Recording…</h2>
        <p className="font-mono text-sm text-muted">
          {status === "live"
            ? `Captured ${count} frame(s). The replay timeline unlocks once there's history to scrub.`
            : `Waiting for the metrics stream — status: ${status}.`}
        </p>
      </Card>
    </div>
  );
}
