import { useEffect } from "react";
import { m, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

const finePointer =
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

/**
 * Soft aura that trails the cursor across the hero, screen-blended over the
 * flight map. Listens on the hero section itself (passed by ref) so it dies
 * with the hero, springs behind the pointer for weight, and fades out on
 * leave. Desktop pointers only; inert under reduced motion.
 */
export function HeroSpotlight({ heroRef }: { heroRef: React.RefObject<HTMLElement> }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 80, damping: 22, mass: 0.7 });
  const springY = useSpring(y, { stiffness: 80, damping: 22, mass: 0.7 });
  const presence = useMotionValue(0);
  const opacity = useSpring(presence, { stiffness: 140, damping: 30 });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!finePointer || reduceMotion) return;
    const hero = heroRef.current;
    if (!hero) return;
    const move = (e: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      x.set(e.clientX - rect.left);
      y.set(e.clientY - rect.top);
      presence.set(1);
    };
    const leave = () => presence.set(0);
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
    };
  }, [heroRef, reduceMotion, x, y, presence]);

  if (!finePointer || reduceMotion) return null;

  return (
    <m.div aria-hidden className="absolute inset-0 pointer-events-none" style={{ opacity }}>
      {/* Same pattern as the map pin: framer owns the outer transform, a plain
          div does the centering so the two never fight over one property. */}
      <m.div className="absolute top-0 left-0" style={{ x: springX, y: springY }}>
        <div
          className="-translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--secondary) / 0.14), transparent 70%)",
            mixBlendMode: "screen",
          }}
        />
      </m.div>
    </m.div>
  );
}
