import { useRef, type ReactNode } from "react";
import { m, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

// Read once — pointer type doesn't change mid-session, and gating here keeps
// touch scrolling from dragging buttons around under a moving finger.
const finePointer =
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

/**
 * Magnetic hover wrapper: the child leans toward the cursor while it's over
 * the element and springs back to rest on leave. Transform-only (composited),
 * desktop pointers only, inert under prefers-reduced-motion.
 */
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode;
  /** Fraction of the cursor's offset from center applied as translation. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 20, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 150, damping: 20, mass: 0.6 });
  const reduceMotion = useReducedMotion();
  const active = finePointer && !reduceMotion;

  const handleMove = (e: React.PointerEvent) => {
    if (!active || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <m.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
    </m.div>
  );
}
