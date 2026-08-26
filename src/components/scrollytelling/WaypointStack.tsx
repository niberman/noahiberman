import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { HERO_WAYPOINT, WAYPOINTS, type MapWaypoint } from "@/data/waypoints";
import { setActiveWaypointId, setStackVisible } from "@/hooks/use-active-waypoint";
import { WaypointTrigger } from "./WaypointTrigger";

/**
 * The "scroll spine" — a stack of invisible triggers, one per waypoint,
 * that drive the map camera and floating card.
 *
 * A waypoint takes over once its trigger's top crosses ACTIVATION_LINE. Because
 * triggers are stacked in DOM order and don't overlap, the last one to cross
 * wins — the handoff is monotonic in scroll direction, so there is exactly one
 * switch per boundary and no flicker between neighbours.
 */

/**
 * Fraction of the viewport height at which a trigger takes over. Kept high on
 * the page (30% down) so the hero has faded out before the first waypoint
 * claims the camera — matching centers instead handed off while the hero
 * headline was still half visible.
 */
const ACTIVATION_LINE = 0.3;

export function WaypointStack({ heroRef }: { heroRef: React.RefObject<HTMLElement> }) {
  const stackRef = useRef<HTMLDivElement>(null);

  // Lenis emits one scroll event per rAF tick (for smoothed, native, and
  // reduced-motion scrolling alike), so it replaces the old window scroll
  // listener plus manual rAF coalescing as the single scroll source.
  const updateRef = useRef<(() => void) | null>(null);
  useLenis(() => updateRef.current?.());

  useEffect(() => {
    const stack = stackRef.current;
    const hero = heroRef.current;
    if (!stack || !hero) return;

    hero.dataset.waypointId = HERO_WAYPOINT.id;

    let frame = 0;
    const update = () => {
      frame = 0;
      const triggers = stack.querySelectorAll<HTMLElement>("[data-waypoint-id]");
      const targets: HTMLElement[] = [hero, ...triggers];
      const vh = window.innerHeight;
      const line = vh * ACTIVATION_LINE;

      let activeId = HERO_WAYPOINT.id;
      for (const t of targets) {
        if (t.getBoundingClientRect().top <= line) {
          activeId = t.dataset.waypointId ?? activeId;
        }
      }
      setActiveWaypointId(activeId);

      // Stack is "visible" while the spine has any vertical overlap with the
      // viewport. Drive this from scroll metrics instead of an IO so it stays
      // correct even in environments where IO is throttled (background tabs,
      // automation harnesses).
      const stackRect = stack.getBoundingClientRect();
      setStackVisible(stackRect.bottom > 0 && stackRect.top < vh);
    };

    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    updateRef.current = update;

    // First measure waits two frames: the mount effect runs before first
    // paint, so a synchronous gBCR here forces the initial layout inside JS
    // (PageSpeed "forced reflow"). After first paint the same reads are free.
    // Store defaults (hero active, stack hidden) already match a fresh load.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(update);
    });
    window.addEventListener("resize", onResize);
    return () => {
      updateRef.current = null;
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
      setStackVisible(false);
    };
  }, [heroRef]);

  return (
    <div ref={stackRef} className="relative">
      {WAYPOINTS.map((wp, i) => (
        <WaypointTrigger key={wp.id} waypoint={wp} index={i} total={WAYPOINTS.length} />
      ))}
    </div>
  );
}

export type { MapWaypoint };
