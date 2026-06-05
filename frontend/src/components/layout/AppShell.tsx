import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
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
  const mainRef = useRef<HTMLDivElement>(null);
  const active = NAV.find((n) =>
    n.path === "/app" ? pathname === "/app" : pathname.startsWith(n.path)
  );

  // Reset scroll to the top whenever the route changes.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <MetricsProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            title={active?.label ?? "Dashboard"}
            subtitle={SUBTITLES[pathname] ?? active?.label}
          />
          <main ref={mainRef} className="flex-1 overflow-y-auto px-5 py-6 pb-24 md:px-8 lg:pb-6">
            {/* Suspense catches lazy page chunks; keying the inner div on
                pathname remounts it so each navigation plays an entrance
                transition (entrance-only avoids the stale-Outlet problem). */}
            <Suspense fallback={<PageLoader />}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </Suspense>
          </main>
          <MobileNav />
        </div>
      </div>
    </MetricsProvider>
  );
}

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 size={24} className="animate-spin text-lime-dark" />
    </div>
  );
}
