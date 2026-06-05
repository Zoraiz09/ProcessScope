import { createContext, useContext, type ReactNode } from "react";
import { useMetrics, type MetricsState } from "./useMetrics";

const MetricsContext = createContext<MetricsState | null>(null);

export function MetricsProvider({ children }: { children: ReactNode }) {
  const state = useMetrics();
  return <MetricsContext.Provider value={state}>{children}</MetricsContext.Provider>;
}

export function useMetricsContext(): MetricsState {
  const ctx = useContext(MetricsContext);
  if (!ctx) throw new Error("useMetricsContext must be used within MetricsProvider");
  return ctx;
}
