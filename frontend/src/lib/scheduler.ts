// CPU scheduling algorithms — pure, deterministic, UI-agnostic.
// Each algorithm returns a Gantt timeline + per-process and aggregate metrics.

export interface SchedProcess {
  id: string;
  arrival: number;
  burst: number;
  priority: number; // lower number = higher priority
}

export interface GanttSegment {
  pid: string | null; // null = CPU idle
  start: number;
  end: number;
}

export interface ProcMetrics {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
  completion: number;
  turnaround: number;
  waiting: number;
  response: number;
}

export interface SchedResult {
  gantt: GanttSegment[];
  metrics: ProcMetrics[];
  avgWaiting: number;
  avgTurnaround: number;
  avgResponse: number;
  throughput: number;
  totalTime: number;
}

export type AlgoKey = "fcfs" | "sjf" | "priority" | "rr" | "mlq";

export const ALGORITHMS: { key: AlgoKey; label: string; abbr: string; blurb: string; preemptive: boolean }[] = [
  { key: "fcfs", label: "First Come First Serve", abbr: "FCFS", blurb: "Runs processes in arrival order. Simple, but long jobs delay everyone (convoy effect).", preemptive: false },
  { key: "sjf", label: "Shortest Job First", abbr: "SJF", blurb: "Picks the shortest available burst next. Optimal average wait, but can starve long jobs.", preemptive: false },
  { key: "priority", label: "Priority Scheduling", abbr: "PRIO", blurb: "Runs the highest-priority ready process (lower number = higher). Risk of starvation.", preemptive: false },
  { key: "rr", label: "Round Robin", abbr: "RR", blurb: "Each process gets a fixed time quantum in turn. Fair and responsive for time-sharing.", preemptive: true },
  { key: "mlq", label: "Multilevel Queue", abbr: "MLQ", blurb: "Splits processes into a high-priority (RR) and a low-priority (FCFS) queue; high runs first.", preemptive: true },
];

/** Merge adjacent same-pid segments for a clean Gantt. */
function compress(raw: GanttSegment[]): GanttSegment[] {
  const out: GanttSegment[] = [];
  for (const seg of raw) {
    if (seg.end <= seg.start) continue;
    const last = out[out.length - 1];
    if (last && last.pid === seg.pid && last.end === seg.start) last.end = seg.end;
    else out.push({ ...seg });
  }
  return out;
}

function summarize(procs: SchedProcess[], gantt: GanttSegment[]): SchedResult {
  const firstStart = new Map<string, number>();
  const completion = new Map<string, number>();
  for (const seg of gantt) {
    if (seg.pid === null) continue;
    if (!firstStart.has(seg.pid)) firstStart.set(seg.pid, seg.start);
    completion.set(seg.pid, seg.end);
  }
  const metrics: ProcMetrics[] = procs.map((p) => {
    const comp = completion.get(p.id) ?? p.arrival;
    const turnaround = comp - p.arrival;
    const waiting = turnaround - p.burst;
    const response = (firstStart.get(p.id) ?? p.arrival) - p.arrival;
    return {
      id: p.id,
      arrival: p.arrival,
      burst: p.burst,
      priority: p.priority,
      completion: comp,
      turnaround,
      waiting: Math.max(0, waiting),
      response: Math.max(0, response),
    };
  });
  const n = metrics.length || 1;
  const totalTime = gantt.length ? gantt[gantt.length - 1].end : 0;
  return {
    gantt,
    metrics,
    avgWaiting: metrics.reduce((s, m) => s + m.waiting, 0) / n,
    avgTurnaround: metrics.reduce((s, m) => s + m.turnaround, 0) / n,
    avgResponse: metrics.reduce((s, m) => s + m.response, 0) / n,
    throughput: totalTime ? metrics.length / totalTime : 0,
    totalTime,
  };
}

/** Generic non-preemptive driver: `pick` chooses the next process from the ready set. */
function nonPreemptive(
  procs: SchedProcess[],
  pick: (ready: SchedProcess[]) => SchedProcess
): SchedResult {
  const remaining = [...procs].sort((a, b) => a.arrival - b.arrival);
  const gantt: GanttSegment[] = [];
  let time = 0;
  const done = new Set<string>();

  while (done.size < procs.length) {
    const ready = remaining.filter((p) => !done.has(p.id) && p.arrival <= time);
    if (ready.length === 0) {
      const next = remaining.find((p) => !done.has(p.id))!;
      gantt.push({ pid: null, start: time, end: next.arrival });
      time = next.arrival;
      continue;
    }
    const proc = pick(ready);
    gantt.push({ pid: proc.id, start: time, end: time + proc.burst });
    time += proc.burst;
    done.add(proc.id);
  }
  return summarize(procs, compress(gantt));
}

