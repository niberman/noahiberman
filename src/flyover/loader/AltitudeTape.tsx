import { useEffect, useState } from "react";

/**
 * Loading overlay for the flyover: an altimeter tape climbing from KAPA field
 * elevation to 18,000 ft as assets load. Confined to the hero (portal'd into
 * #home by FlyoverBackground), above the poster, below the z-10 copy.
 * On `done` it settles at 18,000, fades 400 ms, then renders null.
 */

// ponytail: KAPA field elevation mirrored by hand from data/flyover.config.json
// (airports.KAPA.elevFt) — terrain.json's kapaElev is the same number ±1 ft and
// threading it through the loader just to seed a cosmetic tick strip isn't
// worth the plumbing.
const KAPA_FT = 5885;
const TOP_FT = 18000;
const PX_PER_FT = 18 / 100; // 18px per 100 ft
const BASE_TICK = Math.floor(KAPA_FT / 100) * 100;
const STRIP_H = (TOP_FT - BASE_TICK) * PX_PER_FT;

const TICKS: number[] = [];
for (let ft = BASE_TICK; ft <= TOP_FT; ft += 100) TICKS.push(ft);

const MASK = "linear-gradient(180deg, transparent, #000 18%, #000 82%, transparent)";

export function AltitudeTape({
  progress,
  done,
  reducedMotion,
}: {
  /** load fraction 0..1 */
  progress: number;
  /** true once the scene has its first frame — settle, fade, unmount */
  done: boolean;
  reducedMotion: boolean;
}) {
  const [stage, setStage] = useState<"run" | "settle" | "fade" | "gone">("run");

  useEffect(() => {
    if (!done) return;
    setStage("settle");
    const t1 = window.setTimeout(() => setStage("fade"), 700);
    const t2 = window.setTimeout(() => setStage("gone"), 1100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [done]);

  // Reduced motion: no tape at all — the poster crossfade is the whole show.
  if (reducedMotion || stage === "gone") return null;

  const alt = stage === "run" ? KAPA_FT + progress * (TOP_FT - KAPA_FT) : TOP_FT;
  // Strip top is pinned to the container's vertical center; shifting it up by
  // the current altitude's offset puts that value under the fixed chevron.
  const y = (TOP_FT - alt) * PX_PER_FT;

  return (
    <div
      aria-hidden
      className={`absolute inset-y-0 right-4 sm:right-6 z-[1] w-16 overflow-hidden pointer-events-none transition-opacity duration-[400ms] ${
        stage === "fade" ? "opacity-0" : "opacity-100"
      }`}
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    >
      <div
        className="absolute inset-x-0 top-1/2 will-change-transform"
        style={{
          height: STRIP_H,
          transform: `translate3d(0, ${-y}px, 0)`,
          transition:
            stage === "run"
              ? "transform 300ms linear"
              : // spring-ish overshoot into 18,000 for the settle
                "transform 700ms cubic-bezier(0.34, 1.3, 0.64, 1)",
        }}
      >
        {TICKS.map((ft) => {
          const major = ft % 500 === 0;
          return (
            <div key={ft} className="absolute inset-x-0" style={{ top: (TOP_FT - ft) * PX_PER_FT }}>
              <span
                className={`absolute right-0 top-0 h-px ${
                  major ? "w-3 bg-primary-foreground/50" : "w-1.5 bg-primary-foreground/25"
                }`}
              />
              {major && (
                <span className="absolute right-4 top-0 -translate-y-1/2 font-mono text-[11px] leading-none text-primary-foreground/60">
                  {ft.toLocaleString("en-US")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* fixed chevron pointing at the current value */}
      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-0 w-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-primary-foreground/70" />
    </div>
  );
}
