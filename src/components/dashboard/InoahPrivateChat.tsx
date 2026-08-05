import { useEffect, useRef, useState } from "react";
import { ArrowUp, Database, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { sendInoahPrivateMessage, type ContextSource } from "@/lib/inoahClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ContextSource[];
}

/**
 * Owner-only chat against the full corpus via inoah-chat-private. Sources are
 * on by default here: this panel exists to check what the twin retrieves.
 */
const InoahPrivateChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: trimmed },
    ]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in again.");

      const res = await sendInoahPrivateMessage(
        { prompt: trimmed, include_context: true, debug_mode: true },
        session.access_token
      );
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
      setError(err instanceof Error ? err.message : "Private chat hit a snag.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card/95 backdrop-blur animate-slide-up">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-secondary flex-shrink-0" />
          <CardTitle className="text-lg sm:text-xl">iNoah Private</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Answers from the full corpus, private rows included. Sources shown for
          every reply.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {messages.length > 0 && (
          <div className="max-h-80 overflow-y-auto space-y-4 mb-4 pr-1">
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
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 space-y-2 border-t border-border/40 pt-2">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Database className="h-3 w-3" />
                          Context sources ({m.sources.length})
                        </p>
                        {m.sources.map((source, i) => (
                          <div
                            key={source.id}
                            className="rounded-lg border border-border/20 bg-background/50 p-2 text-xs"
                          >
                            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="font-mono">Source {i + 1}</span>
                              <span>{(source.similarity * 100).toFixed(1)}% match</span>
                            </div>
                            <p className="text-foreground/80 whitespace-pre-wrap">
                              {source.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
            )}
            <div ref={endRef} />
          </div>
        )}

        {error && <p className="text-sm text-destructive mb-2">{error}</p>}

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask the private twin..."
            disabled={isLoading}
            aria-label="Ask the private twin"
            className="flex-1 resize-none rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-secondary/60 transition-colors placeholder:text-muted-foreground disabled:opacity-60"
          />
          <Button
            onClick={send}
            disabled={isLoading || !input.trim()}
            size="icon"
            variant="secondary"
            className="h-9 w-9 flex-shrink-0 rounded-full"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InoahPrivateChat;
