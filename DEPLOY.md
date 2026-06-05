# Deploying ProcessScope

ProcessScope is split into two deployables:

- **Frontend** — a static Vite/React SPA → **Vercel**
- **Backend** — FastAPI + `psutil` + a **WebSocket** metrics stream + a live
  sampling loop → an **always-on host** (Render / Railway / Fly / VPS)

> ⚠️ The backend reports the metrics of **the machine it runs on**. Deployed to
> a cloud host, the dashboard shows **that host's** CPU/memory/processes — i.e.
> it becomes a server monitor. To watch your own PC, run the backend locally.
>
> Vercel **cannot** host the backend: serverless functions don't support
> inbound WebSockets or long-running background loops.

---

## 1. Deploy the backend (Render, via Blueprint)

The repo ships a `render.yaml` Blueprint and `backend/Dockerfile`.

1. Push this repo to GitHub (already done).
2. In Render: **New → Blueprint** → select this repo → **Apply**.
   It reads `render.yaml` and creates the `processscope-api` web service from
   `backend/Dockerfile`.
3. Set the secret env vars in the Render dashboard:
   - `CEREBRAS_API_KEY` = your Cerebras key (required for the AI Analyst tab)
   - `ALLOWED_ORIGINS` = your Vercel URL, e.g. `https://processscope.vercel.app`
     (leave unset/`*` while testing)
   - `CEREBRAS_MODEL` is preset to `gpt-oss-120b`.
4. Deploy. Confirm it's up at `https://<your-service>.onrender.com/api/health`
   → `{"status":"ok"}`.

> Render's **free** plan cold-starts after ~15 min idle (first request is slow)
> and WebSockets reconnect after wake — fine for a demo. Use a paid plan for
> always-warm.

**Other hosts:** the `Dockerfile` is portable.
- **Railway:** New Project → Deploy from repo → set Root Directory to `backend`
  → add the same env vars.
- **Fly.io:** `cd backend && fly launch` (uses the Dockerfile) → `fly secrets set CEREBRAS_API_KEY=… ALLOWED_ORIGINS=…`.

---

## 2. Deploy the frontend (Vercel)

The repo ships `frontend/vercel.json` (Vite preset + SPA routing rewrite).

1. In Vercel: **Add New → Project** → import this repo.
2. **Set Root Directory to `frontend`** (important — the app isn't at repo root).
   Vercel auto-detects Vite (`npm run build` → `dist`).
3. Add an Environment Variable:
   - `VITE_API_BASE` = your backend origin, e.g.
     `https://processscope-api.onrender.com` (no trailing slash)
4. Deploy. The SPA will call the backend's REST + WebSocket endpoints directly.

After the frontend URL exists, go back and set the backend's `ALLOWED_ORIGINS`
to that exact URL, then redeploy the backend.

---

## How the wiring works

- `frontend/src/lib/api.ts` builds every request from `VITE_API_BASE`:
  - **unset** (local dev) → relative paths (`/api/…`, `/ws/metrics`) ride the
    Vite proxy in `vite.config.ts`.
  - **set** (production) → absolute URLs to the backend; `wsUrl()` swaps
    `http→ws` / `https→wss` automatically.
- So **local dev is unchanged** — just run backend on `:8000` and
  `npm run dev` as before.

---

## Local development (unchanged)

```bash
# backend
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env   # add CEREBRAS_API_KEY
uvicorn app.main:app --reload --port 8000

# frontend (separate terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxies /api + /ws to :8000)
```
