import { Outlet, useLocation } from "react-router-dom";
import { MetricsProvider } from "@/hooks/MetricsContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { NAV } from "@/lib/nav";

const SUBTITLES: Record<string, string> = {
  "/app": "Real-time overview of operating system activity",
  "/app/processes": "All running processes — search, sort, inspect",
  "/app/tree": "Parent / child process hierarchy",
  "/app/threads": "Thread-level activity analysis",
  "/app/scheduler": "Visualize CPU scheduling algorithms",
  "/app/states": "Process lifecycle state machine",
  "/app/resources": "Resource ownership graph",
  "/app/deadlock": "Detect & resolve deadlock scenarios",
  "/app/analytics": "Historical system telemetry",
  "/app/replay": "CCTV for operating-system activity",
  "/app/alerts": "Anomaly detection & alerting rules",
  "/app/ai": "Plain-English performance analysis",
};

export function AppShell() {
  const { pathname } = useLocation();
  const active = NAV.find((n) =>
    n.path === "/app" ? pathname === "/app" : pathname.startsWith(n.path)
  );

  return (
    <MetricsProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            title={active?.label ?? "Dashboard"}
            subtitle={SUBTITLES[pathname] ?? active?.label}
          />
          <main className="flex-1 overflow-y-auto px-5 py-6 pb-24 md:px-8 lg:pb-6">
            <Outlet />
          </main>
          <MobileNav />
        </div>
      </div>
    </MetricsProvider>
  );
}
