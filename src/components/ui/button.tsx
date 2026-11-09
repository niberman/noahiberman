import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Editorial pills (design_handoff_work_aviation_now/README.md): Geist 500,
  // .02em tracking, 999px radius. default = the purple CTA, outline = the
  // hairline pill, ghost = muted text that brightens on hover.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[.02em] ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ed-light focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-ed-accent text-white shadow-[0_0_32px_-6px_rgba(128,51,204,.55)] hover:bg-ed-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-[rgba(236,230,245,.25)] bg-transparent text-ed-ink backdrop-blur-[8px] hover:border-ed-light hover:bg-[rgba(128,51,204,.15)]",
        secondary: "border border-white/[.14] bg-white/[.04] text-ed-ink hover:bg-white/[.08]",
        ghost: "text-ed-muted hover:bg-white/[.06] hover:text-ed-ink",
        link: "text-ed-light underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-11 px-8 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
