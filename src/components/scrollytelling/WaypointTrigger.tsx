import type { MapWaypoint } from "@/data/waypoints";

/**
 * Invisible scroll-trigger spacer. Adds vertical scroll height for one
 * waypoint and exposes its id via `data-waypoint-id` so the centralized
 * observer in WaypointStack can publish it as the active waypoint when the
 * spacer crosses the viewport's vertical center.
 *
 * The 130vh height balances "give the user time to read the card" against
 * "don't make the page feel endless." The `id` lets nav/footer hash links
 * scroll directly to a waypoint.
 */
export function WaypointTrigger({
  waypoint,
}: {
  waypoint: MapWaypoint;
  index: number;
  total: number;
}) {
  return (
    <div
      id={waypoint.id}
      data-waypoint-id={waypoint.id}
      data-fix={waypoint.id}
      className="relative h-[130vh] sm:h-[140vh] pointer-events-none scroll-mt-24"
      aria-hidden="true"
    />
  );
}
