import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleScaffold } from "@/pages/ModuleScaffold";
import { MODULE_SPECS } from "@/lib/moduleSpecs";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import ProcessExplorer from "@/pages/ProcessExplorer";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="processes" element={<ProcessExplorer />} />
        <Route path="tree" element={<ModuleScaffold spec={MODULE_SPECS.tree} />} />
        <Route path="threads" element={<ModuleScaffold spec={MODULE_SPECS.threads} />} />
        <Route path="scheduler" element={<ModuleScaffold spec={MODULE_SPECS.scheduler} />} />
        <Route path="states" element={<ModuleScaffold spec={MODULE_SPECS.states} />} />
        <Route path="resources" element={<ModuleScaffold spec={MODULE_SPECS.resources} />} />
        <Route path="deadlock" element={<ModuleScaffold spec={MODULE_SPECS.deadlock} />} />
        <Route path="analytics" element={<ModuleScaffold spec={MODULE_SPECS.analytics} />} />
        <Route path="replay" element={<ModuleScaffold spec={MODULE_SPECS.replay} />} />
        <Route path="alerts" element={<ModuleScaffold spec={MODULE_SPECS.alerts} />} />
        <Route path="ai" element={<ModuleScaffold spec={MODULE_SPECS.ai} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
