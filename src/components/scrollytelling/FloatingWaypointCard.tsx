import { useLayoutEffect, useRef } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HERO_WAYPOINT, type MapWaypoint } from "@/data/waypoints";
import { useActiveWaypoint, useStackVisible } from "@/hooks/use-active-waypoint";
import { useMapRef } from "@/lib/map-ref";

const accentClasses: Record<NonNullable<MapWaypoint["accent"]>, { ring: string; eyebrow: string; pin: string }> = {
  aviation: {
    ring: "ring-secondary/40 shadow-[0_0_40px_-12px_rgba(168,85,247,0.6)]",
    eyebrow: "text-secondary",
    pin: "bg-secondary",
  },
  education: {
    ring: "ring-amber-300/40 shadow-[0_0_40px_-12px_rgba(252,211,77,0.55)]",
    eyebrow: "text-amber-300",
    pin: "bg-amber-300",
  },
  business: {
    ring: "ring-emerald-300/40 shadow-[0_0_40px_-12px_rgba(110,231,183,0.55)]",
    eyebrow: "text-emerald-300",
    pin: "bg-emerald-300",
  },
};

/** One timing curve for pin + every card variant so transitions read as one system. */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Staggered rise for the rows inside a card. Card instances remount per
 *  waypoint (key=waypoint.id), so these replay on every stop — the card
 *  composes itself instead of popping in as one block. */
const rise = (order: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.52, ease: EASE, delay: 0.08 + order * 0.06 },
});

/**
 * Card that follows the active waypoint's pin on desktop and pins to the
 * bottom of the viewport on mobile. Two separate DOM nodes — the desktop
 * card uses `map.project()` to track the pin during flyTo; mobile uses a
 * fixed bottom-sheet that's friendlier for small screens and thumbs.
 */
export function FloatingWaypointCard() {
  const waypoint = useActiveWaypoint();
  const stackVisible = useStackVisible();
  const map = useMapRef();
  // Hide whenever we're on hero or scrolled past the journey — the pin/card
  // would otherwise float over Contact/SEO content with no map underneath.
  const hidden = waypoint.id === HERO_WAYPOINT.id || !stackVisible;
  // Without a map (chunk still loading, or skipped on software GL) the
  // anchored card can't position itself — show every stop centered instead.
  const centered = waypoint.cardPlacement === "centered" || !map;

  return (
    <>
      {/* Both desktop variants stay mounted so switching placement mid-scroll
          exit-animates the old card instead of unmounting it abruptly. */}
      <DesktopCardAnchored waypoint={waypoint} hidden={hidden || centered} />
      <DesktopCardCentered waypoint={waypoint} hidden={hidden || !centered} />
      <MobileCard waypoint={waypoint} hidden={hidden} />
      <PinOverlay waypoint={waypoint} hidden={hidden || !map} />
    </>
  );
}

/** Pulsing dot on the map at the waypoint center. */
function PinOverlay({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  return (
    <AnimatePresence>
      {!hidden && <PinInstance key={waypoint.id} waypoint={waypoint} />}
    </AnimatePresence>
  );
}

/** One pin per waypoint. Each instance tracks its own map location, so an
 *  exiting pin fades out where it was instead of teleporting to the next stop. */
function PinInstance({ waypoint }: { waypoint: MapWaypoint }) {
  const map = useMapRef();
  const ref = useRef<HTMLDivElement>(null);
  const accent = accentClasses[waypoint.accent ?? "aviation"];

  useLayoutEffect(() => {
    if (!map) return;
    const update = () => {
      if (!ref.current) return;
      const p = map.project(waypoint.center);
      ref.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    };
    update();
    map.on("move", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("resize", update);
    };
  }, [map, waypoint]);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 z-[105] pointer-events-none will-change-transform"
      style={{ transform: "translate3d(-9999px,-9999px,0)" }}
    >
      {/* Centering stays on a plain div — framer owns the inner transform. */}
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <m.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="relative"
        >
          <span className={`absolute inset-0 m-auto h-3 w-3 rounded-full ${accent.pin} animate-ping opacity-70`} />
          <span className={`relative block h-3 w-3 rounded-full ${accent.pin} ring-2 ring-white/80 shadow-lg`} />
        </m.div>
      </div>
    </div>
  );
}

/** Desktop card anchored next to the pin via map.project(). Each waypoint gets
 *  its own instance so the outgoing card keeps tracking *its* pin while it
 *  fades — no teleporting to the next stop, no dead gap between cards. */
