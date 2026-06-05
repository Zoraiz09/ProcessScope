import {
  LayoutDashboard,
  ListTree,
  Network,
  Cpu,
  Activity,
  CircuitBoard,
  GitFork,
  AlertOctagon,
  LineChart,
  History,
  BellRing,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  short: string;
  path: string;
  icon: LucideIcon;
  group: "Monitor" | "Visualize" | "Simulate" | "Analyze";
  status?: "live" | "sim" | "soon";
}

export const NAV: NavItem[] = [
  { label: "Dashboard", short: "Dashboard", path: "/app", icon: LayoutDashboard, group: "Monitor", status: "live" },
  { label: "Process Explorer", short: "Processes", path: "/app/processes", icon: ListTree, group: "Monitor", status: "live" },
  { label: "Dependency Tree", short: "Tree", path: "/app/tree", icon: GitFork, group: "Visualize", status: "live" },
  { label: "Thread Explorer", short: "Threads", path: "/app/threads", icon: Activity, group: "Monitor", status: "live" },
  { label: "Scheduler Simulator", short: "Scheduler", path: "/app/scheduler", icon: Cpu, group: "Simulate", status: "sim" },
  { label: "Process States", short: "States", path: "/app/states", icon: CircuitBoard, group: "Visualize", status: "sim" },
  { label: "Resource Allocation", short: "Resources", path: "/app/resources", icon: Network, group: "Visualize", status: "sim" },
  { label: "Deadlock Detection", short: "Deadlock", path: "/app/deadlock", icon: AlertOctagon, group: "Simulate", status: "sim" },
  { label: "Historical Analytics", short: "Analytics", path: "/app/analytics", icon: LineChart, group: "Analyze", status: "live" },
  { label: "System Replay", short: "Replay", path: "/app/replay", icon: History, group: "Analyze", status: "sim" },
  { label: "Alerts & Anomalies", short: "Alerts", path: "/app/alerts", icon: BellRing, group: "Analyze", status: "live" },
  { label: "AI Analyst", short: "AI Analyst", path: "/app/ai", icon: Sparkles, group: "Analyze", status: "live" },
];

export const NAV_GROUPS = ["Monitor", "Visualize", "Simulate", "Analyze"] as const;
