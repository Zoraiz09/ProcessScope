"""System monitoring engine — wraps psutil into JSON-serializable snapshots."""
from __future__ import annotations

import platform
import socket
import time
from typing import Any, Optional

import psutil


class SystemMonitor:
    """Collects live OS metrics. Stateful for rate calculations (disk/net speed)."""

    def __init__(self) -> None:
        self._last_time: float = time.time()
        self._last_disk: Optional[Any] = psutil.disk_io_counters()
        self._last_net: Optional[Any] = psutil.net_io_counters()
        # Prime cpu_percent so the first real call is non-blocking & meaningful.
        psutil.cpu_percent(interval=None)
        psutil.cpu_percent(interval=None, percpu=True)

    # ----- individual collectors -------------------------------------------------
    def cpu(self) -> dict[str, Any]:
        temp = None
        if hasattr(psutil, "sensors_temperatures"):
            try:
                temps = psutil.sensors_temperatures()
                for entries in temps.values():
                    if entries:
                        temp = round(entries[0].current, 1)
                        break
            except Exception:
                temp = None
        freq = None
        try:
            f = psutil.cpu_freq()
            if f:
                freq = round(f.current, 0)
        except Exception:
            freq = None
        return {
            "percent": round(psutil.cpu_percent(interval=None), 1),
            "cores_physical": psutil.cpu_count(logical=False) or 0,
            "cores_logical": psutil.cpu_count(logical=True) or 0,
            "per_core": [round(x, 1) for x in psutil.cpu_percent(interval=None, percpu=True)],
            "freq_mhz": freq,
            "temperature_c": temp,
        }

    def memory(self) -> dict[str, Any]:
        vm = psutil.virtual_memory()
        sm = psutil.swap_memory()
        return {
            "total": vm.total,
            "used": vm.used,
            "available": vm.available,
            "percent": round(vm.percent, 1),
            "swap_total": sm.total,
            "swap_used": sm.used,
            "swap_percent": round(sm.percent, 1),
        }

    def disk(self, dt: float) -> dict[str, Any]:
        usage = psutil.disk_usage("/" if platform.system() != "Windows" else "C:\\")
        io = psutil.disk_io_counters()
        read_speed = write_speed = 0.0
        if io and self._last_disk and dt > 0:
            read_speed = max(0.0, (io.read_bytes - self._last_disk.read_bytes) / dt)
            write_speed = max(0.0, (io.write_bytes - self._last_disk.write_bytes) / dt)
        self._last_disk = io
        return {
            "total": usage.total,
            "used": usage.used,
            "free": usage.free,
            "percent": round(usage.percent, 1),
            "read_bytes": io.read_bytes if io else 0,
            "write_bytes": io.write_bytes if io else 0,
            "read_speed": round(read_speed, 1),
            "write_speed": round(write_speed, 1),
        }

    def network(self, dt: float) -> dict[str, Any]:
        io = psutil.net_io_counters()
        up = down = 0.0
        if io and self._last_net and dt > 0:
            up = max(0.0, (io.bytes_sent - self._last_net.bytes_sent) / dt)
            down = max(0.0, (io.bytes_recv - self._last_net.bytes_recv) / dt)
        self._last_net = io
        try:
            conns = len(psutil.net_connections(kind="inet"))
        except Exception:
            conns = 0
        return {
            "upload_speed": round(up, 1),
            "download_speed": round(down, 1),
            "bytes_sent": io.bytes_sent if io else 0,
            "bytes_recv": io.bytes_recv if io else 0,
            "connections": conns,
        }

    def system(self) -> dict[str, Any]:
        boot = psutil.boot_time()
        thread_count = 0
        proc_count = 0
        for p in psutil.process_iter(["num_threads"]):
            proc_count += 1
            try:
                thread_count += p.info.get("num_threads") or 0
            except Exception:
                continue
        return {
            "process_count": proc_count,
            "thread_count": thread_count,
            "boot_time": boot,
            "uptime": time.time() - boot,
            "os": f"{platform.system()} {platform.release()}",
            "hostname": socket.gethostname(),
        }

    # ----- composite -------------------------------------------------------------
    def snapshot(self) -> dict[str, Any]:
        now = time.time()
        dt = now - self._last_time
        self._last_time = now
        return {
            "timestamp": now,
            "cpu": self.cpu(),
            "memory": self.memory(),
            "disk": self.disk(dt),
            "network": self.network(dt),
            "system": self.system(),
        }


