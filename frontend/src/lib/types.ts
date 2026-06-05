// Shared domain types — mirror the FastAPI backend payloads.

export interface CpuMetrics {
  percent: number;
  cores_physical: number;
  cores_logical: number;
  per_core: number[];
  freq_mhz: number | null;
  temperature_c: number | null;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  available: number;
  percent: number;
  swap_total: number;
  swap_used: number;
  swap_percent: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  percent: number;
  read_bytes: number;
  write_bytes: number;
  read_speed: number;
  write_speed: number;
}

export interface NetworkMetrics {
  upload_speed: number;
  download_speed: number;
  bytes_sent: number;
  bytes_recv: number;
  connections: number;
}

export interface SystemSummary {
  process_count: number;
  thread_count: number;
  boot_time: number;
  uptime: number;
  os: string;
  hostname: string;
}

export interface MetricsSnapshot {
  timestamp: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  system: SystemSummary;
}

// Lean row returned by /api/processes (table view).
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  memory_bytes: number;
  threads: number;
  status: string;
}

// Full payload from /api/processes/{pid} (detail drawer).
export interface ProcessDetail extends ProcessInfo {
  ppid: number;
  parent_name: string | null;
  exe: string | null;
  username: string | null;
  create_time: number;
  num_children: number;
  children: { pid: number; name: string }[];
  thread_list: { id: number; user_time: number; system_time: number }[];
}

export interface ThreadInfo {
  id: number;
  cpu: number;
  user_time: number;
  system_time: number;
  total_time: number;
  state: "running" | "waiting";
}

export interface ThreadSnapshot {
  pid: number;
  name: string;
  count: number;
  active: number;
  threads: ThreadInfo[];
}

export type ProcessState =
  | "new"
  | "ready"
  | "running"
  | "waiting"
  | "terminated";
