"use client";

import { useCallback, useState } from "react";

const AGENT_URL = (
  import.meta.env.VITE_AGENT_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

const SECRET = import.meta.env.VITE_AGENT_SECRET ?? "1234";

export default function AgentControl() {
  const [status, setStatus] = useState(
    "Click the live view to click the host Mac. Type below and use keys — grant Accessibility + Screen Recording to your terminal or Python."
  );
  const [typeText, setTypeText] = useState("");
  const [busy, setBusy] = useState(false);

  const jsonHeaders = {
    "X-Agent-Key": SECRET,
    "Content-Type": "application/json",
  };

  const onVideoClick = useCallback(
    async (e: React.MouseEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (!img.naturalWidth) {
        setStatus("Wait for the first video frame, then click again.");
        return;
      }
      const rect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);
      setBusy(true);
      setStatus("Clicking…");
      try {
        const res = await fetch(`${AGENT_URL}/click`, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ x, y }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
          global_x?: number;
          global_y?: number;
        };
        if (!res.ok) {
          setStatus(`Error: ${data.detail ?? res.statusText}`);
          return;
        }
        setStatus(
          `Clicked stream (${x}, ${y}) → global (${data.global_x}, ${data.global_y})`
        );
      } catch (err) {
        console.error(err);
        setStatus(
          "Network error — start Hands (e.g. uvicorn) or set VITE_AGENT_URL to your tunnel."
        );
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const sendType = useCallback(async () => {
    const text = typeText;
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${AGENT_URL}/type`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setStatus(`Type error: ${data.detail ?? res.statusText}`);
        return;
      }
      setTypeText("");
      setStatus(`Typed ${text.length} character(s).`);
    } catch (err) {
      console.error(err);
      setStatus("Network error while typing.");
    } finally {
      setBusy(false);
    }
  }, [typeText]);

  const sendKey = useCallback(async (key: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${AGENT_URL}/key`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ key }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setStatus(`Key error: ${data.detail ?? res.statusText}`);
        return;
      }
      setStatus(`Pressed: ${key}`);
    } catch (err) {
      console.error(err);
      setStatus("Network error on key.");
    } finally {
      setBusy(false);
    }
  }, []);

  const feedSrc = `${AGENT_URL}/video_feed?token=${encodeURIComponent(SECRET)}`;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 border border-zinc-800 bg-zinc-950 rounded-xl text-zinc-200 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
          Remote Visual Interface
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${busy ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}
          />
          <span className="text-xs text-zinc-600 font-mono">
            {AGENT_URL.replace(/^https?:\/\//, "")}
          </span>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-2 font-mono">
        {AGENT_URL.startsWith("http://127.0.0.1") || AGENT_URL.startsWith("http://localhost")
          ? "Local agent"
          : "Tunnel / remote agent"}
        {" · "}
        Set <code className="text-zinc-400">VITE_AGENT_URL</code> and{" "}
        <code className="text-zinc-400">VITE_AGENT_SECRET</code> (must match{" "}
        <code className="text-zinc-400">AGENT_SECRET_KEY</code> on the host).
      </p>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800 mb-4">
        <img
          src={feedSrc}
          alt="Live screen"
          className="w-full h-full object-contain select-none cursor-crosshair"
          onClick={onVideoClick}
        />
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      <div className="section-label text-[9px] text-zinc-500 uppercase tracking-widest mb-1">
        Type text
      </div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded font-mono text-sm focus:outline-none focus:border-zinc-600"
          placeholder="Text to type on host…"
          value={typeText}
          onChange={(e) => setTypeText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && sendType()}
          disabled={busy}
        />
        <button
          type="button"
          onClick={sendType}
          disabled={busy}
          className="px-4 py-2 bg-zinc-100 text-black font-semibold text-sm rounded hover:bg-zinc-300 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">
        Keys (macOS)
      </div>
      <div className="grid grid-cols-4 gap-1 mb-3">
        {(
          [
            ["enter", "Enter"],
            ["escape", "Esc"],
            ["tab", "Tab"],
            ["backspace", "⌫"],
            ["up", "↑"],
            ["down", "↓"],
            ["left", "←"],
            ["right", "→"],
            ["command", "⌘"],
            ["space", "Space"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            onClick={() => sendKey(key)}
            className="py-2 text-[10px] bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-[24px] text-xs font-mono text-zinc-500">{status}</div>
    </div>
  );
}
