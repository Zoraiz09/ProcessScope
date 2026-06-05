import { motion } from "framer-motion";
import { Check, Hammer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { LucideIcon } from "lucide-react";

export interface ModuleSpec {
  icon: LucideIcon;
  title: string;
  purpose: string;
  status: "live" | "sim" | "soon";
  capabilities: string[];
}

const STATUS_LABEL: Record<ModuleSpec["status"], { text: string; variant: "lime" | "warn" | "ghost" }> = {
  live: { text: "Backend Ready", variant: "lime" },
  sim: { text: "Simulation Build", variant: "warn" },
  soon: { text: "On Roadmap", variant: "ghost" },
};

/**
 * Rich placeholder for modules whose UI lands in a later build session.
 * Surfaces the spec'd purpose + capabilities so the product reads as complete.
 */
export function ModuleScaffold({ spec }: { spec: ModuleSpec }) {
  const Icon = spec.icon;
  const status = STATUS_LABEL[spec.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-3xl"
    >
      <Card className="overflow-hidden">
        <div className="grid-noise flex items-center gap-4 border-b-3 border-ink bg-ink p-6 text-paper">
          <span className="flex h-14 w-14 items-center justify-center border-3 border-paper bg-lime text-ink shadow-brutal-sm">
            <Icon size={26} strokeWidth={2.2} />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold">{spec.title}</h2>
            <p className="text-sm text-paper/70">{spec.purpose}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <Pill variant={status.variant}>{status.text}</Pill>
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
              <Hammer size={13} /> UI ships in an upcoming build pass
            </span>
          </div>

          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
            Spec'd capabilities
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {spec.capabilities.map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 border-2 border-ink bg-paper px-3 py-2 text-sm"
              >
                <Check size={16} className="mt-0.5 shrink-0 text-lime-dark" strokeWidth={3} />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </motion.div>
  );
}
