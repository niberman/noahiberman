import { useEffect, useState } from "react";

export type DemoHealth = "online" | "offline";

/**
 * Daily uptime results for the demo links. A scheduled job pings every demo
 * URL and rewrites public/demo-status.json; the page reads that static file
 * so a dead demo renders as offline instead of a broken link. Missing file or
 * failed fetch simply renders no dots.
 */
export function useDemoStatus(): Record<string, DemoHealth> {
  const [map, setMap] = useState<Record<string, DemoHealth>>({});
  useEffect(() => {
    let alive = true;
    fetch("/demo-status.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data && typeof data.status === "object") setMap(data.status);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return map;
}
