import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Award, GraduationCap, Plane, Radio, Wrench } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useFlightStats } from "@/hooks/use-flight-stats";
import { aviationTimeline } from "@/data/aviationTimeline";
import { scrollToId } from "@/lib/lenis-ref";
import { EditorialPage, EYEBROW, PAD_X } from "@/components/editorial/EditorialPage";
import { m } from "framer-motion";
import { CountUp, Reveal, glow, rise, useParallax, useProgressLine } from "@/components/editorial/fx";
import { Magnetic } from "@/components/motion/Magnetic";

const RATINGS = [
  { icon: Plane, label: "Commercial Pilot, ASEL" },
  { icon: Plane, label: "Commercial Pilot, AMEL" },
  { icon: Radio, label: "Instrument Rating" },
  { icon: Award, label: "Private Pilot, Rotorcraft-Helicopter" },
  { icon: Wrench, label: "Wilderness First Responder (NOLS)" },
  { icon: GraduationCap, label: "CFI - in progress", outline: true },
];

const H2 = "font-editorial font-normal text-[clamp(44px,7vw,110px)] leading-[.92] tracking-[-.035em]";

function LiveStats() {
  const { stats, isLoading } = useFlightStats();
  const ledger = [
    { label: "total hours", value: stats.totalHoursDisplay },
    { label: "flights", value: stats.totalFlightsDisplay },
    { label: "airports", value: String(stats.uniqueAirports) },
    { label: "mountain hours", value: stats.mountainHours },
  ];
  return (
    <section className={`mx-auto max-w-[1300px] pt-[clamp(130px,18vh,190px)] ${PAD_X}`}>
      <div
        className={`ed-rise mb-[clamp(16px,2vw,28px)] flex flex-wrap items-center justify-between gap-4 ${EYEBROW}`}
        style={rise(0.05)}
      >
        <span>Aviation</span>
        <span className="flex items-center gap-2.5">
          <span className="ed-pulse h-[7px] w-[7px] rounded-full bg-ed-light" />
          Live from ForeFlight
        </span>
      </div>
      <div className="border-t border-white/[.12]">
        {ledger.map((st, i) => (
          <div
            key={st.label}
            {...glow}
            className="ed-rise relative flex flex-wrap items-baseline justify-between gap-[clamp(12px,3vw,40px)] overflow-hidden border-b border-white/[.12] py-[clamp(6px,1vw,14px)]"
            style={rise(0.15 + i * 0.12, 1.1)}
          >
            <div aria-hidden className="ed-glow pointer-events-none absolute inset-0 [--glow-alpha:.18] [--glow-fade:.5s] [--glow-size:600px]" />
            <CountUp
              value={isLoading ? "…" : st.value}
              className="relative font-editorial text-[clamp(72px,13vw,210px)] leading-[.9] tracking-[-.05em] tabular-nums"
            />
            <div className="relative pb-[clamp(8px,1.5vw,24px)] font-editorial italic text-[clamp(24px,3.4vw,52px)] leading-none text-ed-light">
              {st.label}
            </div>
          </div>
        ))}
      </div>
      <p className="ed-rise mt-4 text-[13px] tracking-[.04em] text-ed-muted" style={rise(0.9)}>
        Live numbers, synced from my ForeFlight logbook - never hand-edited, never stale.
      </p>
    </section>
  );
}

