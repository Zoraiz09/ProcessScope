// Resource-Allocation Graph (RAG) model + deadlock detection.
// Shared by the Deadlock Detection and Resource Allocation modules.

export interface RagResource {
  id: string;
  instances: number;
}

export interface Allocation {
  resource: string; // R holds-> P  (resource assigned to process)
  process: string;
}

export interface Request {
  process: string; // P requests-> R
  resource: string;
}

export interface RagState {
  processes: string[];
  resources: RagResource[];
  allocations: Allocation[];
  requests: Request[];
}

export interface DeadlockResult {
  deadlocked: boolean;
  deadlockedProcesses: string[];
  cycle: string[]; // e.g. ["P1","R2","P2","R1","P1"]
  steps: string[];
  resolutions: string[];
  safeSequence: string[];
}

const count = <T>(arr: T[], pred: (t: T) => boolean) => arr.filter(pred).length;

/**
 * Deadlock detection by graph reduction (handles multi-instance resources;
 * reduces to cycle detection for single-instance). A process finishes when all
 * its outstanding requests can be met from currently-available instances; it
 * then releases its allocations back to the pool. Whatever can never finish is
 * deadlocked.
 */
export function detectDeadlock(state: RagState): DeadlockResult {
  const available = new Map<string, number>();
  for (const r of state.resources) {
    available.set(r.id, r.instances - count(state.allocations, (a) => a.resource === r.id));
  }

  const reqOf = (p: string) =>
    state.requests.filter((r) => r.process === p);
  const allocOf = (p: string) =>
    state.allocations.filter((a) => a.process === p);

  const finished = new Set<string>();
  const safeSequence: string[] = [];

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const p of state.processes) {
      if (finished.has(p)) continue;
      const canRun = reqOf(p).every((r) => (available.get(r.resource) ?? 0) > 0);
      if (canRun) {
        // release this process's held resources
        for (const a of allocOf(p)) {
          available.set(a.resource, (available.get(a.resource) ?? 0) + 1);
        }
        finished.add(p);
        safeSequence.push(p);
        progressed = true;
      }
    }
  }

  const deadlockedProcesses = state.processes.filter((p) => !finished.has(p));
  const deadlocked = deadlockedProcesses.length > 0;
  const cycle = deadlocked ? findCycle(state) : [];

  return {
    deadlocked,
    deadlockedProcesses,
    cycle,
    steps: buildSteps(state, deadlocked, cycle, safeSequence),
    resolutions: deadlocked ? buildResolutions(state, cycle, deadlockedProcesses) : [],
    safeSequence,
  };
}

/** DFS cycle search over the directed graph (P→R requests, R→P allocations). */
function findCycle(state: RagState): string[] {
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  };
  for (const r of state.requests) add(`P:${r.process}`, `R:${r.resource}`);
  for (const a of state.allocations) add(`R:${a.resource}`, `P:${a.process}`);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];

  const nodes = [
    ...state.processes.map((p) => `P:${p}`),
    ...state.resources.map((r) => `R:${r.id}`),
  ];
  nodes.forEach((n) => color.set(n, WHITE));

  let found: string[] | null = null;
  const dfs = (u: string) => {
    if (found) return;
    color.set(u, GRAY);
    stack.push(u);
    for (const v of adj.get(u) ?? []) {
      if (found) return;
      if (color.get(v) === GRAY) {
        // back-edge → cycle from v..u
        const idx = stack.indexOf(v);
        found = stack.slice(idx).concat(v);
        return;
      }
      if (color.get(v) === WHITE) dfs(v);
    }
    stack.pop();
    color.set(u, BLACK);
  };
  for (const n of nodes) if (color.get(n) === WHITE) dfs(n);

  // strip the "P:" / "R:" prefixes for display
  return ((found as string[] | null) ?? []).map((n) => n.slice(2));
}

function buildSteps(
  state: RagState,
  deadlocked: boolean,
  cycle: string[],
  safeSequence: string[]
): string[] {
  const steps: string[] = [];
  for (const a of state.allocations) {
    steps.push(`${a.process} holds ${a.resource}.`);
  }
  for (const r of state.requests) {
    steps.push(`${r.process} requests ${r.resource} — currently held, so ${r.process} waits.`);
  }
  if (deadlocked && cycle.length) {
    const chain = cycle.join(" → ");
    steps.push(`Circular wait detected: ${chain}.`);
    steps.push(`No process in the cycle can proceed — each waits on a resource held by the next. This is a deadlock.`);
  } else {
    steps.push(
      safeSequence.length
        ? `Safe sequence found: ${safeSequence.join(" → ")}. Every process can eventually finish — no deadlock.`
        : `No outstanding requests — no deadlock.`
    );
  }
  return steps;
}

