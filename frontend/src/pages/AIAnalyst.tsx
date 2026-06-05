import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Send,
  Stethoscope,
  Search,
  Gauge,
  User,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Cpu,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * AI Performance Analyst — chats with the backend /api/ai/* endpoints,
 * which proxy to Cerebras (gpt-oss-120b). The API key never reaches the
 * browser; the server attaches live telemetry as context per request.
 * ------------------------------------------------------------------ */

type Mode = "summary" | "rootcause" | "optimize" | "chat";

interface Msg {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  model?: string;
  tokens?: number;
  error?: boolean;
  streaming?: boolean;
}

interface QuickAction {
  mode: Mode;
  label: string;
  icon: typeof Stethoscope;
  blurb: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { mode: "summary", label: "Health Summary", icon: Stethoscope, blurb: "Overall status & headline numbers" },
  { mode: "rootcause", label: "Root-Cause Analysis", icon: Search, blurb: "Why is something running hot?" },
  { mode: "optimize", label: "Optimization Tips", icon: Gauge, blurb: "Concrete ways to speed things up" },
];

const ACTION_LABEL: Record<Mode, string> = {
  summary: "Analyze current system health",
  rootcause: "Diagnose likely root causes",
  optimize: "Recommend optimizations",
  chat: "",
};

