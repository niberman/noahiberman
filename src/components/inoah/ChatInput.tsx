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
    // On mobile, Enter sends (no modifier needed)
    // On desktop, Ctrl/Cmd + Enter sends
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (event.key === "Enter") {
      if (isMobile && !event.shiftKey) {
        // Mobile: Enter sends, Shift+Enter for new line
        event.preventDefault();
        onSend();
      } else if ((event.ctrlKey || event.metaKey) && !isMobile) {
        // Desktop: Ctrl/Cmd+Enter sends
        event.preventDefault();
        onSend();
      }
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask iNoah anything about Noah, his work, or his worldview..."
        className="min-h-[96px] resize-none text-base" // text-base prevents iOS zoom
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck="true"
        style={{ fontSize: '16px' }} // Prevent iOS zoom
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="hidden sm:inline">Tip: Press Ctrl/⌘ + Enter to send</span>
        <span className="sm:hidden">Tip: Press Enter to send</span>
        <Button 
          onClick={onSend} 
          disabled={disabled || !value.trim()}
          className="touch-manipulation" // iOS touch optimization
          style={{ minHeight: '44px' }} // iOS touch target size
        >
          Send
        </Button>
      </div>
    </div>
  );
}
