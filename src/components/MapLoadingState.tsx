import { useEffect, useState } from "react";

/**
 * Home defers the map behind a first-interaction gate and a 460 KB lazy chunk,
 * and Mapbox then paints a black canvas until its first frame — several
 * seconds of bare background that read as a broken page. This fills that whole
 * window: a faint sectional grid with routes drawing themselves and a jet
 * tracking the main one. Owned by Home (not the map) so it can cover the gate
 * and the chunk fetch too, and it's a static import for the same reason.
 */

const ROUTE_MAIN = "M -60 640 C 220 560 380 344 700 316 C 940 296 1080 208 1300 104";
const ROUTE_SECOND = "M 60 812 C 300 690 520 620 900 566";
const ROUTE_THIRD = "M 1280 664 C 1020 620 840 470 560 214";
const ROUTES = [ROUTE_MAIN, ROUTE_SECOND, ROUTE_THIRD];

/** Waypoints sitting on the routes above. */
const NODES: Array<[number, number]> = [
  [700, 316],
  [900, 566],
  [560, 214],
];

// ponytail: read once at render — nobody flips the OS motion setting during a
// two-second map load. The CSS animations honour the media query on their own.
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function MapLoadingState({ done }: { done: boolean }) {
  const [gone, setGone] = useState(false);
  const reduce = prefersReducedMotion();

  // Unmount after the fade so the looping animations stop costing frames.
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setGone(true), 800);
    return () => window.clearTimeout(timer);
  }, [done]);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-0 overflow-hidden bg-background pointer-events-none transition-opacity duration-700 ${
        done ? "opacity-0" : "opacity-100"
      }`}
    >
      <style>{`
        @keyframes mls-drift { to { transform: translate3d(-88px, -88px, 0); } }
        @keyframes mls-draw {
          0%   { stroke-dashoffset: 1; opacity: 0; }
          10%  { opacity: 0.9; }
          55%  { stroke-dashoffset: 0; opacity: 0.9; }
          80%  { stroke-dashoffset: 0; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes mls-ping {
          0%        { transform: scale(1); opacity: 0.7; }
          70%, 100% { transform: scale(3.4); opacity: 0; }
        }
        @keyframes mls-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }
        .mls-grid {
          background-image:
            repeating-linear-gradient(90deg, hsl(var(--secondary) / 0.26) 0 1px, transparent 1px 88px),
            repeating-linear-gradient(0deg, hsl(var(--secondary) / 0.18) 0 1px, transparent 1px 88px);
          -webkit-mask-image: radial-gradient(ellipse at 50% 55%, #000 8%, transparent 70%);
          mask-image: radial-gradient(ellipse at 50% 55%, #000 8%, transparent 70%);
          animation: mls-drift 18s linear infinite;
        }
        .mls-ghost { fill: none; stroke: hsl(var(--secondary) / 0.28); stroke-width: 1.5; stroke-dasharray: 6 12; }
        .mls-draw {
          fill: none;
          stroke: hsl(var(--secondary));
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          filter: drop-shadow(0 0 6px hsl(var(--secondary) / 0.55));
          animation: mls-draw 5.4s ease-in-out infinite;
        }
        .mls-ping { transform-box: fill-box; transform-origin: center; animation: mls-ping 2.8s ease-out infinite; }
        .mls-blink { animation: mls-blink 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mls-grid, .mls-ping, .mls-blink { animation: none; }
          .mls-draw { animation: none; stroke-dashoffset: 0; opacity: 0.9; }
        }
      `}</style>

      {/* Horizon glow so the frame never reads as flat black */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_58%,hsl(var(--secondary)/0.32),transparent_70%)]" />

      {/* Sectional graticule */}
      <div className="mls-grid absolute -inset-[12%]" />

      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        {ROUTES.map((d, i) => (
          <g key={d}>
            <path d={d} className="mls-ghost" />
            <path d={d} pathLength={1} className="mls-draw" style={{ animationDelay: `${i * 1.1}s` }} />
          </g>
        ))}

        {NODES.map(([x, y], i) => (
          <g key={`${x}-${y}`}>
            <circle
              cx={x}
              cy={y}
              r={5}
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth={1.5}
              className="mls-ping"
              style={{ animationDelay: `${i * 0.9}s` }}
            />
            <circle cx={x} cy={y} r={3.5} fill="hsl(var(--secondary))" opacity={0.85} />
          </g>
        ))}

        {/* Jet tracking the main route */}
        <g transform={reduce ? "translate(700 316) rotate(-18)" : undefined}>
          <path
            d="M 18 0 L -10 -10 L -5 0 L -10 10 Z"
            fill="hsl(var(--secondary))"
            stroke="hsl(var(--foreground) / 0.85)"
            strokeWidth={1}
          />
          {!reduce && (
            <animateMotion
              dur="7s"
              repeatCount="indefinite"
              rotate="auto"
              path={ROUTE_MAIN}
              calcMode="spline"
              keyPoints="0;1"
              keyTimes="0;1"
              keySplines="0.4 0 0.2 1"
            />
          )}
        </g>
      </svg>

      {/* Radio-call readout, above the container's bottom scrim and clear of the hero copy */}
      <div className="absolute bottom-24 sm:bottom-28 left-4 sm:left-6 flex items-center gap-2.5">
        <span className="mls-blink h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_hsl(var(--secondary))]" />
        <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-foreground/70">
          Requesting flight following
        </span>
      </div>
    </div>
  );
}
