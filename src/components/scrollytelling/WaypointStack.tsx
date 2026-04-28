import { useEffect, useRef } from "react";
import { HERO_WAYPOINT, WAYPOINTS, type MapWaypoint } from "@/data/waypoints";
import { setActiveWaypointId, setStackVisible } from "@/hooks/use-active-waypoint";
import { WaypointTrigger } from "./WaypointTrigger";

/**
 * The "scroll spine" — a stack of invisible triggers, one per waypoint,
 * that drive the map camera and floating card. The hero acts as the
 * implicit first trigger above this stack via its own observer.
 */
export function WaypointStack({ heroRef }: { heroRef: React.RefObject<HTMLElement> }) {
  const stackRef = useRef<HTMLDivElement>(null);

  // Hero observer: when the hero is at least partially visible at the top,
  // the active waypoint is "hero" (resets the camera). This handles the
  // case where the user scrolls back up past the first waypoint trigger.
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
          setActiveWaypointId(HERO_WAYPOINT.id);
        }
      },
      { threshold: [0, 0.4, 0.6, 1] }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [heroRef]);

  // Stack visibility: when the spine is no longer in view (scrolled past into
  // Contact/SEO, or before the user has reached it), publish false so the
  // floating pin/card hide. Otherwise the pin would float over opaque content.
  useEffect(() => {
    if (!stackRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStackVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(stackRef.current);
    return () => {
      observer.disconnect();
      setStackVisible(false);
    };
  }, []);

  return (
    <div ref={stackRef} className="relative">
      {WAYPOINTS.map((wp, i) => (
        <WaypointTrigger key={wp.id} waypoint={wp} index={i} total={WAYPOINTS.length} />
      ))}
    </div>
  );
}

export type { MapWaypoint };
