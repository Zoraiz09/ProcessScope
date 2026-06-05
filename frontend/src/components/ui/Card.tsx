import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "card",
        hover &&
          "transition-transform duration-100 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  icon?: ReactNode;
  accent?: string;
  right?: ReactNode;
}

export function CardHeader({ title, icon, accent = "bg-lime", right }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b-3 border-ink px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center border-2 border-ink",
              accent
            )}
          >
            {icon}
          </span>
        )}
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {right}
    </div>
  );
}
