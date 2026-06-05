/**
 * Backend endpoint helpers.
 *
 * In development VITE_API_BASE is empty, so paths stay relative ("/api/…",
 * "/ws/metrics") and ride the Vite dev proxy. In production (frontend on
 * Vercel, backend on Render/Railway/Fly) set VITE_API_BASE to the deployed
 * backend origin and every request is rewritten to hit it directly.
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

/** Absolute URL for a REST endpoint path (e.g. apiUrl("/api/processes")). */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Absolute ws:// or wss:// URL for a WebSocket path (e.g. wsUrl("/ws/metrics")). */
export function wsUrl(path: string): string {
  if (API_BASE) {
    return `${API_BASE.replace(/^http/, "ws")}${path}`; // http→ws, https→wss
  }
  const proto = window.location.protocol === "https:" ? "wss://" : "ws://";
  return `${proto}${window.location.host}${path}`;
}
