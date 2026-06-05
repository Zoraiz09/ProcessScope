"""ProcessScope FastAPI backend.

Serves live system metrics via REST + a WebSocket stream backed by psutil.
"""
from __future__ import annotations

import asyncio
import contextlib
import os
from pathlib import Path
from typing import Set

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from . import ai
from .monitor import (
    SystemMonitor,
    list_processes,
    process_detail,
    process_threads,
    process_tree,
)

# Load backend/.env so CEREBRAS_API_KEY etc. are available regardless of cwd.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="ProcessScope API", version="1.0.0")

# Configurable origins for production. Comma-separated ALLOWED_ORIGINS, e.g.
# "https://processscope.vercel.app". Defaults to "*" for local/dev.
# Note: allow_credentials must be False when origins is "*" (browser rule);
# this app uses no cookies, so that's fine.
_origins_env = os.getenv("ALLOWED_ORIGINS", "*").strip()
_origins = ["*"] if _origins_env in ("", "*") else [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

monitor = SystemMonitor()


class Broadcaster:
    """Single shared sampling loop fanned out to all connected WebSocket clients."""

    def __init__(self, interval: float = 1.0) -> None:
        self.interval = interval
        self.clients: Set[WebSocket] = set()
        self.latest: dict | None = None
        self._task: asyncio.Task | None = None

    async def _run(self) -> None:
        while True:
            self.latest = await asyncio.to_thread(monitor.snapshot)
            dead: Set[WebSocket] = set()
            for ws in self.clients:
                try:
                    await ws.send_json(self.latest)
                except Exception:
                    dead.add(ws)
            self.clients -= dead
            await asyncio.sleep(self.interval)

    def ensure_running(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())

    async def add(self, ws: WebSocket) -> None:
        self.clients.add(ws)
        self.ensure_running()
        if self.latest is not None:
            with contextlib.suppress(Exception):
                await ws.send_json(self.latest)

    def remove(self, ws: WebSocket) -> None:
        self.clients.discard(ws)


broadcaster = Broadcaster()


class ProcessCache:
    """Background refresher for the (slow) full process scan.

    Scanning ~350 processes with full attrs takes several seconds on Windows,
    so we never do it inside a request. A background task keeps a fresh-ish
    snapshot and the HTTP endpoint serves it instantly.
    """

    def __init__(self, interval: float = 5.0, limit: int = 400) -> None:
        self.interval = interval
        self.limit = limit
        self.data: list[dict] = []
        self.updated_at: float = 0.0
        self._task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    async def _refresh_once(self) -> None:
        import time as _t
        self.data = await asyncio.to_thread(list_processes, self.limit)
        self.updated_at = _t.time()

    async def _run(self) -> None:
        while True:
            try:
                await self._refresh_once()
            except Exception:
                pass
            await asyncio.sleep(self.interval)

    def ensure_running(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())

    async def get(self, limit: int) -> dict:
        self.ensure_running()
        if not self.data:
            # First-ever request: block once so we don't return an empty list.
            async with self._lock:
                if not self.data:
                    await self._refresh_once()
        return {
            "processes": self.data[:limit],
            "count": min(len(self.data), limit),
            "updated_at": self.updated_at,
        }


class TreeCache:
    """Background refresher for the process tree (ppid scan is slow on Windows)."""

    def __init__(self, interval: float = 6.0) -> None:
        self.interval = interval
        self.data: dict | None = None
        self._task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    async def _refresh_once(self) -> None:
        self.data = await asyncio.to_thread(process_tree)

    async def _run(self) -> None:
        while True:
            try:
                await self._refresh_once()
            except Exception:
                pass
            await asyncio.sleep(self.interval)

    def ensure_running(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())

    async def get(self) -> dict:
        self.ensure_running()
        if self.data is None:
            async with self._lock:
                if self.data is None:
                    await self._refresh_once()
        return self.data or {"roots": [], "count": 0}


process_cache = ProcessCache()
tree_cache = TreeCache()


@app.on_event("startup")
async def _startup() -> None:
    # Warm the caches so the first UI load is fast.
    process_cache.ensure_running()
    tree_cache.ensure_running()


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "processscope"}


@app.get("/api/metrics")
async def metrics() -> dict:
    return await asyncio.to_thread(monitor.snapshot)


@app.get("/api/processes")
async def processes(limit: int = 250) -> dict:
    return await process_cache.get(limit)


@app.get("/api/processes/tree")
async def proc_tree() -> dict:
    return await tree_cache.get()


@app.get("/api/processes/{pid}/threads")
async def proc_threads(pid: int) -> dict:
    data = await asyncio.to_thread(process_threads, pid)
    if data is None:
        raise HTTPException(status_code=404, detail="process not found")
    return data


@app.get("/api/processes/{pid}")
async def proc_detail(pid: int) -> dict:
    detail = await asyncio.to_thread(process_detail, pid)
    if detail is None:
        raise HTTPException(status_code=404, detail="process not found")
    return detail


class AIRequest(BaseModel):
    mode: str = "summary"  # summary | rootcause | optimize | chat
    question: str = ""


@app.get("/api/ai/status")
async def ai_status() -> dict:
    return {"configured": ai.is_configured(), "model": os.getenv("CEREBRAS_MODEL", ai.DEFAULT_MODEL)}


@app.post("/api/ai/analyze")
async def ai_analyze(req: AIRequest) -> dict:
    if not ai.is_configured():
        raise HTTPException(status_code=503, detail="AI analyst is not configured (missing CEREBRAS_API_KEY).")

    # Assemble fresh context from the server's own monitor + process cache.
    snapshot = await asyncio.to_thread(monitor.snapshot)
    proc_data = await process_cache.get(200)
    try:
        result = await ai.analyze(
            mode=req.mode,
            question=req.question,
            snapshot=snapshot,
            processes=proc_data.get("processes", []),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return result


@app.post("/api/ai/stream")
async def ai_stream(req: AIRequest):
    if not ai.is_configured():
        raise HTTPException(status_code=503, detail="AI analyst is not configured (missing CEREBRAS_API_KEY).")

    snapshot = await asyncio.to_thread(monitor.snapshot)
    proc_data = await process_cache.get(200)
    generator = ai.analyze_stream(
        mode=req.mode,
        question=req.question,
        snapshot=snapshot,
        processes=proc_data.get("processes", []),
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable proxy buffering for live tokens
        },
    )


@app.websocket("/ws/metrics")
async def ws_metrics(ws: WebSocket) -> None:
    await ws.accept()
    await broadcaster.add(ws)
    try:
        while True:
            # Keep the socket alive; ignore inbound payloads.
            await ws.receive_text()
    except WebSocketDisconnect:
        broadcaster.remove(ws)
    except Exception:
        broadcaster.remove(ws)
