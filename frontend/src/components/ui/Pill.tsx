import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "lime" | "ink" | "ghost" | "danger" | "warn" | "ok";

const variants: Record<Variant, string> = {
  lime: "bg-lime text-ink",
  ink: "bg-ink text-paper",
  ghost: "bg-panel text-ink",
  danger: "bg-danger text-paper",
  warn: "bg-warn text-ink",
  ok: "bg-ok text-paper",
};

export function Pill({
  children,
  variant = "lime",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return <span className={cn("pill", variants[variant], className)}>{children}</span>;
}