function fcfs(procs: SchedProcess[]): SchedResult {
  return nonPreemptive(procs, (ready) =>
    ready.reduce((a, b) => (a.arrival <= b.arrival ? a : b))
  );
}

function sjf(procs: SchedProcess[]): SchedResult {
  return nonPreemptive(procs, (ready) =>
    ready.reduce((a, b) => (a.burst <= b.burst ? a : b))
  );
}

function priority(procs: SchedProcess[]): SchedResult {
  return nonPreemptive(procs, (ready) =>
    ready.reduce((a, b) => (a.priority <= b.priority ? a : b))
  );
}

/** Round Robin with a time quantum. */
function roundRobin(procs: SchedProcess[], quantum: number): SchedResult {
  const sorted = [...procs].sort((a, b) => a.arrival - b.arrival);
  const remain = new Map(sorted.map((p) => [p.id, p.burst]));
  const gantt: GanttSegment[] = [];
  const queue: string[] = [];
  let time = 0;
  let idx = 0; // next not-yet-arrived process
  const enqueueArrivals = (upTo: number) => {
    while (idx < sorted.length && sorted[idx].arrival <= upTo) {
      queue.push(sorted[idx].id);
      idx++;
    }
  };

  enqueueArrivals(time);
  while (queue.length || idx < sorted.length) {
    if (queue.length === 0) {
      // CPU idle until next arrival
      const next = sorted[idx];
      gantt.push({ pid: null, start: time, end: next.arrival });
      time = next.arrival;
      enqueueArrivals(time);
      continue;
    }
    const id = queue.shift()!;
    const left = remain.get(id)!;
    const run = Math.min(quantum, left);
    gantt.push({ pid: id, start: time, end: time + run });
    time += run;
    remain.set(id, left - run);
    enqueueArrivals(time); // new arrivals queue ahead of the re-queued process
    if (left - run > 0) queue.push(id);
  }
  return summarize(procs, compress(gantt));
}

/**
 * Multilevel Queue (simplified): priority <= 1 → high-priority RR queue,
 * the rest → low-priority FCFS queue. The high queue is fully drained
 * (round-robin) before the low queue runs.
 */
function multilevel(procs: SchedProcess[], quantum: number): SchedResult {
  const high = procs.filter((p) => p.priority <= 1);
  const low = procs.filter((p) => p.priority > 1);

  // Run high queue (RR) first, then low queue (FCFS), chaining the clock.
  const segments: GanttSegment[] = [];
  let clock = 0;

  const runChunk = (res: SchedResult, offsetBase: number) => {
    // Shift a sub-schedule so it begins no earlier than `clock`.
    const shift = Math.max(0, clock - offsetBase);
    for (const seg of res.gantt) {
      if (seg.pid === null) continue;
      segments.push({ pid: seg.pid, start: seg.start + shift, end: seg.end + shift });
    }
    if (res.gantt.length) clock = Math.max(clock, res.gantt[res.gantt.length - 1].end + shift);
  };

  if (high.length) runChunk(roundRobin(high, quantum), 0);
  if (low.length) runChunk(fcfs(low), 0);

  segments.sort((a, b) => a.start - b.start);
  return summarize(procs, compress(segments));
}

export function schedule(
  algo: AlgoKey,
  procs: SchedProcess[],
  quantum = 2
): SchedResult {
  if (procs.length === 0) {
    return { gantt: [], metrics: [], avgWaiting: 0, avgTurnaround: 0, avgResponse: 0, throughput: 0, totalTime: 0 };
  }
  switch (algo) {
    case "fcfs": return fcfs(procs);
    case "sjf": return sjf(procs);
    case "priority": return priority(procs);
    case "rr": return roundRobin(procs, Math.max(1, quantum));
    case "mlq": return multilevel(procs, Math.max(1, quantum));
  }
}

// Stable color per process index (lime-forward brutalist palette).
export const PROC_COLORS = [
  "#BEF264", "#84CC16", "#3B82F6", "#FFB020", "#FF4D4D",
  "#A78BFA", "#22C55E", "#EC4899", "#06B6D4", "#F97316",
];
