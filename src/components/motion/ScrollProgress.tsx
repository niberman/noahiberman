import { m, useMotionValue, useSpring } from "framer-motion";
import { useLenis } from "lenis/react";

/**
 * Hairline scroll progress bar pinned above the nav. Driven straight off
 * Lenis's progress (scroll / limit) through a light spring so it glides with
 * the smoothed scroll instead of ticking. Scroll-linked position feedback, so
 * it stays under reduced motion — the spring just follows the (then-native)
 * scroll.
 */
export function ScrollProgress() {
  const progress = useMotionValue(0);
  const scaleX = useSpring(progress, { stiffness: 180, damping: 32, restDelta: 0.001 });
  useLenis((lenis) => progress.set(lenis.progress));

  return (
    <m.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[120] origin-left pointer-events-none bg-gradient-to-r from-secondary/70 via-secondary to-fuchsia-400 shadow-[0_0_12px_hsl(var(--secondary)/0.7)]"
      style={{ scaleX }}
    />
  );
}
