import { motion } from "framer-motion";
import type { GanttSegment } from "@/lib/scheduler";

export function GanttChart({
  gantt,
  colorOf,
  animKey,
}: {
  gantt: GanttSegment[];
  colorOf: (pid: string) => string;
  animKey: string | number;
}) {
  if (gantt.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center font-mono text-sm text-muted">
        add processes and run a scheduler
      </div>
    );
  }
  const total = gantt[gantt.length - 1].end || 1;
  // Build the set of tick marks (segment boundaries).
  const ticks = Array.from(new Set([0, ...gantt.map((s) => s.end)])).sort((a, b) => a - b);

  return (
    <div className="w-full">
      {/* bars */}
      <div className="flex w-full overflow-hidden border-3 border-ink">
        {gantt.map((seg, i) => {
          const width = ((seg.end - seg.start) / total) * 100;
          const idle = seg.pid === null;
          return (
            <motion.div
              key={`${animKey}-${i}`}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 0.35, delay: i * 0.18, ease: "easeOut" }}
              className="relative flex h-14 items-center justify-center border-r-2 border-ink last:border-r-0"
              style={{
                background: idle
                  ? "repeating-linear-gradient(45deg,#F4F4F0,#F4F4F0 6px,#E2E2DC 6px,#E2E2DC 12px)"
                  : colorOf(seg.pid as string),
                minWidth: idle ? 0 : 28,
              }}
              title={`${idle ? "IDLE" : seg.pid}: ${seg.start}–${seg.end}`}
            >
              <span className="font-display text-sm font-bold text-ink">
                {idle ? "" : seg.pid}
              </span>
            </motion.div>
          );
        })}
      </div>
      {/* timeline ticks */}
      <div className="relative mt-1 h-5 w-full">
        {ticks.map((t, i) => (
          <motion.span
            key={`${animKey}-tick-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="absolute -translate-x-1/2 font-mono text-[11px] tabular-nums text-ink-soft"
            style={{ left: `${(t / total) * 100}%` }}
          >
            {t}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
