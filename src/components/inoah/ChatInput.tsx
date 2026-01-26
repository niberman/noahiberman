import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className="space-y-3 w-full max-w-full">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask iNoah anything about Noah, his work, or his worldview..."
        className="min-h-[96px] resize-none w-full max-w-full"
        disabled={disabled}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Tip: Press Ctrl/⌘ + Enter to send</span>
        <Button onClick={onSend} disabled={disabled || !value.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
