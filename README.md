# ProcessScope

**Real-time operating-system monitoring & visualization platform.**

ProcessScope transforms low-level OS activity — processes, threads, CPU
scheduling, memory and resource allocation — into interactive, educational
visualizations. Unlike Task Manager or `htop`, it focuses on *explaining* what
the machine is doing, not just listing numbers.

Built from the [PROCESSSCOPE.pdf](PROCESSSCOPE.pdf) product design document with a
neo-brutalist UI (bold type, hard shadows, lime accents).

---

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 18 · TypeScript · Vite · TailwindCSS · Framer Motion  |
| Backend  | FastAPI · Python · psutil · WebSockets                      |
| Data     | Live system metrics via `psutil` (no agent to install)      |

## Status — Phase 1

| Module                  | State                                            |
| ----------------------- | ------------------------------------------------ |
| Landing page            | ✅ Built (faithful to design inspo)              |
| Dashboard               | ✅ Live — CPU / Memory / Storage / Network        |
| Process Explorer        | ✅ Live — table, search, sort, detail drawer      |
| Dependency Tree         | 🟡 Backend ready (`/api/processes/tree`), UI next |
| Thread Explorer         | 🟡 Backend ready, UI next                         |
| Scheduler Simulator     | 🟡 Scaffolded (FCFS/SJF/Priority/RR/MLQ)          |
| Process State Visualizer| 🟡 Scaffolded                                     |
| Resource Allocation     | 🟡 Scaffolded                                     |
| Deadlock Detection      | 🟡 Scaffolded                                     |
| Historical Analytics    | 🟡 Scaffolded (history buffer live)               |
| System Replay           | 🟡 Roadmap                                        |
| Alerts & Anomalies      | 🟡 Scaffolded                                     |
| AI Performance Analyst  | 🟡 Roadmap                                        |

---

## Run it

Two processes — backend (port 8000) and frontend (port 5173). The Vite dev
server proxies `/api` and `/ws` to the backend.

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (source venv/bin/activate on *nix)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

### One-shot (Windows PowerShell)

```powershell
./scripts/dev.ps1
```

---

## API

| Endpoint                  | Description                                  |
| ------------------------- | -------------------------------------------- |
| `GET  /api/health`        | Service health                               |
| `GET  /api/metrics`       | One metrics snapshot (CPU/mem/disk/net/sys)  |
| `WS   /ws/metrics`        | Live metrics stream (1 Hz)                   |
| `GET  /api/processes`     | Cached process list (background-refreshed)   |
| `GET  /api/processes/{pid}` | Full process detail (parent, children, threads) |
| `GET  /api/processes/tree`| Nested parent/child process tree             |

### Performance note

A full process scan on Windows (~350 processes with thread/state attrs) takes
several seconds. The `/api/processes` endpoint therefore serves from a
**background-refreshed cache** (every 5 s) so requests return instantly; the
slow scan never happens inside a request. Per-process detail is fetched lazily
on row click.

---

## Project layout

```
backend/
  app/
    main.py        FastAPI app, WebSocket broadcaster, process cache
    monitor.py     psutil collectors (SystemMonitor, list/detail/tree)
frontend/
  src/
    pages/         Landing, Dashboard, ProcessExplorer, ModuleScaffold
    components/    ui/ (Card, Button, SegmentBar, Sparkline, Pill)
                   layout/ (AppShell, Sidebar, TopBar, MobileNav)
                   landing/ (KernelDiagram)
    hooks/         useMetrics (WebSocket), MetricsContext
    lib/           types, nav, moduleSpecs, utils
```
