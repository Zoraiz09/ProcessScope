import { useEffect, useRef, useState } from "react";
import type { MetricsSnapshot } from "@/lib/types";

type Status = "connecting" | "live" | "reconnecting" | "offline";

const WS_URL =
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
  window.location.host +
  "/ws/metrics";

// ~10 minutes of 1Hz samples — enough to make Analytics & Replay meaningful
// while staying cheap to re-render. Dashboard sparklines just read the tail.
const HISTORY_LEN = 600;

export interface MetricsState {
  snapshot: MetricsSnapshot | null;
  history: MetricsSnapshot[];
  status: Status;
}

/**
 * Subscribes to the live metrics WebSocket and keeps a rolling history buffer.
 * Auto-reconnects with backoff if the backend drops.
 */
export function useMetrics(): MetricsState {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const historyRef = useRef<MetricsSnapshot[]>([]);
  const [history, setHistory] = useState<MetricsSnapshot[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;

    const connect = () => {
      if (!aliveRef.current) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setStatus("live");
      };

      ws.onmessage = (ev) => {
        try {
          const data: MetricsSnapshot = JSON.parse(ev.data);
          setSnapshot(data);
          const next = [...historyRef.current, data].slice(-HISTORY_LEN);
          historyRef.current = next;
          setHistory(next);
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        if (!aliveRef.current) return;
        setStatus(retryRef.current === 0 ? "reconnecting" : "offline");
        const delay = Math.min(1000 * 2 ** retryRef.current, 8000);
        retryRef.current += 1;
        setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      aliveRef.current = false;
      wsRef.current?.close();
    };
  }, []);

  return { snapshot, history, status };
}
