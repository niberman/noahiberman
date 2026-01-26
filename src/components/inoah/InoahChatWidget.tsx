import { useState, useMemo, useEffect, useRef } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChatMessages, ChatMessage } from "@/components/inoah/ChatMessages";
import { ChatInput } from "@/components/inoah/ChatInput";
import { sendInoahMessage } from "@/lib/inoahClient";

const COOLDOWN_MS = 2000;

export function InoahChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(
    () => !isLoading && input.trim().length > 0,
    [input, isLoading]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

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
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 flex items-center gap-3"
          >
            {/* CTA Tooltip */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="hidden sm:flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full shadow-lg pointer-events-none"
            >
              <span className="text-sm font-medium whitespace-nowrap">
                Ask iNoah anything
              </span>
              <span className="text-xs opacity-70">👋</span>
            </motion.div>

            <div className="relative">
              <Button
                onClick={() => setIsOpen(true)}
                size="lg"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-secondary text-secondary-foreground relative z-10"
                aria-label="Open iNoah chat"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
              {/* Pulse animation ring */}
              <span className="absolute inset-0 rounded-full bg-secondary animate-ping opacity-20 pointer-events-none" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background pointer-events-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col h-full"
        >
          <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <SheetTitle className="text-lg">iNoah (Beta)</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    Noah's digital twin
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <ChatMessages messages={messages} isTyping={isLoading} />
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 pb-2">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{error}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={!lastPrompt || isLoading}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Beta Notice */}
          <div className="px-6 pb-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Beta system running on Noah's home server. Responses can be imperfect.
            </div>
          </div>

          {/* Input Area */}
          <div className="px-6 pb-6 border-t border-border/60 pt-4 bg-background">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => handleSend(input)}
              disabled={isLoading}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
