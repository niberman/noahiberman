import { useMemo, useState } from "react";
import { SEO } from "@/components/SEO";
import { ChatShell } from "@/components/inoah/ChatShell";
import { ChatInput } from "@/components/inoah/ChatInput";
import { ChatMessages, ChatMessage } from "@/components/inoah/ChatMessages";
import { sendInoahMessage } from "@/lib/inoahClient";
import { Button } from "@/components/ui/button";

const COOLDOWN_MS = 2000;

export default function Inoah() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hey, I'm iNoah — a beta digital twin trained on Noah's voice, values, and work. Ask me about aviation, startups, or what Noah is building right now.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  const canSend = useMemo(
    () => !isLoading && input.trim().length > 0,
    [input, isLoading]
  );

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = async (prompt: string, addUserMessage = true) => {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const now = Date.now();
    if (lastSentAt && now - lastSentAt < COOLDOWN_MS) {
      setError("Give iNoah a second to catch up before sending another message.");
      return;
    }

    if (addUserMessage) {
      appendMessage({
        id: `user-${now}`,
        role: "user",
        content: trimmed,
      });
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
        err instanceof Error ? err.message : "iNoah hit a snag. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (!lastPrompt) {
      return;
    }
    handleSend(lastPrompt, false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="iNoah — Digital Twin Beta"
        description="Chat with iNoah, a beta digital twin trained on Noah Berman's personality, values, and work."
        canonical="https://noahiberman.com/inoah"
      />
      <section className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <ChatShell
            title="Meet iNoah (Beta)"
            description="A public-facing RAG chat experience that mirrors Noah's personality, projects, and perspective."
            footer={
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                iNoah is a beta system running on Noah's home server via LM Studio. Responses can be imperfect.
              </div>
            }
          >
            <ChatMessages messages={messages} isTyping={isLoading} />
            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={handleRetry} disabled={!lastPrompt || isLoading}>
                    Retry last message
                  </Button>
                </div>
              </div>
            ) : null}
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => handleSend(input)}
              disabled={isLoading}
            />
          </ChatShell>
        </div>
      </section>
    </div>
  );
}
