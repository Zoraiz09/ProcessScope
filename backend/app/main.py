"""ProcessScope FastAPI backend.

Serves live system metrics via REST + a WebSocket stream backed by psutil.
"""
from __future__ import annotations

import asyncio
import contextlib
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from fastapi import HTTPException

from .monitor import SystemMonitor, list_processes, process_detail, process_tree

app = FastAPI(title="ProcessScope API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


process_cache = ProcessCache()


@app.on_event("startup")
async def _startup() -> None:
    # Warm the process cache so the first UI load is fast.
    process_cache.ensure_running()


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
    return await asyncio.to_thread(process_tree)


@app.get("/api/processes/{pid}")
async def proc_detail(pid: int) -> dict:
    detail = await asyncio.to_thread(process_detail, pid)
    if detail is None:
        raise HTTPException(status_code=404, detail="process not found")
    return detail


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
