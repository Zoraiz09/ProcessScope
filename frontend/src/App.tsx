import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

// Route-level code-splitting — each page ships as its own chunk, so the
// heavy deps (reactflow, recharts, react-markdown) load only when visited.
const Landing = lazy(() => import("@/pages/Landing"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ProcessExplorer = lazy(() => import("@/pages/ProcessExplorer"));
const ThreadExplorer = lazy(() => import("@/pages/ThreadExplorer"));
const SchedulerSimulator = lazy(() => import("@/pages/SchedulerSimulator"));
const DependencyTree = lazy(() => import("@/pages/DependencyTree"));
const DeadlockDetection = lazy(() => import("@/pages/DeadlockDetection"));
const ResourceAllocation = lazy(() => import("@/pages/ResourceAllocation"));
const StateVisualizer = lazy(() => import("@/pages/StateVisualizer"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Replay = lazy(() => import("@/pages/Replay"));
const Alerts = lazy(() => import("@/pages/Alerts"));
const AIAnalyst = lazy(() => import("@/pages/AIAnalyst"));

function FullLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <Loader2 size={28} className="animate-spin text-lime-dark" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<FullLoader />}>
            <Landing />
          </Suspense>
        }
      />

      {/* AppShell provides the Suspense boundary for its lazy children. */}
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="processes" element={<ProcessExplorer />} />
        <Route path="tree" element={<DependencyTree />} />
        <Route path="threads" element={<ThreadExplorer />} />
        <Route path="scheduler" element={<SchedulerSimulator />} />
        <Route path="states" element={<StateVisualizer />} />
        <Route path="resources" element={<ResourceAllocation />} />
        <Route path="deadlock" element={<DeadlockDetection />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="replay" element={<Replay />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="ai" element={<AIAnalyst />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
