import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Settings,
  Plug,
  PlugOff,
  Loader2,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ConnSettings {
  url: string;
  token: string;
}

interface PendingReq {
  resolve: (v: unknown) => void;
  reject: (r: unknown) => void;
}

type WsFrame =
  | { type: "req"; id: string; method: string; params: Record<string, unknown> }
  | { type: "res"; id: string; ok: boolean; payload?: unknown; error?: { code?: string; message?: string } }
  | { type: "event"; event: string; payload: Record<string, unknown> };

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SETTINGS_KEY = "openclaw-dash-settings";
const RPC_TIMEOUT = 60_000;

function loadSettings(): ConnSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { url: "ws://127.0.0.1:18789", token: "" };
}

function saveSettings(s: ConnSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OpenClawChat() {
  const [settings, setSettings] = useState<ConnSettings>(loadSettings);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string>("current");

  const wsRef = useRef<WebSocket | null>(null);
  const pending = useRef<Map<string, PendingReq>>(new Map());
  const rid = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ---- auto-scroll ---- */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  /* ---- RPC helper ---- */
  const rpc = useCallback(
    (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          reject(new Error("Not connected"));
          return;
        }
        const id = String(++rid.current);
        const timer = setTimeout(() => {
          pending.current.delete(id);
          reject(new Error(`RPC ${method} timed out`));
        }, RPC_TIMEOUT);
        pending.current.set(id, {
          resolve: (v) => {
            clearTimeout(timer);
            resolve(v);
          },
          reject: (r) => {
            clearTimeout(timer);
            reject(r);
          },
        });
        ws.send(JSON.stringify({ type: "req", id, method, params } as WsFrame));
      });
    },
    [],
  );

  /* ---- history ---- */
  const loadHistory = useCallback(async () => {
    try {
      const res = (await rpc("chat.history", { maxChars: 100_000 })) as any;
      const msgs: ChatMessage[] = (res?.messages ?? [])
        .filter(
          (m: any) =>
            (m.role === "user" || m.role === "assistant") &&
            m.text &&
            m.text !== "NO_REPLY" &&
            m.text !== "no_reply",
        )
        .map((m: any, i: number) => ({
          id: `h-${i}`,
          role: m.role,
          content: m.text,
        }));
      setMessages(msgs);
      if (res?.sessionKey) setSessionKey(res.sessionKey);
    } catch (e: any) {
      console.error("history failed:", e?.message ?? e);
    }
  }, [rpc]);

  /* ---- stream handler ---- */
  const onEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    // Chat events carry streaming assistant text
    if (event === "chat") {
      const p = payload as any;
      if (p.role === "assistant" && typeof p.text === "string") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id === "__stream__") {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + p.text },
            ];
          }
          return [
            ...prev,
            { id: "__stream__", role: "assistant" as const, content: p.text },
          ];
        });
      }
      if (p.type === "message_end" || p.status === "complete" || p.type === "done") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id === "__stream__") {
            setLoading(false);
            return [
              ...prev.slice(0, -1),
              { id: `a-${Date.now()}`, role: "assistant" as const, content: last.content },
            ];
          }
          setLoading(false);
          return prev;
        });
      }
    }

    // session.message events (alternative stream path)
    if (event === "session.message") {
      const p = payload as any;
      if (p.role === "assistant" && typeof p.text === "string") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id === "__stream__") {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + p.text },
            ];
          }
          return [
            ...prev,
            { id: "__stream__", role: "assistant" as const, content: p.text },
          ];
        });
      }
      if (p.type === "message_end") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id === "__stream__") {
            setLoading(false);
            return [
              ...prev.slice(0, -1),
              { id: `a-${Date.now()}`, role: "assistant" as const, content: last.content },
            ];
          }
          setLoading(false);
          return prev;
        });
      }
    }
  }, []);

  /* ---- connect ---- */
  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setConnecting(true);
    setError(null);

    const ws = new WebSocket(settings.url);
    wsRef.current = ws;

    // First message must be handled raw (challenge handshake)
    ws.onmessage = (ev) => {
      let data: any;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }

      // 1. connect.challenge -> send connect request
      if (data.type === "event" && data.event === "connect.challenge") {
        ws.send(
          JSON.stringify({
            type: "req",
            id: "connect",
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: "dashboard-chat",
                version: "1.0.0",
                platform: "web",
                mode: "operator",
              },
              role: "operator",
              scopes: ["operator.read", "operator.write"],
              caps: [],
              commands: [],
              permissions: {},
              auth: settings.token ? { token: settings.token } : {},
              locale: "en-US",
              userAgent: "noahiberman-dashboard/1.0.0",
            },
          }),
        );
        return;
      }

      // 2. connect response
      if (data.type === "res" && data.id === "connect") {
        if (data.ok) {
          setConnected(true);
          setConnecting(false);
          // Switch to generic handler
          ws.onmessage = genericHandler;
          loadHistory();
        } else {
          const msg =
            data.error?.message ||
            data.error?.details?.reason ||
            "Connection rejected";
          setError(msg);
          setConnected(false);
          setConnecting(false);
        }
        return;
      }

      // Forward anything else to generic handler
      handleFrame(data);
    };

    // Generic handler after handshake
    const genericHandler = (ev: MessageEvent) => {
      try {
        handleFrame(JSON.parse(ev.data));
      } catch {
        /* ignore */
      }
    };

    const handleFrame = (data: any) => {
      if (data.type === "res") {
        const p = pending.current.get(data.id);
        if (p) {
          pending.current.delete(data.id);
          if (data.ok) p.resolve(data.payload);
          else p.reject(new Error(data.error?.message || "RPC error"));
        }
      } else if (data.type === "event") {
        onEvent(data.event, data.payload ?? {});
      }
    };

    ws.onerror = () => {
      setError("WebSocket error -- check the Gateway URL");
      setConnected(false);
      setConnecting(false);
    };

    ws.onclose = (ev) => {
      setConnected(false);
      setConnecting(false);
      if (ev.code !== 1000 && !ev.wasClean) {
        setError(`Disconnected (${ev.code})`);
      }
    };
  }, [settings, rpc, onEvent, loadHistory]);

  /* ---- send ---- */
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !connected) return;
    setInput("");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: text },
    ]);
    try {
      await rpc("chat.send", { message: text, sessionKey });
    } catch (e: any) {
      setError("Send failed: " + (e?.message ?? e));
      setLoading(false);
    }
  }, [input, loading, connected, rpc, sessionKey]);

  /* ---- cleanup ---- */
  useEffect(() => {
    const ws = wsRef.current;
    return () => {
      ws?.close();
    };
  }, []);

  /* ---- settings helpers ---- */
  const patch = (partial: Partial<ConnSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <Card className="bg-card/95 backdrop-blur animate-slide-up">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-secondary flex-shrink-0" />
            <CardTitle className="text-lg sm:text-xl">OpenClaw</CardTitle>
            <Badge
              variant={connected ? "default" : "secondary"}
              className={
                connected
                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                  : ""
              }
            >
              {connected
                ? "Live"
                : connecting
                  ? "Connecting"
                  : "Offline"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings((s) => !s)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            {connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => wsRef.current?.close()}
              >
                <PlugOff className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={connect}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4 mr-1" />
                )}
                Connect
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Real-time chat with your local OpenClaw Gateway instance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Settings panel */}
        {showSettings && (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Gateway URL
              </Label>
              <Input
                value={settings.url}
                onChange={(e) => patch({ url: e.target.value })}
                placeholder="ws://127.0.0.1:18789"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Auth Token
              </Label>
              <Input
                type="password"
                value={settings.token}
                onChange={(e) => patch({ token: e.target.value })}
                placeholder="gateway shared-secret token"
                className="font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Gateway must be reachable from this browser (Tailscale Serve, tunnel,
              etc.). Set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                gateway.controlUi.dangerouslyDisableDeviceAuth: true
              </code>{" "}
              to skip device-pairing for browser connections.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex-1">{error}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setError(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="h-[420px] pr-2" ref={scrollRef}>
          <div className="space-y-3 pb-4">
            {messages.length === 0 && connected && (
              <p className="text-sm text-muted-foreground text-center py-16">
                Connected. Type a message to start.
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted/60 text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownRenderer
                      content={msg.content}
                      className="prose-sm prose-invert max-w-none"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading &&
              messages[messages.length - 1]?.id !== "__stream__" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking
                  </div>
                </div>
              )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              connected
                ? "Message OpenClaw..."
                : "Connect to Gateway first"
            }
            disabled={!connected}
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={send}
            disabled={!connected || !input.trim() || loading}
            className="shrink-0 h-[44px] w-[44px] p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {connected && (
          <p className="text-xs text-muted-foreground text-right">
            {navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl"}+Enter to
            send
          </p>
        )}
      </CardContent>
    </Card>
  );
}
