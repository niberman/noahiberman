/**
 * Full-page film grain. All the behavior lives in index.css (.grain-overlay):
 * a tiled feTurbulence texture that boils in discrete steps on fine pointers
 * and sits static on touch devices and under reduced motion. The class also
 * bleeds the element past the viewport so the step translations never expose
 * an edge; z-[150] floats it over content and chrome alike at 4% opacity.
 */
export function GrainOverlay() {
  return (
    <div aria-hidden className="grain-overlay fixed z-[150] pointer-events-none" />
  );
}
