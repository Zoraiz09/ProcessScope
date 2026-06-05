import { NavLink } from "react-router-dom";
import { NAV, NAV_GROUPS } from "@/lib/nav";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const statusBadge: Record<string, string> = {
  live: "bg-lime",
  sim: "bg-info text-paper",
  soon: "bg-paper",
};

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r-3 border-ink bg-panel lg:flex">
      <div className="border-b-3 border-ink px-5 py-4">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group} className="mb-5">
            <p className="mb-2 px-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              {group}
            </p>
            <ul className="space-y-1">
              {NAV.filter((n) => n.group === group).map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/app"}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 border-2 px-2.5 py-2 text-sm font-semibold transition-all",
                        isActive
                          ? "border-ink bg-ink text-paper shadow-brutal-sm"
                          : "border-transparent text-ink-soft hover:border-ink hover:bg-paper"
                      )
                    }
                  >
                    <item.icon size={17} className="shrink-0" strokeWidth={2.2} />
                    <span className="flex-1 truncate">{item.short}</span>
                    {item.status && (
                      <span
                        className={cn(
                          "h-2 w-2 border border-ink",
                          statusBadge[item.status]
                        )}
                        title={item.status}
                      />
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t-3 border-ink px-4 py-3">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
          <span>v1.0.0</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse-bar rounded-full bg-lime-deep border border-ink" />
            kernel
          </span>
        </div>
      </div>
    </aside>
  );
}
