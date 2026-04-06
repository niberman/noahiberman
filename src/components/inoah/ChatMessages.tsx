import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping?: boolean;
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
                <MarkdownRenderer
                  content={message.content}
                  className="prose-sm sm:prose-base"
                />
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
