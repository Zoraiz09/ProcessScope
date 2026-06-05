import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Compact bottom nav for small screens — shows the primary modules.
const PRIMARY = NAV.filter((n) =>
  ["/app", "/app/processes", "/app/scheduler", "/app/deadlock", "/app/analytics"].includes(n.path)
);

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t-3 border-ink bg-panel lg:hidden">
      {PRIMARY.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/app"}
          className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="mobilenav-active"
                  className="absolute inset-0 z-0 bg-ink"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <item.icon
                size={18}
                strokeWidth={2.2}
                className={cn("relative z-10 transition-colors", isActive ? "text-paper" : "text-ink-soft")}
              />
              <span className={cn("relative z-10 transition-colors", isActive ? "text-paper" : "text-ink-soft")}>
                {item.short}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
