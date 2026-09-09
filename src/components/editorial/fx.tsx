import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { animate, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import { useLenis } from "lenis/react";

/**
 * Motion helpers for the editorial pages (Work, Aviation, Now). Each mirrors
 * one helper in design_handoff_work_aviation_now/fx.js; the CSS side lives in
 * index.css under "Editorial pages". Everything is inert under
 * prefers-reduced-motion.
 */

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Delay and duration (seconds) for the CSS `ed-rise` entry. */
export const rise = (delay: number, duration = 1) =>
  ({ "--d": `${delay}s`, "--dur": `${duration}s` }) as CSSProperties;

type RevealTag = "div" | "h1" | "h2" | "h3" | "p" | "span" | "li" | "a";

/**
 * Scroll reveal: from blurred and 36px low to settled, once, when 12% of the
 * element is in view (minus an 8% bottom margin), after `delay` ms. The
 * transition itself is CSS (.ed-reveal) so the settled state is filter:none.
 */
export function Reveal({
  as = "div",
  delay = 0,
  className = "",
  children,
  ...rest
}: {
  as?: RevealTag;
  delay?: number;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12, margin: "0px 0px -8% 0px" });
  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`ed-reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Runs `tick` on every Lenis scroll frame, on resize, and once on mount. */
function useScrollTick(tick: () => void) {
  useLenis(tick, [tick]);
  useEffect(() => {
    tick();
    window.addEventListener("resize", tick);
    return () => window.removeEventListener("resize", tick);
  }, [tick]);
}

/**
 * Parallax: translateY(-c * factor * 200px) where c is the element's center
 * offset from the viewport center in viewport heights (-1..1).
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(factor: number) {
  const ref = useRef<T>(null);
  const y = useMotionValue(0);
  const reduce = useReducedMotion();
  const tick = useCallback(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // Subtract the applied offset so the rect read doesn't feed back.
    const c = (r.top - y.get() + r.height / 2 - vh / 2) / vh;
    y.set(-c * factor * 200);
  }, [factor, reduce, y]);
  useScrollTick(tick);
  return { ref, y };
}

/**
 * Timeline spine progress: scaleY = clamp((0.7 * vh - top) / height, 0, 1)
 * of the referenced list, so the line fills as the list scrolls through.
 */
export function useProgressLine<T extends HTMLElement = HTMLOListElement>() {
  const ref = useRef<T>(null);
  const scaleY = useMotionValue(0);
  const tick = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    scaleY.set(Math.min(1, Math.max(0, (window.innerHeight * 0.7 - r.top) / r.height)));
  }, [scaleY]);
  useScrollTick(tick);
  return { ref, scaleY };
}

/**
 * Cursor glow: spread onto the hovered container; a child `.ed-glow` overlay
 * reads --gx/--gy/--go. Mouse only, so touch scrolling never lights rows up.
 */
export const glow = {
  onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`);
    el.style.setProperty("--gy", `${e.clientY - r.top}px`);
    el.style.setProperty("--go", "1");
  },
  onPointerLeave(e: React.PointerEvent<HTMLElement>) {
    e.currentTarget.style.setProperty("--go", "0");
  },
};

/**
 * 3D tilt (±max degrees) that follows the cursor and lifts 3px; also sets
 * --mx/--my (%) for the card's own glow. Spread onto a plain element that
 * nothing else transforms.
 */
export function tilt(max: number) {
  return {
    onMouseEnter(e: React.MouseEvent<HTMLElement>) {
      e.currentTarget.style.transition = "transform .25s ease";
    },
    onMouseMove(e: React.MouseEvent<HTMLElement>) {
      if (reduced()) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1000px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-3px)`;
      el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
    },
    onMouseLeave(e: React.MouseEvent<HTMLElement>) {
      e.currentTarget.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
    },
  };
}

/**
 * Counts a stat like "562+" or "61.2" up from 0 over 1.8s (ease-out quart)
 * once it scrolls into view. Decimals and suffix come from the string itself;
 * a non-numeric value (the "…" loading placeholder) renders verbatim.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [text, setText] = useState(value);

  useEffect(() => {
    const match = value.match(/^(\d+(?:\.(\d+))?)(.*)$/);
    if (!match) {
      setText(value);
      return;
    }
    const target = parseFloat(match[1]);
    const decimals = match[2]?.length ?? 0;
    const fmt = (v: number) => v.toFixed(decimals) + match[3];
    if (!inView) {
      setText(fmt(0));
      return;
    }
    if (reduce) {
      setText(fmt(target));
      return;
    }
    const controls = animate(0, target, {
      duration: 1.8,
      ease: (p) => 1 - Math.pow(1 - p, 4),
      onUpdate: (v) => setText(fmt(v)),
    });
    return () => controls.stop();
  }, [value, inView, reduce]);

  return (
    <div ref={ref} className={className}>
      {text}
    </div>
  );
}
