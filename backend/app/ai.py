"""AI Performance Analyst — wraps the Cerebras inference API (gpt-oss-120b).

The API key lives in the environment (backend/.env, gitignored) and never
leaves the server: the frontend talks to /api/ai/*, which proxies to Cerebras.
"""
from __future__ import annotations

import json
import os
from typing import Any, AsyncIterator

import httpx

CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"
DEFAULT_MODEL = "gpt-oss-120b"

SYSTEM_PROMPT = (
    "You are ProcessScope AI Analyst, an expert operating-systems performance "
    "engineer. You explain live system behavior in plain English, identify the "
    "most likely root causes of CPU / memory / disk / network pressure, and give "
    "concrete, safe optimization advice.\n\n"
    "Rules:\n"
    "- Base every claim ONLY on the telemetry provided. Never invent processes, "
    "PIDs, or numbers. If the data is insufficient, say so plainly.\n"
    "- Be concise and well-structured. Use short markdown sections and bullet "
    "points. Lead with the headline, then details.\n"
    "- When you name a process, use the names/PIDs from the snapshot.\n"
    "- Never recommend destructive actions (e.g. force-killing system processes) "
    "without a clear caveat."
)

# Canned prompts for the one-click quick actions in the UI.
MODE_PROMPTS: dict[str, str] = {
    "summary": (
        "Give a concise health summary of this system right now: overall status "
        "(healthy / strained / critical), what the headline numbers mean, and the "
        "1-3 things most worth noting."
    ),
    "rootcause": (
        "Analyze the current resource usage. For any CPU, memory, disk, or network "
        "that looks high or unusual, explain the most likely root cause(s) and which "
        "processes are responsible."
    ),
    "optimize": (
        "Based on the current telemetry, give concrete, prioritized optimization "
        "recommendations to improve this system's performance. Note any trade-offs."
    ),
}


def _pct(v: Any) -> str:
    try:
        return f"{float(v):.0f}%"
    except (TypeError, ValueError):
        return str(v)


def _mb(bytes_: Any) -> str:
    try:
        return f"{float(bytes_) / (1024 ** 2):.0f} MB"
    except (TypeError, ValueError):
        return str(bytes_)


def build_context(snapshot: dict, processes: list[dict]) -> str:
    """Render the live telemetry into a compact text block for the model."""
    cpu = snapshot.get("cpu", {})
    mem = snapshot.get("memory", {})
    disk = snapshot.get("disk", {})
    net = snapshot.get("network", {})
    sysm = snapshot.get("system", {})

    top_cpu = sorted(processes, key=lambda p: p.get("cpu", 0), reverse=True)[:8]
    top_mem = sorted(processes, key=lambda p: p.get("memory", 0), reverse=True)[:8]

    def proc_line(p: dict) -> str:
        return (
            f"  - {p.get('name', '?')} (pid {p.get('pid', '?')}): "
            f"cpu {_pct(p.get('cpu', 0))}, mem {_pct(p.get('memory', 0))}, "
            f"{p.get('threads', '?')} threads, {p.get('status', '?')}"
        )

    lines = [
        f"HOST: {sysm.get('hostname', '?')} | OS: {sysm.get('os', '?')} | "
        f"uptime {int(sysm.get('uptime', 0)) // 3600}h",
        f"PROCESSES: {sysm.get('process_count', '?')} | THREADS: {sysm.get('thread_count', '?')}",
        "",
        "CPU:",
        f"  total {_pct(cpu.get('percent'))} across "
        f"{cpu.get('cores_logical', '?')} logical / {cpu.get('cores_physical', '?')} physical cores",
        f"  per-core: {cpu.get('per_core', [])}",
        (f"  freq {cpu.get('freq_mhz')} MHz" if cpu.get("freq_mhz") else ""),
        (f"  temp {cpu.get('temperature_c')} C" if cpu.get("temperature_c") else ""),
        "",
        "MEMORY:",
        f"  RAM {_pct(mem.get('percent'))} used "
        f"({_mb(mem.get('used'))} / {_mb(mem.get('total'))}), {_mb(mem.get('available'))} free",
        f"  swap {_pct(mem.get('swap_percent'))} used",
        "",
        "DISK:",
        f"  {_pct(disk.get('percent'))} used, "
        f"read {_mb(disk.get('read_speed'))}/s, write {_mb(disk.get('write_speed'))}/s",
        "",
        "NETWORK:",
        f"  down {_mb(net.get('download_speed'))}/s, up {_mb(net.get('upload_speed'))}/s, "
        f"{net.get('connections', '?')} connections",
        "",
        "TOP PROCESSES BY CPU:",
        *[proc_line(p) for p in top_cpu],
        "",
        "TOP PROCESSES BY MEMORY:",
        *[proc_line(p) for p in top_mem],
    ]
    return "\n".join(l for l in lines if l != "" or True)


