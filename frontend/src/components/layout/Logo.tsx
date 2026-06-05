import { cn } from "@/lib/utils";

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
        <rect width="32" height="32" rx="5" fill="#0B0B0B" />
        <path
          d="M16 6 L24 11 V21 L16 26 L8 21 V11 Z"
          fill="#BEF264"
          stroke="#0B0B0B"
          strokeWidth="1.5"
        />
        <circle cx="16" cy="16" r="3" fill="#0B0B0B" />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">
        ProcessScope
      </span>
    </span>
  );
}
