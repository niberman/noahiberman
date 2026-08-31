import type Lenis from "lenis";

// Same pattern as map-ref: the root ReactLenis publishes its instance here so
// the scattered scroll call sites share one scroll driver. Lenis itself honors
// prefers-reduced-motion (respectReducedMotion defaults to true), so these
// helpers never need their own gate.
let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Scroll the window to an element by id. Lenis subtracts the element's CSS
 * scroll-margin-top itself — do not pass it as offset or it applies twice. */
export function scrollToId(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  if (lenis) {
    // Cross-route hand-offs (Footer/Navigation/SectionRedirect navigate("/")
    // then scroll here) fire before Lenis's autoResize ResizeObserver catches
    // the taller homepage, so its cached scroll `limit` is still the previous
    // (short) page's. scrollTo clamps the target to that stale limit, landing
    // ~500px down instead of at the section. resize() recomputes the limit
    // synchronously from the live DOM first.
    lenis.resize();
    lenis.scrollTo(element);
  } else {
    element.scrollIntoView();
  }
}

export function scrollToTop(immediate = false) {
  if (lenis) {
    lenis.scrollTo(0, { immediate });
  } else {
    window.scrollTo(0, 0);
  }
}
