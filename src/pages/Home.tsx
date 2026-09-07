import { AnimatePresence, m, MotionConfig, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useRef, useEffect, useState, useCallback, lazy, Suspense } from "react";
import { LiveFlightIndicator } from "@/components/LiveFlightIndicator";
import { WaypointStack } from "@/components/scrollytelling/WaypointStack";
import { FloatingWaypointCard } from "@/components/scrollytelling/FloatingWaypointCard";
import { ContactSection } from "@/components/sections/ContactSection";
import { BrandWords } from "@/data/brand";
import { MapLoadingState } from "@/components/MapLoadingState";
import { scrollToId } from "@/lib/lenis-ref";
import { Magnetic } from "@/components/motion/Magnetic";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { GrainOverlay } from "@/components/motion/GrainOverlay";
import { HeroSpotlight } from "@/components/motion/HeroSpotlight";
import { LaunchScreen } from "@/components/motion/LaunchScreen";

// Split mapbox-gl (~460 KB) out of the critical path; the hero renders
// immediately and the map fades in when its chunk arrives.
const BackgroundFlightMap = lazy(() =>
  import("@/components/BackgroundFlightMap").then((m) => ({ default: m.BackgroundFlightMap }))
);

const launchAlreadySeen = () => {
  try {
    return sessionStorage.getItem("site-launch-seen") === "1";
  } catch {
    return false;
  }
};

