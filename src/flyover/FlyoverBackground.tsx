import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { createFlyoverScene } from "@/flyover/scene";
import type { FlyoverScene } from "./types";
import { loadAssets } from "./loader/assets";
import { AltitudeTape } from "./loader/AltitudeTape";
import { createDirector, type Director } from "./director";
import { getLenis } from "@/lib/lenis-ref";

/**
 * The logbook flyover — a fixed full-bleed WebGL canvas behind the page,
 * flown along the hero track by scroll. The hero's poster (#home::before,
 * see index.css) is the bottom layer from first paint; once the scene has a
 * frame we add .flyover-live to #home to fade the poster out over the canvas
 * (everything inside the z-10 content wrapper stacks above this z-0 canvas,
 * so the crossfade has to run poster-side).
 *
 * Any failure — no WebGL, missing assets, no DecompressionStream, 8 s without
 * a first frame — renders nothing and leaves the poster standing.
 */

const FAIL_MS = 8000;
const MIN_TAPE_MS = 600;

const publishProgress = (progress: number) => {
  window.dispatchEvent(new CustomEvent("flyover:progress", { detail: { progress } }));
};

const publishReady = (eventName: "flyover:ready" | "flyover:fallback") => {
  window.dispatchEvent(new Event(eventName));
};

function probeWebgl(): boolean {
  // Same probe-and-lose-context pattern as BackgroundFlightMap: software GL
  // (failIfMajorPerformanceCaveat) would jank the main thread for a scene
  // that is decorative — skip it there too. WebGL2 only: three r163+ dropped
  // WebGL1, so a 1-only device must keep the poster.
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
  if (!gl) return false;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

export default function FlyoverBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglOk] = useState(probeWebgl);
  // ponytail: #home is in the DOM before this ever mounts (static shell +
  // Home's own render) — one lookup on mount is fine.
  const [homeEl] = useState(() => document.getElementById("home"));
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "live" | "dead">("loading");
  const reducedMotion = !!useReducedMotion();
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  useEffect(() => {
    if (!webglOk) publishReady("flyover:fallback");
  }, [webglOk]);

  useEffect(() => {
    if (!webglOk) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dead = false;
    let scene: FlyoverScene | null = null;
    let director: Director | null = null;
    const timeouts: number[] = [];
    const cleanups: Array<() => void> = [];
    const later = (fn: () => void, ms: number) => {
      timeouts.push(window.setTimeout(fn, ms));
    };
    const teardown = () => {
      dead = true;
      timeouts.forEach(window.clearTimeout);
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
      director?.destroy();
      director = null;
      scene?.dispose();
      scene = null;
    };
    const fail = (err?: unknown) => {
      if (dead) return;
      if (err) console.warn("flyover: falling back to poster —", err);
      publishReady("flyover:fallback");
      teardown();
      setPhase("dead");
    };
    const failTimer = window.setTimeout(fail, FAIL_MS);
    timeouts.push(failTimer);
    const started = performance.now();

    (async () => {
      const mobile = window.matchMedia("(max-width: 640px)").matches;
      const reduced = reducedRef.current;

      const assets = await loadAssets(mobile, (f) => {
        if (!dead) {
          setProgress(f);
          publishProgress(f);
        }
      });
      if (dead) return;
      setProgress(0.7);
      publishProgress(0.7);

      scene = createFlyoverScene(canvas, assets, { mobile, reducedMotion: reduced });
      await scene.compile();
      if (dead) return;
      setProgress(0.9);
      publishProgress(0.9);
      scene.renderOnce();
      setProgress(1);
      publishProgress(1);
      window.clearTimeout(failTimer);

      // The tape gets at least MIN_TAPE_MS on screen before it settles.
      const wait = MIN_TAPE_MS - (performance.now() - started);
      if (wait > 0) await new Promise<void>((r) => later(r, wait));
      if (dead) return;

      // Crossfade: canvas opacity → 1 (visible below the hero immediately)
      // and the hero poster fades out above it. Tape settles + fades itself.
      homeEl?.classList.add("flyover-live");
      cleanups.push(() => homeEl?.classList.remove("flyover-live"));
      setPhase("live");
      publishReady("flyover:ready");

      // Director from the first frame on — the scene smooths raw t itself.
      director = createDirector(assets.heroMeta.fixes, (t) => {
        // debug/verification handle — the only runtime state the flyover exposes
        (window as { __flyoverT?: number }).__flyoverT = t;
        scene?.setT(t);
      });

      // Pause when the tab is hidden or the canvas is fully covered by the
      // opaque contact content (a viewport past the last fix's anchor).
      let visible = !document.hidden;
      let covered = false;
      let running = false;
      const apply = () => {
        const want = visible && !covered;
        if (want !== running) {
          running = want;
          scene?.setRunning(want);
        }
      };
      const fixEls = document.querySelectorAll<HTMLElement>("[data-fix]");
      const lastFix = fixEls[fixEls.length - 1] ?? null;
      const onScroll = () => {
        // anchorY + vh in fixed-coordinates: rect.top < -(1 - ACTIVATION_LINE)·vh
        covered = !!lastFix && lastFix.getBoundingClientRect().top < -0.7 * window.innerHeight;
        apply();
      };
      const onVis = () => {
        visible = !document.hidden;
        apply();
      };
      document.addEventListener("visibilitychange", onVis);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVis));
      const lenis = getLenis();
      if (lenis) {
        lenis.on("scroll", onScroll);
        cleanups.push(() => lenis.off("scroll", onScroll));
      } else {
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", onScroll));
      }
      // renderOnce too: setSize clears the buffer, and a paused loop (tab
      // hidden, canvas covered) would otherwise leave it black until the
      // next tick.
      const onResize = () => {
        scene?.resize();
        scene?.renderOnce();
      };
      window.addEventListener("resize", onResize);
      cleanups.push(() => window.removeEventListener("resize", onResize));

      // A GPU reset after the poster has faded would leave an opaque dead
      // canvas over the hero — fall back to the poster instead.
      const onCtxLost = () => fail(new Error("webgl context lost"));
      canvas.addEventListener("webglcontextlost", onCtxLost);
      cleanups.push(() => canvas.removeEventListener("webglcontextlost", onCtxLost));

      let seen = false;
      try {
        seen = sessionStorage.getItem("flyover-intro-seen") === "1";
      } catch {
        /* storage blocked — play the intro every visit */
      }
      if (!seen) {
        // Let the poster fade finish so the intro's rewind isn't hidden.
        await new Promise<void>((r) => later(r, 500));
        if (dead) return;
        running = true;
        scene.setRunning(true);
        await scene.startIntro();
        if (dead) return;
        try {
          sessionStorage.setItem("flyover-intro-seen", "1");
        } catch {
          /* ignore */
        }
      }
      // Seen path starts here directly — the scene constructs fully drawn.
      apply();
      onScroll();
    })().catch(fail);

    return teardown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglOk]);

  if (!webglOk || phase === "dead") return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 z-0 h-full w-full pointer-events-none transition-opacity duration-500"
        style={{ opacity: phase === "live" ? 1 : 0 }}
      />
      {homeEl &&
        createPortal(
          <AltitudeTape progress={progress} done={phase === "live"} reducedMotion={reducedMotion} />,
          homeEl
        )}
    </>
  );
}
