import { m } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export function LaunchScreen({
  progress,
  reducedMotion,
}: {
  progress: number;
  reducedMotion: boolean;
}) {
  const pct = Math.round(clamp01(Math.max(progress, 0.08)) * 100);
  const progressScale = pct / 100;

  return (
    <m.div
      role="status"
      aria-live="polite"
      className="launch-screen fixed inset-0 z-[160] flex items-center justify-center overflow-hidden bg-black text-white"
      initial={reducedMotion ? false : { opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(18px)" }}
      transition={{ duration: reducedMotion ? 0.2 : 0.85, ease: EASE }}
    >
      <div className="launch-stars" aria-hidden />
      <div className="launch-glow" aria-hidden />

      <m.div
        className="relative z-10 mx-auto w-full max-w-xl px-6 text-center"
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 1.02 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <div className="launch-orb mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32">
          <span className="launch-ring launch-ring-1" aria-hidden />
          <span className="launch-ring launch-ring-2" aria-hidden />
          <span className="launch-sweep" aria-hidden />
          <picture className="relative z-10 block h-16 w-16 overflow-hidden rounded sm:h-20 sm:w-20">
            <source srcSet="/logo.webp" type="image/webp" />
            <img
              src="/logo.png"
              alt="Noah Berman logo"
              width={80}
              height={80}
              className="h-full w-full object-contain drop-shadow-glow"
            />
          </picture>
        </div>

        <p className="mb-3 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-secondary sm:text-xs">
          Flyover systems
        </p>
        <h2 className="mb-3 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Cleared for launch
        </h2>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">
          {pct < 99
            ? "Loading terrain, routes, and cockpit animation."
            : "Entering the flight path."}
        </p>

        <div className="mx-auto max-w-sm">
          <div className="mb-3 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.22em] text-white/45">
            <span>KAPA</span>
            <span>{pct}%</span>
            <span>FL180</span>
          </div>
          <div className="launch-progress h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-secondary via-fuchsia-300 to-white shadow-[0_0_24px_hsl(var(--secondary)/0.8)]"
              style={{ transform: `scaleX(${progressScale})` }}
            />
          </div>
        </div>
      </m.div>
    </m.div>
  );
}