def is_configured() -> bool:
    return bool(os.getenv("CEREBRAS_API_KEY"))


def _require_key() -> str:
    api_key = os.getenv("CEREBRAS_API_KEY")
    if not api_key:
        raise RuntimeError("CEREBRAS_API_KEY is not set on the server")
    return api_key


def _build_payload(mode: str, question: str, snapshot: dict, processes: list[dict], *, stream: bool) -> dict:
    context = build_context(snapshot, processes)
    if mode == "chat":
        task = question.strip() or "Summarize the current system health."
    else:
        task = MODE_PROMPTS.get(mode, MODE_PROMPTS["summary"])
        if question.strip():
            task += f"\n\nAdditional user question: {question.strip()}"

    user_content = (
        "Here is the current live system telemetry:\n\n"
        f"```\n{context}\n```\n\n"
        f"{task}"
    )

    payload: dict[str, Any] = {
        "model": os.getenv("CEREBRAS_MODEL", DEFAULT_MODEL),
        "reasoning_effort": "medium",
        "max_completion_tokens": 2500,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    }
    if stream:
        payload["stream"] = True
        payload["stream_options"] = {"include_usage": True}
    return payload


def _headers(api_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


async def analyze(
    *,
    mode: str,
    question: str,
    snapshot: dict,
    processes: list[dict],
) -> dict:
    """Call Cerebras (non-streaming) and return {answer, reasoning, model, usage}."""
    api_key = _require_key()
    payload = _build_payload(mode, question, snapshot, processes, stream=False)

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(CEREBRAS_URL, headers=_headers(api_key), json=payload)

    if resp.status_code != 200:
        raise RuntimeError(f"Cerebras API error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    msg = data["choices"][0]["message"]
    return {
        "answer": (msg.get("content") or "").strip(),
        "reasoning": (msg.get("reasoning") or "").strip(),
        "model": data.get("model", payload["model"]),
        "usage": data.get("usage", {}),
    }


def _sse(obj: dict) -> str:
    """Serialize one of our own SSE events for the browser."""
    return f"data: {json.dumps(obj)}\n\n"


async def analyze_stream(
    *,
    mode: str,
    question: str,
    snapshot: dict,
    processes: list[dict],
) -> AsyncIterator[str]:
    """Proxy Cerebras' token stream, re-emitting compact SSE events:
    {content}, {reasoning}, {usage, model}, {error}, then {done:true}."""
    try:
        api_key = _require_key()
    except RuntimeError as exc:
        yield _sse({"error": str(exc)})
        yield _sse({"done": True})
        return

    payload = _build_payload(mode, question, snapshot, processes, stream=True)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", CEREBRAS_URL, headers=_headers(api_key), json=payload) as resp:
                if resp.status_code != 200:
                    body = (await resp.aread()).decode(errors="ignore")[:300]
                    yield _sse({"error": f"Cerebras API error {resp.status_code}: {body}"})
                    yield _sse({"done": True})
                    return

                async for line in resp.aiter_lines():
                    if not line or line.startswith(":"):
                        continue
                    if not line.startswith("data:"):
                        continue
                    data = line[len("data:"):].strip()
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                    except json.JSONDecodeError:
                        continue

                    choices = obj.get("choices") or []
                    if choices:
                        delta = choices[0].get("delta", {})
                        piece: dict[str, str] = {}
                        if delta.get("content"):
                            piece["content"] = delta["content"]
                        if delta.get("reasoning"):
                            piece["reasoning"] = delta["reasoning"]
                        if piece:
                            yield _sse(piece)
                    if obj.get("usage"):
                        yield _sse({"usage": obj["usage"], "model": obj.get("model", payload["model"])})
    except (httpx.HTTPError, httpx.StreamError) as exc:
        yield _sse({"error": f"Stream failed: {exc}"})

    yield _sse({"done": True})
