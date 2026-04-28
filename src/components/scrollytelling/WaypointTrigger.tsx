import { useEffect, useRef } from "react";
import { setActiveWaypointId } from "@/hooks/use-active-waypoint";
import type { MapWaypoint } from "@/data/waypoints";

/**
 * Invisible scroll-trigger spacer. Activates its waypoint when its
 * bounding box crosses the middle band of the viewport.
 *
 * The 70vh height balances "give the user time to read the card"
 * against "don't make the page feel endless." The rootMargin band
 * is intentionally narrow so transitions are decisive.
 */
export function WaypointTrigger({
  waypoint,
}: {
  waypoint: MapWaypoint;
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveWaypointId(waypoint.id);
          }
        }
      },
      // Active band: middle 20% of the viewport. As the trigger crosses
      // this band, it activates. With 70vh-tall triggers, only one is
      // ever active at a time.
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [waypoint.id]);

  return (
    <div
      ref={ref}
      data-waypoint-id={waypoint.id}
      className="relative h-[80vh] sm:h-[90vh] pointer-events-none"
      aria-hidden="true"
    />
  );
}
