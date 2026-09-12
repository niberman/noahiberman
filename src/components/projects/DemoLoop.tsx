import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectLoop } from "@/data/projectsCatalog";

/**
 * Poster with a silent six second loop layered over it.
 *
 * hover mode (grid cards): the loop plays while the parent reports intent
 * (pointer over or focus within) on fine pointers, and while mostly in view
 * on coarse pointers, so phones see motion without a hover.
 * inview mode (detail pages): plays whenever mostly visible.
 *
 * The video element is only created after first intent, keeps preload="none",
 * and crossfades over the poster once frames are actually rendering. Under
 * prefers-reduced-motion nothing autoplays and the poster stands alone.
 */
export function DemoLoop({
  poster,
  loop,
  alt,
  mode,
  active = false,
  eager = false,
  priority = false,
  className = "",
}: {
  poster: string;
  loop: ProjectLoop | null;
  alt: string;
  mode: "hover" | "inview";
  /** Parent hover or focus intent (hover mode only). */
  active?: boolean;
  /** Load the poster eagerly (above the fold). */
  eager?: boolean;
  /** Mark as the likely LCP image (first card, detail hero). */
  priority?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [wanted, setWanted] = useState(false); // first intent: mount the <video>
  const [showing, setShowing] = useState(false); // frames rendering: crossfade
  const [env] = useState(() => ({
    reduced:
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    coarse:
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  }));

  const canPlay = Boolean(loop) && !env.reduced;
  const shouldPlay = canPlay && ((mode === "inview" || env.coarse) ? inView : active);

  // Observe visibility where it drives playback: always for inview mode,
  // and for hover mode on coarse pointers.
  useEffect(() => {
    if (!canPlay) return;
    if (mode === "hover" && !env.coarse) return;
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.55),
      { threshold: [0, 0.55, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canPlay, mode, env.coarse]);

  useEffect(() => {
    if (shouldPlay) setWanted(true);
    const video = videoRef.current;
    // On the first intent the <video> mounts a render after `wanted` flips,
    // so this effect also depends on `wanted` to catch it once it exists.
    if (!video) return;
    if (shouldPlay) {
      video.play().catch(() => {
        /* autoplay refused: poster remains */
      });
    } else {
      video.pause();
      setShowing(false);
    }
  }, [shouldPlay, wanted]);

  const onPlaying = useCallback(() => setShowing(true), []);

  return (
    <div ref={boxRef} className={`relative aspect-[16/10] overflow-hidden ${className}`}>
      <img
        src={poster}
        alt={alt}
        width={1200}
        height={750}
        loading={eager ? "eager" : "lazy"}
        {...({ fetchpriority: priority ? "high" : undefined } as Record<string, string | undefined>)}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {canPlay && wanted && loop && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out"
          style={{ opacity: showing ? 1 : 0 }}
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={onPlaying}
          disablePictureInPicture
        >
          <source src={loop.webm} type="video/webm" />
          <source src={loop.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
