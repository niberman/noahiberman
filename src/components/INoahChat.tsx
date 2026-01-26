import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/inoah/ChatInput";
import { ChatMessages, type ChatMessage } from "@/components/inoah/ChatMessages";
import { sendInoahMessage } from "@/lib/inoahClient";

const COOLDOWN_MS = 2000;

export function INoahChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: "iNoah online. Ask a concise question.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = async (prompt: string, addUserMessage = true) => {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    const now = Date.now();
    if (lastSentAt && now - lastSentAt < COOLDOWN_MS) {
      setError("One message at a time.");
      return;
    }

    if (addUserMessage) {
      appendMessage({ id: `user-${now}`, role: "user", content: trimmed });
    }

    setInput("");
    setIsLoading(true);
    setError(null);
    setLastPrompt(trimmed);
    setLastSentAt(now);

    try {
      const response = await sendInoahMessage({
        prompt: trimmed,
        include_context: true,
        apply_style: true,
      });

      appendMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.response,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Request failed. Try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (!lastPrompt) return;
    handleSend(lastPrompt, false);
  };

  return (
    <div className="space-y-3 w-full max-w-full">
      <div className="max-h-[260px] overflow-y-auto pr-1">
        <ChatMessages messages={messages} isTyping={isLoading} />
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span className="truncate">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={!lastPrompt || isLoading}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => handleSend(input)}
        disabled={isLoading}
      />
    </div>
  );
}

