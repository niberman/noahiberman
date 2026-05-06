import { useEffect, useRef } from "react";
import { HERO_WAYPOINT, WAYPOINTS, type MapWaypoint } from "@/data/waypoints";
import { setActiveWaypointId, setStackVisible } from "@/hooks/use-active-waypoint";
import { WaypointTrigger } from "./WaypointTrigger";

/**
 * The "scroll spine" — a stack of invisible triggers, one per waypoint,
 * that drive the map camera and floating card.
 *
 * The active waypoint is whichever trigger (or the hero) has its center
 * closest to the viewport center on each scroll tick. Because triggers are
 * stacked sequentially and don't overlap, exactly one wins at any scroll
 * position — no race conditions, no flicker between waypoints, no hero
 * shouting down PPL during the transition.
 */
export function WaypointStack({ heroRef }: { heroRef: React.RefObject<HTMLElement> }) {
  const stackRef = useRef<HTMLDivElement>(null);

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
      const viewportCenter = vh / 2;

      let bestId = HERO_WAYPOINT.id;
      let bestDistance = Infinity;
      for (const t of targets) {
        const rect = t.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = t.dataset.waypointId ?? bestId;
        }
      }
      setActiveWaypointId(bestId);

      // Stack is "visible" while the spine has any vertical overlap with the
      // viewport. Drive this from scroll metrics instead of an IO so it stays
      // correct even in environments where IO is throttled (background tabs,
      // automation harnesses).
      const stackRect = stack.getBoundingClientRect();
      setStackVisible(stackRect.bottom > 0 && stackRect.top < vh);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
