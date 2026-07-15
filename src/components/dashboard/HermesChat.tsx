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
  Unplug,
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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

// Hermes Agent API server (OpenAI-compatible).
// Docs: hermes-agent "API Server" — POST {url}/v1/chat/completions,
// GET {url}/health, Authorization: Bearer <API_SERVER_KEY>.
const SETTINGS_KEY = "hermes-dash-settings";
const REQUEST_TIMEOUT_MS = 300_000; // agent runs tools; responses can be slow
const MODEL = "hermes-agent";

function loadSettings(): ConnSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { url: "http://127.0.0.1:8642", token: "" };
}

function saveSettings(s: ConnSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

const normalizeBase = (url: string) => url.trim().replace(/\/+$/, "");

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HermesChat() {
  const [settings, setSettings] = useState<ConnSettings>(loadSettings);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ---- auto-scroll ---- */
  useEffect(() => {
    // Radix ScrollArea scrolls its inner viewport, not the root element.
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    );
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /* ---- connect (liveness probe against GET /health) ---- */
  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`${normalizeBase(settings.url)}/health`, {
        // /health is unauthenticated by design, but send the token so a
        // server that does enforce auth surfaces a bad key here instead of
        // on the first message.
        headers: settings.token
          ? { Authorization: `Bearer ${settings.token}` }
          : undefined,
        signal: AbortSignal.timeout(10_000),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        setConnected(false);
        setError("Hermes rejected the API key — check it in settings.");
      } else if (res.ok && data?.status === "ok") {
        setConnected(true);
      } else {
        setConnected(false);
        setError("Hermes responded but is not healthy.");
      }
    } catch {
      setConnected(false);
      setError(
        "Cannot reach Hermes — check the API URL, that `hermes gateway` is running, and CORS (API_SERVER_CORS_ORIGINS)."
      );
    } finally {
      setConnecting(false);
    }
  }, [settings.url, settings.token]);

  /* ---- send (stateless chat.completions: full history each turn) ---- */
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !connected) return;
    setInput("");
    setError(null);
    setLoading(true);

    const history = [...messages, { id: `u-${Date.now()}`, role: "user" as const, content: text }];
    setMessages(history);

    try {
      const res = await fetch(
        `${normalizeBase(settings.url)}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(settings.token
              ? { Authorization: `Bearer ${settings.token}` }
              : {}),
          },
          body: JSON.stringify({
            model: MODEL,
            messages: history.map(({ role, content }) => ({ role, content })),
            stream: false, // ponytail: SSE streaming exists upstream; add when non-streaming feels slow
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error?.message || data?.error || `Hermes returned ${res.status}`
        );
      }

      const content: string =
        data?.choices?.[0]?.message?.content ?? "(empty response)";
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes("abort") || msg.includes("timeout")
          ? "Hermes timed out — the agent may still be working. Try again."
          : `Send failed: ${msg}`
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, connected, messages, settings]);

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
            <CardTitle className="text-lg sm:text-xl">Hermes</CardTitle>
            <Badge
              variant={connected ? "default" : "secondary"}
              className={
                connected
                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                  : ""
              }
            >
              {connected ? "Live" : connecting ? "Connecting" : "Offline"}
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
                onClick={() => setConnected(false)}
              >
                <Unplug className="h-4 w-4 mr-1" />
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
          Chat with your Hermes Agent via its OpenAI-compatible API server
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Settings panel */}
        {showSettings && (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Hermes API URL
              </Label>
              <Input
                value={settings.url}
                onChange={(e) => patch({ url: e.target.value })}
                placeholder="http://127.0.0.1:8642"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                API Key
              </Label>
              <Input
                type="password"
                value={settings.token}
                onChange={(e) => patch({ token: e.target.value })}
                placeholder="API_SERVER_KEY from ~/.hermes/.env"
                className="font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hermes must be reachable from this browser. Local: run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                hermes gateway
              </code>{" "}
              on this machine. Remote: expose port 8642 over https (Tailscale
              Serve/Funnel or a Cloudflare tunnel) and set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                API_SERVER_CORS_ORIGINS=https://www.noahiberman.com
              </code>{" "}
              in <code className="rounded bg-muted px-1 py-0.5 text-xs">~/.hermes/.env</code>.
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
            {loading && (
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
            placeholder={connected ? "Message Hermes..." : "Connect to Hermes first"}
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
            {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+Enter to
            send
          </p>
        )}
      </CardContent>
    </Card>
  );
}
