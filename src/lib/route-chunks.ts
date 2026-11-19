/**
 * Loaders for the code-split public pages. App's lazy() routes and the nav's
 * intent prefetch both go through this table, so hovering (or touching) a nav
 * link warms exactly the chunk the route is about to ask for. import() is
 * memoised by the module system: calling a loader twice costs nothing.
 */
export const routeLoaders = {
  "/work": () => import("@/pages/CaseStudies"),
  "/aviation": () => import("@/pages/Aviation"),
  "/now": () => import("@/pages/Now"),
  "/blog": () => import("@/pages/Blog"),
  "/es": () => import("@/pages/Es"),
  "/book": () => import("@/pages/BookLanding"),
} as const;

type RoutePath = keyof typeof routeLoaders;

/** Start fetching a route's chunk ahead of the click. Unknown paths no-op. */
export function prefetchRoute(path: string) {
  const load = routeLoaders[path as RoutePath];
  // A failed prefetch is not an error: the real navigation retries the import
  // and main.tsx's vite:preloadError handler covers a stale deploy.
  if (load) void load().catch(() => undefined);
}
