import { useMemo } from "react";
import type { RagState, DeadlockResult } from "@/lib/rag";

interface Node {
  id: string;
  kind: "process" | "resource";
  x: number;
  y: number;
  instances?: number;
}

const W = 560;
const H = 440;
const CX = W / 2;
const CY = H / 2;
const R = 158;
const P_R = 26; // process circle radius
const RES = 50; // resource square side

/**
 * Circular RAG renderer. Nodes are ordered by the detected cycle (if any) so a
 * circular wait draws as a clean polygon. Process = circle, resource = square
 * (dots = instances). Allocation edges R→P (solid), request edges P→R (dashed);
 * edges on the deadlock cycle are drawn thick red.
 */
export function RagGraph({ state, result }: { state: RagState; result: DeadlockResult }) {
  const nodes = useMemo(() => layout(state, result), [state, result]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // edges on the cycle (consecutive prefixed pairs)
  const cycleEdges = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < result.cycle.length - 1; i++) {
      s.add(`${result.cycle[i]}->${result.cycle[i + 1]}`);
    }
    return s;
  }, [result.cycle]);

  const edges = [
    ...state.allocations.map((a) => ({ from: a.resource, to: a.process, kind: "alloc" as const })),
    ...state.requests.map((r) => ({ from: r.process, to: r.resource, kind: "request" as const })),
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 460 }}>
      <defs>
        <marker id="arrow-ink" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#0B0B0B" />
        </marker>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#FF4D4D" />
        </marker>
      </defs>

      {/* edges */}
      {edges.map((e, i) => {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
        if (!a || !b) return null;
        const onCycle = cycleEdges.has(`${e.from}->${e.to}`);
        const [x1, y1] = boundaryPoint(a, b);
        const [x2, y2] = boundaryPoint(b, a);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={onCycle ? "#FF4D4D" : "#0B0B0B"}
            strokeWidth={onCycle ? 3.5 : 2}
            strokeDasharray={e.kind === "request" ? "7 5" : undefined}
            markerEnd={onCycle ? "url(#arrow-red)" : "url(#arrow-ink)"}
          />
        );
      })}

      {/* nodes */}
      {nodes.map((n) => {
        const deadlocked = result.deadlockedProcesses.includes(n.id);
        if (n.kind === "process") {
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={P_R}
                fill={deadlocked ? "#FF4D4D" : "#BEF264"}
                stroke="#0B0B0B"
                strokeWidth="3"
              />
              <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="'Space Grotesk',sans-serif" fill="#0B0B0B">
                {n.id}
              </text>
            </g>
          );
        }
        return (
          <g key={n.id}>
            <rect
              x={n.x - RES / 2}
              y={n.y - RES / 2}
              width={RES}
              height={RES}
              fill="#FFFFFF"
              stroke="#0B0B0B"
              strokeWidth="3"
            />
            {/* instance dots */}
            {Array.from({ length: n.instances ?? 1 }).map((_, k, arr) => (
              <circle
                key={k}
                cx={n.x - ((arr.length - 1) * 6) / 2 + k * 6}
                cy={n.y - 12}
                r="2.6"
                fill="#0B0B0B"
              />
            ))}
            <text x={n.x} y={n.y + 8} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="'JetBrains Mono',monospace" fill="#0B0B0B">
              {n.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Place nodes on a circle, cycle nodes first so a circular wait looks circular. */
function layout(state: RagState, result: DeadlockResult): Node[] {
  const resourceInst = new Map(state.resources.map((r) => [r.id, r.instances]));
  const cycleOrder = result.cycle.slice(0, -1); // drop repeated closing node
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of cycleOrder) {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const p of state.processes) if (!seen.has(p)) { seen.add(p); order.push(p); }
  for (const r of state.resources) if (!seen.has(r.id)) { seen.add(r.id); order.push(r.id); }

  const n = order.length || 1;
  return order.map((id, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const isProc = state.processes.includes(id);
    return {
      id,
      kind: isProc ? "process" : "resource",
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
      instances: isProc ? undefined : resourceInst.get(id) ?? 1,
    };
  });
}

/** Point on node `a`'s boundary along the direction toward node `b`. */
function boundaryPoint(a: Node, b: Node): [number, number] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const pad = a.kind === "process" ? P_R + 4 : RES / 2 + 4;
  return [a.x + ux * pad, a.y + uy * pad];
}
