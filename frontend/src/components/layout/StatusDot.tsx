import { cn } from "@/lib/utils";

type Status = "connecting" | "live" | "reconnecting" | "offline";

const config: Record<Status, { label: string; dot: string; text: string }> = {
  live: { label: "LIVE", dot: "bg-ok", text: "text-ink" },
  connecting: { label: "CONNECTING", dot: "bg-warn", text: "text-ink" },
  reconnecting: { label: "RECONNECTING", dot: "bg-warn", text: "text-ink" },
  offline: { label: "OFFLINE", dot: "bg-danger", text: "text-ink" },
};

export function StatusDot({ status }: { status: Status }) {
  const c = config[status];
  return (
    <span className="pill bg-panel gap-2">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full border border-ink",
          c.dot,
          status === "live" && "animate-pulse-bar"
        )}
      />
      <span className={c.text}>{c.label}</span>
    </span>
  );
}
