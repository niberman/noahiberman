/**
 * Prerendered pages ship their markup in #root with a data-ssg attribute
 * naming the route (scripts/prerender.mjs sets it). React replaces the
 * children but never the container's attributes, so this survives mount and
 * tells a page whether this exact pathname arrived prerendered. Pages that
 * landed prerendered render entry states settled, so the React takeover is
 * pixel identical instead of restarting the CSS entry animations.
 */
export const ssgLandingPath: string | null =
  typeof document !== "undefined"
    ? document.getElementById("root")?.getAttribute("data-ssg") ?? null
    : "__ssr__";

export const isSsr = ssgLandingPath === "__ssr__";
