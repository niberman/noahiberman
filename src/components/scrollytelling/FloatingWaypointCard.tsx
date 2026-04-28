import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

/**
 * Card that follows the active waypoint's pin on desktop and pins to the
 * bottom of the viewport on mobile. Two separate DOM nodes — the desktop
 * card uses `map.project()` to track the pin during flyTo; mobile uses a
 * fixed bottom-sheet that's friendlier for small screens and thumbs.
 */
export function FloatingWaypointCard() {
  const waypoint = useActiveWaypoint();
  const stackVisible = useStackVisible();
  // Hide whenever we're on hero or scrolled past the journey — the pin/card
  // would otherwise float over Contact/SEO content with no map underneath.
  const hidden = waypoint.id === HERO_WAYPOINT.id || !stackVisible;

  return (
    <>
      <DesktopCard waypoint={waypoint} hidden={hidden} />
      <MobileCard waypoint={waypoint} hidden={hidden} />
      <PinOverlay waypoint={waypoint} hidden={hidden} />
    </>
  );
}

/** Pulsing dot on the map at the waypoint center. */
function PinOverlay({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  const map = useMapRef();
  const ref = useRef<HTMLDivElement>(null);
  const accent = accentClasses[waypoint.accent ?? "aviation"];

  useEffect(() => {
    if (!map || hidden) return;
    const update = () => {
      if (!ref.current) return;
      const p = map.project(waypoint.center);
      ref.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    };
    update();
    map.on("move", update);
    map.on("render", update);
    return () => {
      map.off("move", update);
      map.off("render", update);
    };
  }, [map, waypoint, hidden]);

  if (hidden) return null;
  return (
    <div
      key={waypoint.id}
      ref={ref}
      className="fixed top-0 left-0 z-[105] pointer-events-none will-change-transform"
      style={{ transform: "translate3d(-9999px,-9999px,0)" }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <span className={`absolute inset-0 m-auto h-3 w-3 rounded-full ${accent.pin} animate-ping opacity-70`} />
        <span className={`relative block h-3 w-3 rounded-full ${accent.pin} ring-2 ring-white/80 shadow-lg`} />
      </div>
    </div>
  );
}

/** Desktop card. "anchored" placement tracks the pin via map.project();
 *  "centered" places it bottom-center of the viewport for climax/CTA stops. */
function DesktopCard({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  if (waypoint.cardPlacement === "centered") {
    return <DesktopCardCentered waypoint={waypoint} hidden={hidden} />;
  }
  return <DesktopCardAnchored waypoint={waypoint} hidden={hidden} />;
}

function DesktopCardAnchored({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  const map = useMapRef();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 200 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setSize({ w: rect.width, h: rect.height });
  }, [waypoint.id]);

  useEffect(() => {
    if (!map || hidden) return;
    const update = () => {
      if (!ref.current) return;
      const p = map.project(waypoint.center);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 32;
      const flipX = p.x > vw * 0.55;
      const flipY = p.y > vh * 0.6;
      let x = flipX ? p.x - size.w - gap : p.x + gap;
      let y = flipY ? p.y - size.h - gap : p.y + gap;
      // Clamp to viewport with a small margin
      x = Math.max(16, Math.min(vw - size.w - 16, x));
      y = Math.max(16, Math.min(vh - size.h - 16, y));
      ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    update();
    map.on("move", update);
    map.on("render", update);
    return () => {
      map.off("move", update);
      map.off("render", update);
    };
  }, [map, waypoint, size.w, size.h, hidden]);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 z-[110] hidden sm:block w-[min(380px,32vw)] pointer-events-none will-change-transform"
      style={{ transform: "translate3d(-9999px,-9999px,0)" }}
      aria-hidden={hidden}
    >
      <AnimatePresence mode="wait">
        {!hidden && (
          <motion.div
            key={waypoint.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto"
          >
            <CardChrome waypoint={waypoint} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DesktopCardCentered({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  return (
    <div
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] hidden sm:block w-full max-w-lg px-4 pointer-events-none"
      aria-hidden={hidden}
    >
      <AnimatePresence mode="wait">
        {!hidden && (
          <motion.div
            key={waypoint.id}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto"
          >
            <CardChrome waypoint={waypoint} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Bottom-sheet card on mobile. */
function MobileCard({ waypoint, hidden }: { waypoint: MapWaypoint; hidden: boolean }) {
  return (
    <div
      className="sm:hidden fixed inset-x-0 bottom-0 z-[110] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 pointer-events-none"
      aria-hidden={hidden}
    >
      <AnimatePresence mode="wait">
        {!hidden && (
          <motion.div
            key={waypoint.id}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto"
          >
            <CardChrome waypoint={waypoint} compact />
          </motion.div>
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
      className={`relative rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl ring-1 ${accent.ring} ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent.eyebrow}`}>
          <MapPin className="h-3 w-3" />
          {waypoint.code ?? "Location"}
        </span>
        {waypoint.year && (
          <span className="ml-auto text-[11px] font-medium text-white/50 tabular-nums">{waypoint.year}</span>
        )}
      </div>

      <div className="flex items-start gap-3">
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
      </div>

      <p className={`mt-3 text-white/80 leading-relaxed ${compact ? "text-sm" : "text-[0.95rem]"}`}>
        {waypoint.body}
      </p>

      {waypoint.cta && (
        <Button
          onClick={handleCta}
          size="sm"
          className="mt-4 w-full sm:w-auto bg-white text-black hover:bg-white/90 font-medium"
        >
          {waypoint.cta.label}
          {waypoint.cta.href && <ExternalLink className="ml-1.5 h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}
