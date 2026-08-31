import { getLenis } from "@/lib/lenis-ref";
import type { HeroFix } from "./types";

/**
 * Maps scrollY → hero-track parameter t. Anchors are the [data-fix] elements
 * in DOM order, each paired with its t from hero.json; between anchors t is
 * piecewise-linear, clamped to [0,1].
 */

/**
 * Matches WaypointStack's ACTIVATION_LINE so "camera reaches the fix" lands on
 * the same scroll position as "section takes over".
 */
const ACTIVATION_LINE = 0.3;

export interface Director {
  /** Recompute anchors (throttled to one per frame). */
  refresh(): void;
  destroy(): void;
}

export function createDirector(fixes: HeroFix[], onT: (t: number) => void): Director {
  let anchors: Array<{ y: number; t: number }> = [{ y: 0, t: 0 }];
  let lastT = -1;

  const emit = () => {
    const sy = window.scrollY;
    const a = anchors;
    let t: number;
    if (sy <= a[0].y) t = a[0].t;
    else if (sy >= a[a.length - 1].y) t = a[a.length - 1].t;
    else {
      let i = 1;
      while (a[i].y < sy) i++;
      t = a[i - 1].t + ((sy - a[i - 1].y) / (a[i].y - a[i - 1].y)) * (a[i].t - a[i - 1].t);
    }
    t = Math.min(1, Math.max(0, t));
    if (t !== lastT) {
      lastT = t;
      onT(t);
    }
  };

  const compute = () => {
    const byId = new Map(fixes.map((f) => [f.id, f.t]));
    const line = ACTIVATION_LINE * window.innerHeight;
    const next: Array<{ y: number; t: number }> = [{ y: 0, t: 0 }];
    for (const el of document.querySelectorAll<HTMLElement>("[data-fix]")) {
      const t = byId.get(el.dataset.fix ?? "");
      if (t === undefined) continue; // no matching fix — skip
      const y = el.getBoundingClientRect().top + window.scrollY - line;
      const prev = next[next.length - 1];
      // sanitize: both axes must strictly increase; drop violators
      if (y > prev.y && t > prev.t) next.push({ y, t });
    }
    anchors = next;
    emit();
  };

  let frame = 0;
  const refresh = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      compute();
    });
  };

  // Lenis emits once per rAF tick and is the page's single scroll driver when
  // mounted; the window listener is the no-Lenis fallback.
  const lenis = getLenis();
  if (lenis) lenis.on("scroll", emit);
  else window.addEventListener("scroll", emit, { passive: true });

  window.addEventListener("resize", refresh);
  window.addEventListener("orientationchange", refresh);
  document.fonts?.ready.then(refresh);
  // Document height moves when lazy content mounts — body resize covers it.
  const ro = new ResizeObserver(refresh);
  ro.observe(document.body);
  compute();

  return {
    refresh,
    destroy() {
      if (lenis) lenis.off("scroll", emit);
      else window.removeEventListener("scroll", emit);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    },
  };
}