# ----- process listing (separate, heavier; used by Process Explorer) -------------
def list_processes(limit: int = 250) -> list[dict[str, Any]]:
    """Snapshot all processes with CPU/memory/thread info.

    Caches Process handles between the two cpu_percent samples so we iterate
    the (slow on Windows) process table only once for data collection.
    """
    total_cores = psutil.cpu_count(logical=True) or 1
    total_mem = psutil.virtual_memory().total or 1

    # Pass 1: prime cpu_percent across the table.
    for p in psutil.process_iter():
        try:
            p.cpu_percent(interval=None)
        except Exception:
            continue

    time.sleep(0.1)

    # Pass 2: process_iter(attrs=...) lets psutil batch the per-field syscalls
    # from a single system snapshot — far cheaper than per-handle calls on
    # Windows. ppid()/create_time() are deliberately excluded (slow, not shown
    # in the table); process_detail() fetches them lazily on row click.
    procs: list[dict[str, Any]] = []
    for p in psutil.process_iter(["pid", "name", "num_threads", "status", "memory_info"]):
        try:
            info = p.info
            cpu = p.cpu_percent(interval=None) / total_cores
            mem = info.get("memory_info")
            mem_bytes = mem.rss if mem else 0
            procs.append({
                "pid": info["pid"],
                "name": info.get("name") or "unknown",
                "cpu": round(cpu, 1),
                "memory": round(mem_bytes / total_mem * 100, 1),
                "memory_bytes": mem_bytes,
                "threads": info.get("num_threads") or 0,
                "status": info.get("status") or "unknown",
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
        except Exception:
            continue
    procs.sort(key=lambda x: x["cpu"], reverse=True)
    return procs[:limit]


def _safe(fn, default=None):
    try:
        return fn()
    except Exception:
        return default


def process_detail(pid: int) -> dict[str, Any] | None:
    """Full detail for a single process — parent, children, timing, threads."""
    try:
        p = psutil.Process(pid)
    except psutil.NoSuchProcess:
        return None
    total_mem = psutil.virtual_memory().total or 1
    total_cores = psutil.cpu_count(logical=True) or 1
    with p.oneshot():
        mem = _safe(p.memory_info)
        mem_bytes = mem.rss if mem else 0
        ppid = _safe(p.ppid, 0) or 0
        parent_name = None
        if ppid:
            try:
                parent_name = psutil.Process(ppid).name()
            except Exception:
                parent_name = None
        threads = []
        try:
            for t in p.threads():
                threads.append({
                    "id": t.id,
                    "user_time": round(t.user_time, 2),
                    "system_time": round(t.system_time, 2),
                })
        except Exception:
            threads = []
        children = []
        try:
            for c in p.children():
                children.append({"pid": c.pid, "name": _safe(c.name, "unknown")})
        except Exception:
            children = []
        return {
            "pid": p.pid,
            "ppid": ppid,
            "parent_name": parent_name,
            "name": _safe(p.name, "unknown"),
            "exe": _safe(p.exe),
            "cpu": round((_safe(p.cpu_percent, 0.0) or 0.0) / total_cores, 1),
            "memory": round(mem_bytes / total_mem * 100, 1),
            "memory_bytes": mem_bytes,
            "threads": _safe(p.num_threads, 0),
            "status": _safe(p.status, "unknown"),
            "username": _safe(p.username),
            "create_time": _safe(p.create_time, 0),
            "num_children": len(children),
            "children": children[:50],
            "thread_list": threads[:100],
        }


def process_tree() -> dict[str, Any]:
    """Build a nested parent/child tree of all processes."""
    nodes: dict[int, dict[str, Any]] = {}
    for p in psutil.process_iter(["pid", "ppid", "name"]):
        try:
            info = p.info
            nodes[info["pid"]] = {
                "pid": info["pid"],
                "ppid": info.get("ppid") or 0,
                "name": info.get("name") or "unknown",
                "children": [],
            }
        except Exception:
            continue
    roots: list[dict[str, Any]] = []
    for pid, node in nodes.items():
        parent = nodes.get(node["ppid"])
        if parent and parent is not node:
            parent["children"].append(node)
        else:
            roots.append(node)
    return {"roots": roots, "count": len(nodes)}