export default function AIAnalyst() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(!!d.configured);
        setModel(d.model ?? "");
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Patch the trailing (assistant) message in place as tokens arrive.
  const patchLast = (patch: Partial<Msg>) =>
    setMessages((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
      return copy;
    });

  const send = async (mode: Mode, question: string) => {
    if (loading) return;
    const userText = mode === "chat" ? question.trim() : ACTION_LABEL[mode];
    if (mode === "chat" && !userText) return;

    setMessages((m) => [
      ...m,
      { role: "user", content: userText },
      { role: "assistant", content: "", reasoning: "", streaming: true },
    ]);
    setInput("");
    setLoading(true);

    let content = "";
    let reasoning = "";
    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, question: mode === "chat" ? question : "" }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, sep).trim();
          buf = buf.slice(sep + 2);
          if (!raw.startsWith("data:")) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(raw.slice(5).trim());
          } catch {
            continue;
          }
          if (typeof evt.error === "string") {
            streamError = true;
            patchLast({ error: true, content: evt.error, streaming: false });
          }
          if (typeof evt.content === "string") {
            content += evt.content;
            patchLast({ content });
          }
          if (typeof evt.reasoning === "string") {
            reasoning += evt.reasoning;
            patchLast({ reasoning });
          }
          if (evt.usage && typeof evt.usage === "object") {
            patchLast({ tokens: (evt.usage as { total_tokens?: number }).total_tokens });
          }
          if (typeof evt.model === "string") patchLast({ model: evt.model });
        }
      }

      if (!streamError) {
        patchLast({ streaming: false, content: content || "_(empty response)_" });
      }
    } catch (e: unknown) {
      patchLast({
        error: true,
        streaming: false,
        content: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (configured === false) {
    return <NotConfigured />;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader
          title="AI Performance Analyst"
          icon={<Sparkles size={14} />}
          right={
            model && (
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                <Cpu size={12} /> {model} · Cerebras
              </span>
            )
          }
        />

        {/* transcript */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <EmptyState onPick={send} />
          ) : (
            messages.map((m, i) => <Bubble key={i} msg={m} />)
          )}
        </div>

        {/* quick actions */}
        <div className="flex flex-wrap gap-2 border-t-3 border-ink bg-paper px-4 py-2.5">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.mode}
              onClick={() => send(a.mode, "")}
              disabled={loading}
              title={a.blurb}
              className="flex items-center gap-1.5 border-2 border-ink bg-panel px-2.5 py-1.5 text-xs font-bold transition-colors hover:bg-lime/40 disabled:opacity-50"
            >
              <a.icon size={13} /> {a.label}
            </button>
          ))}
        </div>

        {/* composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send("chat", input);
          }}
          className="flex items-center gap-2 border-t-3 border-ink p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask about your system — e.g. “What's using the most memory?”"
            className="min-w-0 flex-1 border-2 border-ink bg-panel px-3 py-2.5 text-sm outline-none focus:bg-lime/10 disabled:opacity-50"
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-4 !py-2.5 text-sm">
            <Send size={15} /> Send
          </button>
        </form>
      </Card>
    </div>
  );
}

/* ---------------- message bubble ---------------- */

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink",
          isUser ? "bg-ink text-paper" : msg.error ? "bg-danger text-paper" : "bg-lime text-ink"
        )}
      >
        {isUser ? <User size={15} /> : msg.error ? <AlertTriangle size={15} /> : <Sparkles size={15} />}
      </span>

      <div className={cn("min-w-0 max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block border-2 border-ink px-3.5 py-2.5 text-left shadow-brutal-sm",
            isUser ? "bg-ink text-paper" : msg.error ? "bg-danger/10" : "bg-panel"
          )}
        >
          {isUser ? (
            <p className="text-sm">{msg.content}</p>
          ) : msg.error ? (
            <p className="text-sm font-medium text-danger">⚠ {msg.content}</p>
          ) : msg.streaming && !msg.content ? (
            <ThinkingIndicator reasoning={msg.reasoning} />
          ) : (
            <div>
              <Markdown text={msg.content} />
              {msg.streaming && <Caret />}
            </div>
          )}
        </div>

        {!isUser && !msg.error && !(msg.streaming && !msg.content) && (msg.reasoning || msg.tokens) && (
          <div className="mt-1 flex items-center gap-3">
            {msg.tokens != null && (
              <span className="font-mono text-[10px] text-muted">{msg.tokens} tokens</span>
            )}
            {msg.reasoning && <Reasoning text={msg.reasoning} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingIndicator({ reasoning }: { reasoning?: string }) {
  const thinking = !!reasoning?.trim();
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-2 font-mono text-sm text-muted">
        <Loader2 size={15} className="animate-spin" />
        {thinking ? "reasoning…" : "analyzing live telemetry…"}
      </span>
      {thinking && (
        <p className="line-clamp-2 max-w-md font-mono text-[11px] italic text-muted/80">{reasoning}</p>
      )}
    </div>
  );
}

function Caret() {
  return <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-ink align-middle" />;
}

function Reasoning({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink"
      >
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
        reasoning
      </button>
      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap border-2 border-ink bg-paper px-2 py-1.5 font-mono text-[11px] text-ink-soft"
          >
            {text}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- markdown ---------------- */

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_a]:underline">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="font-display text-lg font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-1 font-display text-base font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="font-display text-sm font-bold uppercase tracking-wide">{children}</h3>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          hr: () => <hr className="border-t-2 border-ink/30" />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-lime-dark pl-3 italic text-ink-soft">{children}</blockquote>
          ),
          code: ({ className, children }) => {
            const block = (className ?? "").includes("language-");
            return block ? (
              <code className="block overflow-x-auto border-2 border-ink bg-ink px-3 py-2 font-mono text-[12px] text-lime">
                {children}
              </code>
            ) : (
              <code className="border border-ink bg-paper px-1 py-0.5 font-mono text-[12px]">{children}</code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-2 border-ink bg-lime px-2 py-1 text-left font-bold">{children}</th>
          ),
          td: ({ children }) => <td className="border-2 border-ink px-2 py-1 align-top">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/* ---------------- states ---------------- */

function EmptyState({ onPick }: { onPick: (mode: Mode, q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center border-3 border-ink bg-lime shadow-brutal-sm">
        <Sparkles size={26} className="text-ink" />
      </span>
      <h2 className="font-display text-xl font-bold">Ask your system anything</h2>
      <p className="mb-5 max-w-md font-mono text-sm text-muted">
        I read your live CPU, memory, disk, network and top processes, then explain what's going on in plain English.
      </p>
      <div className="grid w-full max-w-lg gap-2 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.mode}
            onClick={() => onPick(a.mode, "")}
            className="border-2 border-ink bg-panel p-3 text-left transition-transform hover:-translate-y-[2px] hover:shadow-brutal-sm"
          >
            <a.icon size={18} className="mb-1.5 text-lime-dark" />
            <div className="text-sm font-bold">{a.label}</div>
            <div className="font-mono text-[11px] text-muted">{a.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <AlertTriangle size={36} className="mx-auto mb-3 text-warn" />
        <h2 className="mb-1 font-display text-xl font-bold">AI Analyst not configured</h2>
        <p className="font-mono text-sm text-muted">
          Set <code className="border border-ink bg-paper px-1">CEREBRAS_API_KEY</code> in{" "}
          <code className="border border-ink bg-paper px-1">backend/.env</code> and restart the backend.
        </p>
      </Card>
    </div>
  );
}
