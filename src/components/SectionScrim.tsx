import * as React from "react";
import { cn } from "@/lib/utils";

export type SectionScrimProps = React.HTMLAttributes<HTMLDivElement> & {
  scrimClassName?: string;
};

export function SectionScrim({
  className,
  scrimClassName,
  children,
  ...props
}: SectionScrimProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/80",
          scrimClassName
        )}
      />
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

