import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  CheckCircle2,
  Plus,
  Trash2,
  Link2,
  HandMetal,
  Lightbulb,
  ListOrdered,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { RagGraph } from "@/components/rag/RagGraph";
import { cn } from "@/lib/utils";
import { detectDeadlock, DEADLOCK_PRESETS, type RagState } from "@/lib/rag";

export default function DeadlockDetection() {
  const [state, setState] = useState<RagState>(DEADLOCK_PRESETS[0].state);
  const result = useMemo(() => detectDeadlock(state), [state]);

  // edge-builder local selections
  const [allocRes, setAllocRes] = useState("");
  const [allocProc, setAllocProc] = useState("");
  const [reqProc, setReqProc] = useState("");
  const [reqRes, setReqRes] = useState("");

  const addProcess = () => {
    const id = `P${state.processes.length + 1}`;
    setState({ ...state, processes: [...state.processes, id] });
  };
  const addResource = () => {
    const id = `R${state.resources.length + 1}`;
    setState({ ...state, resources: [...state.resources, { id, instances: 1 }] });
  };
  const removeProcess = (p: string) =>
    setState({
      ...state,
      processes: state.processes.filter((x) => x !== p),
      allocations: state.allocations.filter((a) => a.process !== p),
      requests: state.requests.filter((r) => r.process !== p),
    });
  const removeResource = (rid: string) =>
    setState({
      ...state,
      resources: state.resources.filter((x) => x.id !== rid),
      allocations: state.allocations.filter((a) => a.resource !== rid),
      requests: state.requests.filter((r) => r.resource !== rid),
    });
  const setInstances = (rid: string, n: number) =>
    setState({
      ...state,
      resources: state.resources.map((r) => (r.id === rid ? { ...r, instances: Math.max(1, n) } : r)),
    });

  const addAllocation = () => {
    if (!allocRes || !allocProc) return;
    if (state.allocations.some((a) => a.resource === allocRes && a.process === allocProc)) return;
    setState({ ...state, allocations: [...state.allocations, { resource: allocRes, process: allocProc }] });
  };
  const addRequest = () => {
    if (!reqProc || !reqRes) return;
    if (state.requests.some((r) => r.process === reqProc && r.resource === reqRes)) return;
    setState({ ...state, requests: [...state.requests, { process: reqProc, resource: reqRes }] });
  };
  const removeAllocation = (i: number) =>
    setState({ ...state, allocations: state.allocations.filter((_, k) => k !== i) });
  const removeRequest = (i: number) =>
    setState({ ...state, requests: state.requests.filter((_, k) => k !== i) });

  return (
    <div className="space-y-5">
      {/* presets */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Scenario</span>
          {DEADLOCK_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setState(p.state)}
              title={p.description}
              className="border-2 border-ink bg-panel px-3 py-1.5 text-sm font-bold transition-colors hover:bg-lime/30"
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* verdict */}
      <motion.div
        key={result.deadlocked ? "dead" : "safe"}
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "card flex items-center gap-4 p-5",
          result.deadlocked ? "bg-danger text-paper" : "bg-lime text-ink"
        )}
      >
        {result.deadlocked ? <AlertOctagon size={34} strokeWidth={2.4} /> : <CheckCircle2 size={34} strokeWidth={2.4} />}
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
            {result.deadlocked ? "Deadlock Detected" : "No Deadlock"}
          </h2>
          <p className="text-sm opacity-80">
            {result.deadlocked
              ? `Circular wait among ${result.deadlockedProcesses.join(", ")}.`
              : result.safeSequence.length
                ? `Safe sequence: ${result.safeSequence.join(" → ")}.`
                : "No outstanding requests."}
          </p>
        </div>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* graph */}
        <Card>
          <CardHeader
            title="Resource-Allocation Graph"
            icon={<Link2 size={14} />}
            right={
              <div className="flex gap-3 font-mono text-[10px] uppercase text-muted">
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-lime" />proc</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 border-2 border-ink bg-panel" />res</span>
              </div>
            }
          />
          <div className="p-3">
            <RagGraph state={state} result={result} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase text-muted">
              <span>──▶ allocation (held by)</span>
              <span>- -▶ request (waiting)</span>
              <span className="text-danger">━▶ cycle edge</span>
            </div>
          </div>
        </Card>

        {/* builder */}
        <Card>
          <CardHeader title="Scenario Builder" icon={<HandMetal size={14} />} />
          <div className="space-y-4 p-4">
            {/* entities */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Processes</span>
                  <button onClick={addProcess} className="pill bg-lime hover:bg-lime-bright"><Plus size={11} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {state.processes.map((p) => (
                    <span key={p} className="flex items-center gap-1 border-2 border-ink bg-lime/40 px-2 py-1 text-xs font-bold">
                      {p}
                      <button onClick={() => removeProcess(p)}><Trash2 size={11} className="hover:text-danger" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Resources</span>
                  <button onClick={addResource} className="pill bg-lime hover:bg-lime-bright"><Plus size={11} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {state.resources.map((r) => (
                    <span key={r.id} className="flex items-center gap-1 border-2 border-ink bg-panel px-2 py-1 text-xs font-bold">
                      {r.id}
                      <input
                        type="number"
                        min={1}
                        value={r.instances}
                        onChange={(e) => setInstances(r.id, parseInt(e.target.value || "1", 10))}
                        className="w-9 border border-ink bg-paper px-1 text-center font-mono text-[11px] outline-none"
                        title="instances"
                      />
                      <button onClick={() => removeResource(r.id)}><Trash2 size={11} className="hover:text-danger" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* allocation builder */}
            <EdgeBuilder
              label="Allocation — resource held by process"
              left={{ value: allocRes, set: setAllocRes, options: state.resources.map((r) => r.id), placeholder: "Resource" }}
              right={{ value: allocProc, set: setAllocProc, options: state.processes, placeholder: "Process" }}
              connector="held by"
              onAdd={addAllocation}
              edges={state.allocations.map((a) => `${a.resource} → ${a.process}`)}
              onRemove={removeAllocation}
            />

            {/* request builder */}
            <EdgeBuilder
              label="Request — process waiting on resource"
              left={{ value: reqProc, set: setReqProc, options: state.processes, placeholder: "Process" }}
              right={{ value: reqRes, set: setReqRes, options: state.resources.map((r) => r.id), placeholder: "Resource" }}
              connector="requests"
              onAdd={addRequest}
              edges={state.requests.map((r) => `${r.process} ⇢ ${r.resource}`)}
              onRemove={removeRequest}
            />
          </div>
        </Card>
      </div>

      {/* explanation + resolution */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Step-by-Step Explanation" icon={<ListOrdered size={14} />} />
          <ol className="space-y-2 p-4">
            {result.steps.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-3 text-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-paper font-mono text-[11px] font-bold">
                  {i + 1}
                </span>
                <span className={cn(s.includes("deadlock") || s.includes("Circular") ? "font-semibold" : "text-ink-soft")}>
                  {s}
                </span>
              </motion.li>
            ))}
          </ol>
        </Card>

        <Card className={cn(!result.deadlocked && "opacity-60")}>
          <CardHeader title="Resolution Suggestions" icon={<Lightbulb size={14} />} accent="bg-warn" />
          <div className="p-4">
            {result.deadlocked ? (
              <ul className="space-y-2">
                {result.resolutions.map((r, i) => (
                  <li key={i} className="flex gap-2 border-2 border-ink bg-paper px-3 py-2 text-sm">
                    <Lightbulb size={15} className="mt-0.5 shrink-0 text-warn" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center font-mono text-sm text-muted">
                System is safe — no resolution needed.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

interface SelectSpec {
  value: string;
  set: (v: string) => void;
  options: string[];
  placeholder: string;
}

function EdgeBuilder({
  label,
  left,
  right,
  connector,
  onAdd,
  edges,
  onRemove,
}: {
  label: string;
  left: SelectSpec;
  right: SelectSpec;
  connector: string;
  onAdd: () => void;
  edges: string[];
  onRemove: (i: number) => void;
}) {
  return (
    <div className="border-2 border-ink bg-paper p-3">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select spec={left} />
        <span className="font-mono text-[11px] uppercase text-muted">{connector}</span>
        <Select spec={right} />
        <button onClick={onAdd} className="btn-lime !px-3 !py-2 text-xs">
          <Plus size={14} /> Add
        </button>
      </div>
      {edges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {edges.map((e, i) => (
            <span key={i} className="flex items-center gap-1.5 border-2 border-ink bg-panel px-2 py-1 font-mono text-xs">
              {e}
              <button onClick={() => onRemove(i)}><Trash2 size={11} className="hover:text-danger" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Select({ spec }: { spec: SelectSpec }) {
  return (
    <select
      value={spec.value}
      onChange={(e) => spec.set(e.target.value)}
      className="border-2 border-ink bg-panel px-2 py-1.5 font-mono text-sm outline-none"
    >
      <option value="">{spec.placeholder}</option>
      {spec.options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
