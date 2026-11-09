import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-2xl border border-white/[.12] bg-white/[.03] px-4 py-3 text-sm text-ed-ink transition-colors placeholder:text-ed-muted/70 focus-visible:border-ed-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ed-light/25 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