function DesktopCardAnchored({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  return (
    <AnimatePresence>
      {!hidden && <AnchoredCardInstance key={waypoint.id} waypoint={waypoint} />}
    </AnimatePresence>
  );
}

function AnchoredCardInstance({ waypoint }: { waypoint: MapWaypoint }) {
  const map = useMapRef();
  const ref = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 360, h: 200 });

  useLayoutEffect(() => {
    if (!map) return;

    // Measure once on mount (content is static per waypoint) for clamping.
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0) sizeRef.current = { w: rect.width, h: rect.height };
    }

    const update = () => {
      if (!ref.current) return;
      const p = map.project(waypoint.center);
      const { w, h } = sizeRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 32;
      const flipX = p.x > vw * 0.55;
      const flipY = p.y > vh * 0.6;
      let x = flipX ? p.x - w - gap : p.x + gap;
      let y = flipY ? p.y - h - gap : p.y + gap;
      // Clamp to viewport with a small margin
      x = Math.max(16, Math.min(vw - w - 16, x));
      y = Math.max(16, Math.min(vh - h - 16, y));
      ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    update();
    map.on("move", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("resize", update);
    };
  }, [map, waypoint]);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 z-[110] hidden sm:block w-[min(380px,32vw)] pointer-events-none will-change-transform"
      style={{ transform: "translate3d(-9999px,-9999px,0)" }}
    >
      <m.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        whileHover={{ scale: 1.018 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="pointer-events-auto"
      >
        <CardChrome waypoint={waypoint} />
      </m.div>
    </div>
  );
}

/** Bottom-center card for climax/CTA stops. Grid-stacks entering/exiting
 *  cards in the same cell so the crossfade never shifts layout. */
function DesktopCardCentered({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] hidden sm:grid items-end w-full max-w-lg px-4 pointer-events-none"
      aria-hidden={hidden}
    >
      <AnimatePresence>
        {!hidden && (
          <m.div
            key={waypoint.id}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            whileHover={{ scale: 1.018 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="pointer-events-auto col-start-1 row-start-1"
          >
            <CardChrome waypoint={waypoint} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Bottom-sheet card on mobile. Sits above the chat bubble at bottom-right.
 *  Same grid-stack crossfade — the old sheet fades while the new one rises. */
function MobileCard({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  return (
    <div
      className="sm:hidden fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),16px)] z-[110] px-3 pt-2 mb-16 pointer-events-none grid items-end"
      aria-hidden={hidden}
    >
      <AnimatePresence>
        {!hidden && (
          <m.div
            key={waypoint.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.48, ease: EASE }}
            className="pointer-events-auto col-start-1 row-start-1"
          >
            <CardChrome waypoint={waypoint} compact />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardChrome({ waypoint, compact }: { waypoint: MapWaypoint; compact?: boolean }) {
  const accent = accentClasses[waypoint.accent ?? "aviation"];
  const handleCta = () => {
    if (waypoint.cta?.event) {
      window.dispatchEvent(new CustomEvent(waypoint.cta.event));
    } else if (waypoint.cta?.href) {
      window.open(waypoint.cta.href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl ring-1 ${accent.ring} ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
      />
      <div className="relative">
        <m.div {...rise(0)} className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent.eyebrow}`}>
            <MapPin className="h-3 w-3" />
            {waypoint.code ?? "Location"}
          </span>
          {waypoint.year && (
            <span className="ml-auto text-[11px] font-medium text-white/50 tabular-nums">{waypoint.year}</span>
          )}
        </m.div>

        <m.div {...rise(1)} className="flex items-start gap-3">
          {waypoint.logo && (
            <img
              src={waypoint.logo}
              alt=""
              className="h-10 w-10 rounded-md object-contain bg-white/5 p-1 flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <h3 className={`font-display font-bold text-white leading-tight ${compact ? "text-lg" : "text-xl"}`}>
              {waypoint.title}
            </h3>
            {waypoint.subtitle && (
              <p className={`italic text-white/60 mt-0.5 ${compact ? "text-xs" : "text-sm"}`}>
                {waypoint.subtitle}
              </p>
            )}
          </div>
        </m.div>

        <m.p {...rise(2)} className={`mt-3 text-white/80 leading-relaxed ${compact ? "text-sm" : "text-[0.95rem]"}`}>
          {waypoint.body}
        </m.p>

        {waypoint.cta && (
          <m.div {...rise(3)}>
            <Button
              onClick={handleCta}
              size="sm"
              className="mt-4 w-full sm:w-auto bg-white text-black hover:bg-white/90 font-medium"
            >
              {waypoint.cta.label}
              {waypoint.cta.href && <ExternalLink className="ml-1.5 h-3.5 w-3.5" />}
            </Button>
          </m.div>
        )}
      </div>
    </div>
  );
}
