import { useMemo, useState } from "react";
import { Network, Boxes, Cpu, CircleCheck, CircleAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { RagGraph } from "@/components/rag/RagGraph";
import { cn } from "@/lib/utils";
import { detectDeadlock, RESOURCE_PRESETS, type RagState } from "@/lib/rag";

export default function ResourceAllocation() {
  const [state, setState] = useState<RagState>(RESOURCE_PRESETS[0].state);
  const result = useMemo(() => detectDeadlock(state), [state]);
  const preset = RESOURCE_PRESETS.find((p) => sameState(p.state, state));

  return (
    <div className="space-y-5">
      {/* presets */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Scenario</span>
          {RESOURCE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setState(p.state)}
              title={p.description}
              className={cn(
                "border-2 border-ink px-3 py-1.5 text-sm font-bold transition-colors",
                preset?.key === p.key ? "bg-ink text-paper" : "bg-panel hover:bg-lime/30"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset && <p className="mt-2 text-sm text-ink-soft">{preset.description}</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* graph */}
        <Card>
          <CardHeader
            title="Ownership Graph"
            icon={<Network size={14} />}
            right={
              <Pill variant={result.deadlocked ? "danger" : "ok"}>
                {result.deadlocked ? <CircleAlert size={12} /> : <CircleCheck size={12} />}
                {result.deadlocked ? "unsafe" : "safe"}
              </Pill>
            }
          />
          <div className="p-3">
            <RagGraph state={state} result={result} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase text-muted">
              <span>──▶ allocation (held by)</span>
              <span>- -▶ request (waiting)</span>
            </div>
          </div>
        </Card>

        {/* allocation matrix */}
        <Card>
          <CardHeader title="Allocation Table" icon={<Boxes size={14} />} />
          <div className="space-y-4 p-4">
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">Held resources</p>
              <ul className="space-y-1.5">
                {state.resources.map((r) => {
                  const holders = state.allocations.filter((a) => a.resource === r.id).map((a) => a.process);
                  const waiters = state.requests.filter((q) => q.resource === r.id).map((q) => q.process);
                  return (
                    <li key={r.id} className="border-2 border-ink bg-paper px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-bold">
                          <Cpu size={14} /> {r.id}
                          <span className="border border-ink bg-panel px-1.5 font-mono text-[10px]">
                            {holders.length}/{r.instances}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-muted">
                          {holders.length ? `held by ${holders.join(", ")}` : "free"}
                        </span>
                      </div>
                      {waiters.length > 0 && (
                        <p className="mt-1 font-mono text-[11px] text-warn">
                          waiting: {waiters.join(", ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">Process holdings</p>
              <ul className="space-y-1.5">
                {state.processes.map((p) => {
                  const holds = state.allocations.filter((a) => a.process === p).map((a) => a.resource);
                  const wants = state.requests.filter((q) => q.process === p).map((q) => q.resource);
                  const stuck = result.deadlockedProcesses.includes(p);
                  return (
                    <li key={p} className={cn("flex items-center justify-between border-2 border-ink px-3 py-2", stuck ? "bg-danger/15" : "bg-lime/20")}>
                      <span className="font-bold">{p}</span>
                      <span className="font-mono text-xs text-ink-soft">
                        holds [{holds.join(", ") || "—"}]
                        {wants.length > 0 && <span className="text-warn"> · wants [{wants.join(", ")}]</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {result.safeSequence.length > 0 && !result.deadlocked && (
              <div className="border-2 border-ink bg-ink p-3 text-paper">
                <p className="font-mono text-[10px] uppercase tracking-wider text-paper/60">Safe sequence</p>
                <p className="font-display text-lg font-bold">{result.safeSequence.join(" → ")}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function sameState(a: RagState, b: RagState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
