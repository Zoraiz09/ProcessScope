import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PlayCircle,
  BookOpen,
  ArrowRight,
  Boxes,
  Mountain,
  Cpu,
  GitFork,
  AlertOctagon,
  LineChart,
  Sparkles,
  Activity,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { KernelDiagram } from "@/components/landing/KernelDiagram";
import { Pill } from "@/components/ui/Pill";

const NAV_LINKS = [{ label: "Home", to: "/" }];

const FEATURES = [
  { icon: Activity, title: "Live Telemetry", body: "CPU, memory, disk and network sampled every second over a WebSocket stream from real psutil counters." },
  { icon: Boxes, title: "Process Explorer", body: "Search, sort and inspect every running process — PID, threads, state and resource draw." },
  { icon: GitFork, title: "Dependency Tree", body: "Walk the full parent/child hierarchy to see exactly what spawned what." },
  { icon: Cpu, title: "Scheduler Lab", body: "Watch FCFS, SJF, Priority, Round-Robin and Multilevel queues render as live Gantt charts." },
  { icon: AlertOctagon, title: "Deadlock Engine", body: "Build hold-and-wait scenarios and watch the resource-allocation graph detect the cycle." },
  { icon: LineChart, title: "Historical Analytics", body: "Replay system history across 5m / 1h / 24h windows with line, area and heat-map views." },
];

const SECTORS = [
  { icon: Boxes, label: "DEEP CONTAINERS" },
  { icon: Mountain, label: "MOUNTAIN MMM" },
  { icon: Cpu, label: "WND.OMS KERNEL" },
  { icon: GitFork, label: "FORK / EXEC" },
  { icon: Sparkles, label: "AI DIAGNOSTICS" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-40 border-b-3 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((l, i) => (
              <Link
                key={l.label}
                to={l.to}
                className={
                  "text-sm font-semibold transition-colors hover:text-ink " +
                  (i === 0 ? "text-ink underline decoration-lime-deep decoration-2 underline-offset-4" : "text-ink-soft")
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link to="/app" className="btn-lime !px-4 !py-2.5 text-xs shadow-brutal-glow">
            Launch App
          </Link>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden bg-grad-mesh">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Pill variant="lime" className="mb-6">
              <span className="h-1.5 w-1.5 bg-ink" />
              V1.0 Kernel Release
            </Pill>
            <h1 className="font-display text-5xl font-bold leading-[0.98] tracking-tight md:text-6xl xl:text-7xl">
              Visualizing the hidden inner-workings of your{" "}
              <span className="relative inline-block">
                Operating System
                <span className="absolute -bottom-1 left-0 h-3 w-full -z-10 bg-lime" />
              </span>
              .
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft md:text-lg">
              Bridge the gap between OS theory and real-time execution. Track
              processes, visualize scheduler decisions, and resolve deadlocks
              with high-fidelity line-art diagnostics.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/app" className="btn-primary group shadow-brutal-glow">
                Start Live Tracking
                <PlayCircle size={18} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#features" className="btn-ghost">
                Read Docs
                <BookOpen size={18} />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-wider text-muted">
              <span className="flex items-center gap-2"><span className="h-2 w-2 glow-dot bg-lime-deep" /> 13 modules</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 glow-dot bg-lime-deep" /> real psutil data</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 glow-dot bg-lime-deep" /> websocket stream</span>
            </div>
          </motion.div>

          {/* diagram card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative mx-auto w-full max-w-lg"
          >
            {/* soft glow halo behind the diagram */}
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-lime/30 blur-3xl" />
            <div className="card-rich rotate-[-1.5deg] p-4 shadow-brutal-glow-lg">
              <div className="mb-2 flex items-center justify-between border-b-2 border-ink pb-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                  kernel.map
                </span>
                <span className="flex gap-1">
                  <span className="h-2.5 w-2.5 border border-ink bg-danger" />
                  <span className="h-2.5 w-2.5 border border-ink bg-warn" />
                  <span className="h-2.5 w-2.5 border border-ink bg-lime" />
                </span>
              </div>
              <KernelDiagram className="h-auto w-full" />
            </div>
            <div className="absolute -bottom-4 -right-3 flex rotate-2 items-center gap-2 border-3 border-ink bg-grad-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-lime shadow-brutal-sm animate-glow-pulse">
              <span className="h-1.5 w-1.5 glow-dot bg-lime" />
              syscall trace · live
            </div>
          </motion.div>
        </div>

        {/* ---- Sector strip ---- */}
        <div className="border-y-3 border-ink bg-grad-ink py-3 text-paper">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 md:px-8">
            {SECTORS.map((s) => (
              <span key={s.label} className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                <s.icon size={16} className="text-lime" />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mb-12 max-w-2xl">
          <Pill variant="ink" className="mb-4">The Platform</Pill>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Twelve modules. One mental model of the machine.
          </h2>
          <p className="mt-4 text-ink-soft">
            ProcessScope transforms low-level operating-system activity into
            interactive graphical representations — built for students,
            engineers, sysadmins and educators alike.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
              className="card-rich group p-5 transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal-glow-lg"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center border-3 border-ink bg-grad-lime shadow-brutal-sm transition-shadow group-hover:shadow-glow-sm">
                <f.icon size={20} strokeWidth={2.2} />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="card-ink p-10 shadow-brutal-glow-lg md:p-16">
          <div className="grid-noise pointer-events-none absolute inset-0 opacity-[0.07]" />
          {/* lime glow corners to echo the dashboard hero banner */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lime/25 blur-3xl" />
          <div className="relative max-w-2xl">
            <Pill variant="lime" className="mb-5">Ready when you are</Pill>
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              See what your machine is really doing — right now.
            </h2>
            <p className="mt-4 max-w-lg text-paper/70">
              No agents to install. Launch the dashboard and watch live CPU,
              memory, process and thread activity stream in real time.
            </p>
            <Link to="/app" className="btn-lime mt-8 shadow-brutal-glow">
              Launch ProcessScope
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t-3 border-ink bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 md:flex-row md:items-center md:px-8">
          <Logo size={24} />
          <p className="font-mono text-xs text-muted">
            Built with React · FastAPI · psutil · WebSockets — bridging OS theory
            and execution.
          </p>
        </div>
      </footer>
    </div>
  );
}