function buildResolutions(
  state: RagState,
  cycle: string[],
  deadlocked: string[]
): string[] {
  const res: string[] = [];
  const procsInCycle = cycle.filter((n) => state.processes.includes(n));
  const victims = (procsInCycle.length ? procsInCycle : deadlocked).slice(0, 3);

  for (const p of victims) {
    const held = state.allocations.filter((a) => a.process === p).map((a) => a.resource);
    if (held.length) {
      res.push(`Abort ${p} → releases ${held.join(", ")}, breaking the cycle so the others proceed.`);
    } else {
      res.push(`Abort ${p} to break the wait chain.`);
    }
  }
  // Resource preemption suggestion
  const firstReq = state.requests.find((r) => procsInCycle.includes(r.process));
  if (firstReq) {
    res.push(`Preempt ${firstReq.resource} from its current holder and grant it to ${firstReq.process}.`);
  }
  res.push(`Prevention: enforce a global resource ordering so circular wait cannot form.`);
  return res;
}

// ---------------- preset scenarios ----------------

export interface Preset {
  key: string;
  label: string;
  description: string;
  state: RagState;
}

export const DEADLOCK_PRESETS: Preset[] = [
  {
    key: "classic",
    label: "Classic Deadlock",
    description: "P1 holds R1, P2 holds R2 — then each requests the other's resource.",
    state: {
      processes: ["P1", "P2"],
      resources: [{ id: "R1", instances: 1 }, { id: "R2", instances: 1 }],
      allocations: [{ resource: "R1", process: "P1" }, { resource: "R2", process: "P2" }],
      requests: [{ process: "P1", resource: "R2" }, { process: "P2", resource: "R1" }],
    },
  },
  {
    key: "three-way",
    label: "Three-Way Circular Wait",
    description: "Three processes each hold one resource and request the next in a ring.",
    state: {
      processes: ["P1", "P2", "P3"],
      resources: [
        { id: "R1", instances: 1 },
        { id: "R2", instances: 1 },
        { id: "R3", instances: 1 },
      ],
      allocations: [
        { resource: "R1", process: "P1" },
        { resource: "R2", process: "P2" },
        { resource: "R3", process: "P3" },
      ],
      requests: [
        { process: "P1", resource: "R2" },
        { process: "P2", resource: "R3" },
        { process: "P3", resource: "R1" },
      ],
    },
  },
  {
    key: "safe",
    label: "Safe (No Deadlock)",
    description: "P2 waits on R1, but P1 will finish and release it — no circular wait.",
    state: {
      processes: ["P1", "P2"],
      resources: [{ id: "R1", instances: 1 }, { id: "R2", instances: 1 }],
      allocations: [{ resource: "R1", process: "P1" }, { resource: "R2", process: "P2" }],
      requests: [{ process: "P2", resource: "R1" }],
    },
  },
];

export const RESOURCE_PRESETS: Preset[] = [
  {
    key: "ownership",
    label: "Basic Ownership",
    description: "Three processes each own a distinct resource — clean allocation.",
    state: {
      processes: ["P1", "P2", "P3"],
      resources: [
        { id: "CPU", instances: 1 },
        { id: "Disk", instances: 1 },
        { id: "Memory", instances: 1 },
      ],
      allocations: [
        { resource: "CPU", process: "P1" },
        { resource: "Disk", process: "P2" },
        { resource: "Memory", process: "P3" },
      ],
      requests: [],
    },
  },
  {
    key: "contended",
    label: "Contended Resource",
    description: "P1 holds the Printer; P2 and P3 are queued waiting for it.",
    state: {
      processes: ["P1", "P2", "P3"],
      resources: [
        { id: "Printer", instances: 1 },
        { id: "Disk", instances: 1 },
        { id: "Network", instances: 1 },
      ],
      allocations: [
        { resource: "Printer", process: "P1" },
        { resource: "Disk", process: "P2" },
      ],
      requests: [
        { process: "P2", resource: "Printer" },
        { process: "P3", resource: "Printer" },
      ],
    },
  },
  {
    key: "multi",
    label: "Multi-Instance Pool",
    description: "A resource with 2 instances shared across three processes — no deadlock.",
    state: {
      processes: ["P1", "P2", "P3"],
      resources: [
        { id: "CPU", instances: 2 },
        { id: "Disk", instances: 1 },
      ],
      allocations: [
        { resource: "CPU", process: "P1" },
        { resource: "CPU", process: "P2" },
        { resource: "Disk", process: "P3" },
      ],
      requests: [{ process: "P3", resource: "CPU" }],
    },
  },
];
