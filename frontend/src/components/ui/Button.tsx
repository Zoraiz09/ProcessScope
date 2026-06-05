import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "lime" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const map: Record<Variant, string> = {
  primary: "btn-primary",
  lime: "btn-lime",
  ghost: "btn-ghost",
};

export function Button({ variant = "primary", className, children, ...rest }: ButtonProps) {
  return (
    <button className={cn(map[variant], className)} {...rest}>
      {children}
    </button>
  );
}
