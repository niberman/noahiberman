import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { ContextSource } from "@/lib/inoahClient";
import { ChevronDown, ChevronUp, Database } from "lucide-react";
import { useState } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  debug?: {
    context_sources: ContextSource[];
    context_count: number;
    raw_context: string;
  };
};

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping?: boolean;
}

function DebugInfo({ debug }: { debug: ChatMessage["debug"] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!debug || !debug.context_sources.length) return null;

  return (
    <div className="mt-2 border-t border-border/40 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Database className="h-3 w-3" />
        <span>Context Sources ({debug.context_count})</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 ml-auto" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-auto" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {debug.context_sources.map((source, idx) => (
            <div
              key={source.id}
              className="bg-background/50 rounded-lg p-2 text-xs border border-border/20"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-muted-foreground">
                  Source {idx + 1}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {(source.similarity * 100).toFixed(1)}% match
                </span>
              </div>
              <p className="text-foreground/80 line-clamp-3">{source.content}</p>
              {source.metadata && (
                <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                  {JSON.stringify(source.metadata)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatMessages({ messages, isTyping }: ChatMessagesProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";
        return (
          <div
            key={message.id}
            className={cn(
              "flex w-full",
              isAssistant ? "justify-start" : "justify-end"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:text-base shadow-sm",
                isAssistant
                  ? "bg-muted/60 text-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {isAssistant ? (
                <>
                  <MarkdownRenderer
                    content={message.content}
                    className="prose-sm sm:prose-base"
                  />
                  {message.debug && <DebugInfo debug={message.debug} />}
                </>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        );
      })}
      {isTyping && (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            iNoah is thinking…
          </div>
        </div>
      )}
    </div>
  );
}
