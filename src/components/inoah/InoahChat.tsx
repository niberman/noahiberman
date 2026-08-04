import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, ChevronUp, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { sendInoahMessage, type ContextSource } from "@/lib/inoahClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ContextSource[];
}

const SUGGESTIONS = [
  "What's hard about mountain flying?",
  "What is Freedom Aviation?",
  "Why Bilbao?",
];

export function InoahChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Opt-in, off by default: the retrieved notes are quoted verbatim, so don't
  // surface them to every visitor by default.
  const [showSources, setShowSources] = useState(false);
  const lastPrompt = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  // Grow the composer with its content instead of reserving four empty rows.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = async (prompt: string, echo = true) => {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    if (echo) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content: trimmed },
      ]);
    }
    setInput("");
    setError(null);
    setIsLoading(true);
    lastPrompt.current = trimmed;

    try {
      const res = await sendInoahMessage({
        prompt: trimmed,
        include_context: true,
        apply_style: true,
        debug_mode: showSources,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: res.response,
          sources: res.debug?.context_sources,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "iNoah hit a snag.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter is a newline — same on every device. The old
    // build sniffed the user agent and used a different chord per platform.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[min(70vh,640px)] rounded-2xl border border-border/60 bg-card/80 backdrop-blur overflow-hidden">
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div>
          <h2 className="font-display font-semibold text-lg leading-tight">iNoah</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Noah's digital twin · beta, so answers can be off
          </p>
        </div>
        <button
          onClick={() => setShowSources((v) => !v)}
          aria-pressed={showSources}
          title="Show which knowledge-base entries each answer used"
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
            showSources
              ? "border-secondary/60 text-foreground"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          )}
        >
          <Database className="h-3 w-3" />
          Sources
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 overscroll-contain">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-5 px-2">
            <p className="text-sm text-muted-foreground max-w-xs">
              Ask about aviation, the ventures, or the stack.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border/60 px-3.5 py-1.5 text-xs text-foreground/80 transition-colors hover:border-secondary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "user" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm text-secondary-foreground whitespace-pre-wrap">
                    {m.content}
                  </p>
                ) : (
                  <div className="max-w-[92%]">
                    <MarkdownRenderer
                      content={m.content}
                      className="prose-sm text-foreground/90"
                    />
                    <SourceList sources={m.sources} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <p className="text-sm text-muted-foreground animate-pulse">Thinking…</p>
            )}
            {error && (
              <p className="text-sm text-destructive">
                {error}{" "}
                <button
                  onClick={() => lastPrompt.current && send(lastPrompt.current, false)}
                  className="underline underline-offset-2 hover:no-underline"
                >
                  Retry
                </button>
              </p>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 focus-within:border-secondary/60 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask iNoah…"
            disabled={isLoading}
            aria-label="Ask iNoah"
            className="flex-1 resize-none bg-transparent py-1 text-base leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60"
            /* 16px keeps iOS from zooming the viewport on focus */
            style={{ fontSize: "16px" }}
          />
          <Button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            size="icon"
            /* Not the default variant — `--primary` and `--primary-foreground`
               are both pure white in this theme, so the icon would vanish. */
            variant="secondary"
            className="h-8 w-8 flex-shrink-0 rounded-full"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Which knowledge-base entries fed an answer, and how closely they matched. */
function SourceList({ sources }: { sources?: ContextSource[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources?.length) return null;

  return (
    <div className="mt-2 border-t border-border/40 pt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Database className="h-3 w-3" />
        <span>Context sources ({sources.length})</span>
        {expanded ? (
          <ChevronUp className="ml-auto h-3 w-3" />
        ) : (
          <ChevronDown className="ml-auto h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {sources.map((source, i) => (
            <div
              key={source.id}
              className="rounded-lg border border-border/20 bg-background/50 p-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-mono">Source {i + 1}</span>
                <span>{(source.similarity * 100).toFixed(1)}% match</span>
              </div>
              <p className="line-clamp-3 text-foreground/80">{source.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