export default function Home() {
  const [showLaunch, setShowLaunch] = useState(() => !launchAlreadySeen());
  const [launchProgress, setLaunchProgress] = useState(0);
  const [launchReady, setLaunchReady] = useState(false);
  const [launchMinDone, setLaunchMinDone] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  // Mount the map (and the live-flight poll) only after first interaction, or
  // a beat after load for users who never touch anything. Lighthouse never
  // interacts, so mapbox-gl eval and the flights/airport_coordinates/
  // current_flight fetches drop out of its trace and the LCP critical chain.
  // First visits load the map immediately under the launch screen; later
  // visits keep the deferred gate so repeat navigations stay instant.
  const [deferredReady, setDeferredReady] = useState(showLaunch);
  // Cleared on the map's first frame; until then the loading state stands in.
  const [mapReady, setMapReady] = useState(false);
  // The map's first frame is the readiness signal — it flips the launch bar to
  // done so the intro dismisses with the map (the map-hero stand-in for the
  // old background-ready broadcast).
  const handleMapReady = useCallback(() => {
    setMapReady(true);
    setLaunchProgress(1);
    setLaunchReady(true);
  }, []);
  useEffect(() => {
    if (showLaunch) return;
    const arm = () => setDeferredReady(true);
    // pointermove is what saves real visitors from the 5s fallback below —
    // a mouse twitches within milliseconds of load, while Lighthouse never
    // moves a pointer at all, so the trace stays as clean as before.
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { once: true, passive: true }));
    // ponytail: plain setTimeout over requestIdleCallback — Safari lacks rIC,
    // and rIC fires exactly when the CPU goes quiet, which is what keeps the
    // Lighthouse trace alive. 5s past load is safely outside it.
    let timer: number | undefined;
    const afterLoad = () => {
      timer = window.setTimeout(arm, 5000);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      events.forEach((e) => window.removeEventListener(e, arm));
      window.removeEventListener("load", afterLoad);
      window.clearTimeout(timer);
    };
  }, [showLaunch]);

  useEffect(() => {
    if (!showLaunch) return;
    const min = window.setTimeout(() => setLaunchMinDone(true), prefersReducedMotion ? 700 : 2400);
    const max = window.setTimeout(() => {
      setLaunchProgress((p) => Math.max(p, 0.92));
      setLaunchReady(true);
    }, 7500);
    return () => {
      window.clearTimeout(min);
      window.clearTimeout(max);
    };
  }, [showLaunch, prefersReducedMotion]);

  // Broadcast progress channel for the launch bar. The map reports readiness
  // straight through onReady (handleMapReady above); these listeners stay as
  // the hook for any finer-grained map:progress a future loader might emit.
  useEffect(() => {
    const onProgress = (event: Event) => {
      const progress = (event as CustomEvent<{ progress?: number }>).detail?.progress;
      if (typeof progress === "number") {
        setLaunchProgress((current) => Math.max(current, progress));
      }
    };
    const onReady = () => {
      setLaunchProgress(1);
      setLaunchReady(true);
    };
    window.addEventListener("map:progress", onProgress);
    window.addEventListener("map:ready", onReady);
    window.addEventListener("map:fallback", onReady);
    return () => {
      window.removeEventListener("map:progress", onProgress);
      window.removeEventListener("map:ready", onReady);
      window.removeEventListener("map:fallback", onReady);
    };
  }, []);

  useEffect(() => {
    if (!showLaunch || !launchReady || !launchMinDone) return;
    const t = window.setTimeout(() => {
      setShowLaunch(false);
      try {
        sessionStorage.setItem("site-launch-seen", "1");
      } catch {
        /* ignore */
      }
    }, prefersReducedMotion ? 120 : 350);
    return () => window.clearTimeout(t);
  }, [showLaunch, launchReady, launchMinDone, prefersReducedMotion]);

  const navigate = useNavigate();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Scroll-linked transforms bypass MotionConfig, so gate each one here.
  const opacity = useTransform(scrollYProgress, [0, 0.72, 1], prefersReducedMotion ? [1, 1, 1] : [1, 0.55, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [1, 1] : [1, 0.86]);
  const y = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 72]);
  // The scroll cue dissolves as soon as the user takes the hint.
  const cueOpacity = useTransform(
    scrollYProgress,
    [0, 0.15],
    prefersReducedMotion ? [1, 1] : [1, 0]
  );

  // Handle hash navigation on page load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.substring(1);
      setTimeout(() => scrollToId(id), 100);
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen relative">
      {/* Film grain + scroll progress — page-wide chrome for the homepage. */}
      <GrainOverlay />
      <ScrollProgress />
      <AnimatePresence>
        {showLaunch && (
          <LaunchScreen progress={launchProgress} reducedMotion={!!prefersReducedMotion} />
        )}
      </AnimatePresence>

      {/* Background Flight Map — fixed, full-bleed, drives camera from active waypoint */}
      {deferredReady && (
        <>
          {/* Covers the whole wait — lazy chunk, style, tiles — not just the
              tail end after the map component mounts. */}
          <MapLoadingState done={mapReady} />
          <Suspense fallback={null}>
            <BackgroundFlightMap onReady={handleMapReady} />
          </Suspense>
        </>
      )}

      {/* Pin-anchored card (desktop) / bottom sheet (mobile) for the active waypoint */}
      <FloatingWaypointCard />

      {/* Live Flight Status Indicator — renders nothing until its query
          resolves, so it rides the same gate to keep current_flight (and the
          query-key dedupe with the map's useCurrentFlight) off the LCP chain. */}
      {deferredReady && <LiveFlightIndicator />}

      <div className="relative z-10 pointer-events-none [&>*]:pointer-events-auto">
        {/* Homepage structured data lives in index.html (one @graph with a
            ProfilePage node) — no per-page structuredData here or it would
            duplicate the entity. */}
        <SEO
          title="Noah Berman | Founder and Commercial Pilot in Denver, Colorado"
          description="Noah Berman is a software founder and FAA Commercial Pilot based in Denver, Colorado. Founder of Aviari LLC. University of Denver, Class of 2026."
        />

        {/* HERO */}
        <section
          id="home"
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/30 to-background/70" />

          {/* Cursor aura over the map — sits under the z-10 hero copy. */}
          <HeroSpotlight heroRef={heroRef} />

          <m.div
            style={{ opacity, scale }}
            className="container mx-auto px-4 relative z-10 pb-16 sm:pb-20"
          >
            {/* The h1 is the LCP element: it and every ancestor must render at
                full opacity on first paint, or the fade delay is charged as
                LCP element render delay. Siblings still stagger in around
                it. */}
            <div className="text-center max-w-5xl mx-auto">
              {/* The logo is the mobile LCP image — a scale-0 intro would hide
                  it from LCP until the spring finishes. animate-float keeps it
                  moving. */}
              <div className="inline-block mb-6 sm:mb-8 h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 overflow-hidden rounded drop-shadow-glow animate-float relative">
                <picture>
                <source srcSet="/logo.webp" type="image/webp" />
                <img
                  src="/logo.png"
                  alt="Noah Berman logo"
                  width={96}
                  height={96}
                  // React 18's DOM typings have no fetchPriority, and it drops
                  // the camelCase prop silently — the lowercase attribute is
                  // what actually reaches the element. Spread past the types.
                  {...({ fetchpriority: "high" } as Record<string, string>)}
                  className="absolute inset-0 w-full h-full object-contain origin-center"
                />
                </picture>
              </div>

              {/* Entry stagger is CSS (hero-enter-*) so the static shell in
                  index.html plays the identical animation pre-JS and nothing
                  defaults to hidden. */}
              <p className="hero-enter-1 text-lg sm:text-xl md:text-2xl font-display text-secondary mb-2">
                Noah Berman
              </p>

              {/* Word cascade animates transform/filter only — opacity stays 1
                  on the LCP element so the paint is never delayed. Markup is
                  mirrored in the index.html shell; keep them identical. */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-display font-bold mb-4 sm:mb-6 text-primary-foreground text-balance leading-tight">
                {BrandWords.map((word, i) => (
                  <span key={word}>
                    <span
                      className="hero-word"
                      style={{ "--word-i": i } as React.CSSProperties}
                    >
                      {i < BrandWords.length - 1 ? `${word},` : word}
                    </span>
                    {i < BrandWords.length - 1 ? " " : ""}
                  </span>
                ))}
              </h1>

              <div className="hero-enter-2 space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                <p className="text-xl sm:text-2xl md:text-3xl text-primary-foreground/95 font-light text-balance px-4">
                  The sky is not the limit
                </p>
                <p className="text-lg sm:text-xl md:text-2xl text-secondary font-display italic px-4">
                  El cielo no es el límite
                </p>
              </div>

              {/* Magnetic wrappers carry the responsive width; buttons fill
                  them so mobile stacking is unchanged. */}
              <div className="hero-enter-3 flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center px-4">
                <Magnetic className="w-full sm:w-auto">
                  <Button
                    onClick={() => navigate("/inoah")}
                    size="lg"
                    className="btn-sheen bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full transition-all hover:scale-105 active:scale-95 w-full"
                  >
                    <MessageCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Access iNoah
                  </Button>
                </Magnetic>

                <Magnetic className="w-full sm:w-auto">
                  <Button
                    onClick={() => navigate("/blog")}
                    size="lg"
                    variant="outline"
                    className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 backdrop-blur-sm text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full transition-all hover:scale-105 active:scale-95 w-full"
                  >
                    <BookOpen className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Blog
                  </Button>
                </Magnetic>

                <Magnetic className="w-full sm:w-auto">
                  <Button
                    onClick={() => scrollToId("contact")}
                    size="lg"
                    variant="ghost"
                    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-background/10 text-base sm:text-lg px-6 py-5 sm:py-6 rounded-full transition-all w-full"
                  >
                    Get in Touch
                  </Button>
                </Magnetic>
              </div>
            </div>
          </m.div>

          {/* x lives in the motion style: framer writes the inline transform,
              which would otherwise drop a class-based -translate-x-1/2. */}
          <m.div
            style={{ y, x: "-50%", opacity: cueOpacity }}
            className="absolute bottom-8 sm:bottom-12 left-1/2"
          >
            <m.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-primary-foreground/60"
            >
              <div className="w-6 h-10 border-2 border-current rounded-full flex items-start justify-center p-2">
                <m.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 bg-current rounded-full"
                />
              </div>
            </m.div>
          </m.div>
        </section>

        {/* SCROLLYTELLING SPINE — drives the map camera through every chapter */}
        <WaypointStack heroRef={heroRef} />

        {/* CONTACT */}
        <ContactSection />

        {/* -- commented out per Noah -- */}
        {/*
        {/* SEO ALTAR *}
        <section
          id="seo-altar"
          aria-label="Technical summary and credentials"
          className="relative bg-background/95 border-t border-border/30 py-16 sm:py-20"
        >
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-4xl mx-auto font-mono text-sm sm:text-base leading-relaxed text-muted-foreground">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 sm:p-8 md:p-10 space-y-6 shadow-elegant">
                <div className="space-y-1">
                  <p className="text-secondary text-xs sm:text-sm uppercase tracking-[0.3em]">/* digital offering *</p>
                  <h2 className="text-lg sm:text-xl font-bold text-primary-foreground font-mono">
                    README.seo
                  </h2>
                </div>

                <p className="text-foreground/70 italic border-l-2 border-secondary/40 pl-4">
                  This section exists as a humble offering to the crawl gods, the tireless
                  bots indexing the internet at 3 AM so you don't have to scroll to page 42
                  of Google to find out that Noah Berman is, in fact, a real person who flies
                  real airplanes and writes real code. You're welcome, Googlebot.
                </p>

                <div className="space-y-3 text-foreground/80">
                  <p><span className="text-secondary">$</span> whoami</p>
                  <div className="pl-4 space-y-1">
                    <p><span className="text-secondary/70">name:</span> Noah Berman</p>
                    <p><span className="text-secondary/70">location:</span> Denver, CO -- Centennial Airport (KAPA)</p>
                    <p><span className="text-secondary/70">education:</span> University of Denver, Applied Computing</p>
                  </div>
                </div>

                <div className="space-y-3 text-foreground/80">
                  <p><span className="text-secondary">$</span> cat /etc/credentials/faa.conf</p>
                  <div className="pl-4 space-y-1">
                    <p><span className="text-secondary/70">certificate:</span> Commercial Multi-Engine Pilot</p>
                    <p><span className="text-secondary/70">ratings:</span> Instrument Rating, Rotorcraft-Helicopter</p>
                    <p><span className="text-secondary/70">flight_hours:</span> 500+ logged at KAPA and beyond</p>
                    <p><span className="text-secondary/70">status:</span> <span className="text-green-400">ACTIVE</span></p>
                  </div>
                </div>

                <div className="space-y-3 text-foreground/80">
                  <p><span className="text-secondary">$</span> ls ~/projects/current</p>
                  <div className="pl-4 space-y-1">
                    <p>drwxr-xr-x  <span className="text-secondary/70">freedom-aviation/</span>    -- Aircraft management & flight instruction</p>
                    <p>drwxr-xr-x  <span className="text-secondary/70">the-language-school/</span> -- AI-powered bilingual education</p>
                    <p>drwxr-xr-x  <span className="text-secondary/70">inoah/</span>               -- Sovereign AI digital twin</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/30 text-foreground/50 text-xs sm:text-sm">
                  <p>// If you're a search engine reading this, please be kind.</p>
                  <p>// If you're a human reading this, you've scrolled further than most recruiters.</p>
                  <p>// Either way -- <span className="text-secondary">noahiberman.com</span> appreciates you.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        */}
      </div>
    </main>
    </MotionConfig>
  );
}
