import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

/**
 * Blocky segmented progress bar — the ████████░░░░ motif from the spec.
 */
export function SegmentBar({
  value,
  segments = 16,
  className,
  tone = "lime",
}: {
  value: number;
  segments?: number;
  className?: string;
  tone?: "lime" | "danger" | "warn" | "ink";
}) {
  const pct = clamp(value);
  const filled = Math.round((pct / 100) * segments);
  const fillTone =
    tone === "lime"
      ? pct > 85
        ? "bg-danger"
        : pct > 65
          ? "bg-warn"
          : "bg-lime-deep"
      : tone === "danger"
        ? "bg-danger"
        : tone === "warn"
          ? "bg-warn"
          : "bg-ink";

  return (
    <div className={cn("flex gap-[3px]", className)}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-5 flex-1 border-2 border-ink",
            i < filled ? fillTone : "bg-paper"
          )}
        />
      ))}
    </div>
  );
}