export default function Aviation() {
  const navigate = useNavigate();
  const title = useParallax<HTMLHeadingElement>(0.08);
  const spine = useProgressLine<HTMLOListElement>();

  return (
    <EditorialPage>
      <SEO
        title="Aviation | Noah Berman"
        description="Commercial pilot, single and multi-engine, instrument rated, rotorcraft-helicopter. The full flying record, synced live from ForeFlight."
      />

      <LiveStats />

      <section className={`flex min-h-[70vh] flex-col items-center justify-center py-[clamp(96px,14vw,180px)] text-center ${PAD_X}`}>
        <m.h1
          ref={title.ref}
          style={{ y: title.y }}
          className="font-editorial font-normal text-[clamp(72px,15vw,240px)] leading-[.88] tracking-[-.04em]"
        >
          <Reveal as="span" className="inline-block">The</Reveal>{" "}
          <Reveal as="span" delay={120} className="inline-block italic text-ed-light">flying</Reveal>
        </m.h1>
        <Reveal
          as="p"
          delay={220}
          className="mt-[clamp(18px,3vw,32px)] font-editorial italic text-[clamp(24px,3vw,44px)] leading-none text-ed-muted"
        >
          El vuelo
        </Reveal>
        <Reveal
          as="p"
          delay={300}
          className="mt-[clamp(28px,4vw,48px)] max-w-[560px] text-[clamp(17px,1.4vw,21px)] font-light leading-[1.55] text-ed-body"
        >
          Commercial pilot based at Centennial Airport (KAPA). Fixed-wing and rotorcraft, single and
          multi-engine, VFR and IFR.
        </Reveal>
      </section>

      <section className="overflow-hidden pb-[clamp(72px,10vw,140px)] text-center">
        <Reveal as="p" className={`mb-7 ${EYEBROW}`}>Certificates and ratings</Reveal>
        <div className="whitespace-nowrap">
          <div className="ed-marquee inline-flex gap-3.5 pr-3.5">
            {[...RATINGS, ...RATINGS].map(({ icon: Icon, label, outline }, i) => (
              <span
                key={i}
                aria-hidden={i >= RATINGS.length}
                className={`inline-flex items-center gap-3 rounded-full border px-6 py-3.5 font-editorial text-[clamp(20px,1.8vw,26px)] tracking-[-.01em] ${
                  outline
                    ? "border-[rgba(180,140,240,.7)] bg-[rgba(128,51,204,.1)] italic text-ed-light"
                    : "border-white/[.14] bg-white/[.02] text-ed-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px] text-ed-light" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={`mx-auto max-w-[1200px] pb-[clamp(72px,10vw,140px)] ${PAD_X}`}>
        <Reveal as="h2" className={`mb-[clamp(48px,7vw,96px)] text-center ${H2}`}>
          The record, <em className="text-ed-light">in order</em>
        </Reveal>
        <ol ref={spine.ref} className="relative">
          <div aria-hidden className="absolute inset-y-0 left-0 w-px -translate-x-1/2 bg-white/[.1] md:left-1/2" />
          <m.div
            aria-hidden
            style={{ scaleY: spine.scaleY }}
            className="absolute inset-y-0 left-0 ml-[-.5px] w-px origin-top bg-gradient-to-b from-ed-light to-ed-accent md:left-1/2"
          />
          {aviationTimeline.map((t, i) => {
            const left = i % 2 === 0;
            const inProgress = t.status === "in-progress";
            return (
              <li
                key={t.id}
                className="relative grid grid-cols-[1px_minmax(0,1fr)] items-start gap-x-[clamp(24px,4vw,64px)] py-[clamp(20px,3vw,40px)] md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]"
              >
                <Reveal
                  className={`col-start-2 row-start-1 pt-0.5 text-left font-editorial text-[clamp(40px,6vw,96px)] leading-[.9] tracking-[-.04em] ${
                    left ? "md:col-start-1 md:text-right" : "md:col-start-3 md:text-left"
                  } ${inProgress ? "text-ed-light" : "text-[rgba(236,230,245,.45)]"}`}
                >
                  {t.year}
                </Reveal>
                <span
                  aria-hidden
                  className={`col-start-1 row-start-1 mt-[clamp(8px,1.5vw,22px)] h-[11px] w-[11px] justify-self-center rounded-full border-2 border-ed-bg md:col-start-2 ${
                    inProgress
                      ? "ed-pulse bg-ed-light shadow-[0_0_16px_#b48cf0]"
                      : "bg-ed-accent shadow-[0_0_16px_#8033cc]"
                  }`}
                />
                <div
                  className={`col-start-2 row-start-2 min-w-0 text-left md:row-start-1 ${
                    left ? "md:col-start-3 md:text-left" : "md:col-start-1 md:text-right"
                  }`}
                >
                  <Reveal
                    as="h3"
                    delay={60}
                    className="mb-1.5 text-balance font-editorial font-normal text-[clamp(26px,3.2vw,48px)] leading-none tracking-[-.025em]"
                  >
                    {t.title}
                  </Reveal>
                  {t.subtitleEs && (
                    <Reveal
                      as="p"
                      delay={110}
                      className="mb-3.5 font-editorial italic text-[clamp(18px,2vw,28px)] leading-[1.1] text-ed-light"
                    >
                      {t.subtitleEs}
                    </Reveal>
                  )}
                  <Reveal
                    as="p"
                    delay={160}
                    className="inline-block max-w-[460px] text-[clamp(15px,1.2vw,17px)] font-light leading-[1.65] text-ed-body"
                  >
                    {t.body}
                  </Reveal>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={`pb-[clamp(96px,14vw,180px)] text-center ${PAD_X}`}>
        <Reveal as="h2" className={`mb-4 text-balance ${H2}`}>
          Every route, <em className="text-ed-light">on the map</em>
        </Reveal>
        <Reveal
          as="p"
          delay={80}
          className="mx-auto mb-[clamp(28px,4vw,44px)] max-w-[520px] text-[clamp(16px,1.3vw,19px)] font-light leading-[1.55] text-ed-body"
        >
          The homepage map flies through the whole network - pan, zoom, and explore it.
        </Reveal>
        <Reveal delay={160}>
          <Magnetic strength={0.3} className="inline-block">
            <button
              type="button"
              onClick={() => {
                navigate("/");
                setTimeout(() => scrollToId("follow-my-flight"), 120);
              }}
              className="inline-flex items-center gap-3.5 rounded-full bg-ed-accent px-9 py-5 text-base font-medium tracking-[.01em] text-white shadow-[0_0_80px_rgba(128,51,204,.5)] transition-colors hover:bg-ed-hover"
            >
              Open the flight map <ArrowUpRight className="h-[18px] w-[18px]" />
            </button>
          </Magnetic>
        </Reveal>
      </section>
    </EditorialPage>
  );
}
