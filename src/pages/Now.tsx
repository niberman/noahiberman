import { useEffect, useState } from "react";
import { Waves, Snowflake, Mountain } from "lucide-react";
import { SEO } from "@/components/SEO";
import { CarillonEmbed } from "@/components/CarillonEmbed";
import { EditorialPage, EYEBROW, PAD_X } from "@/components/editorial/EditorialPage";
import { m } from "framer-motion";
import { Reveal, glow, rise, tilt, useParallax } from "@/components/editorial/fx";

const NOW_UPDATED = "September 2026";

const RIGHT_NOW = [
  {
    title: "Founder, Aviari LLC",
    body: "Building custom software and AI workflows for small businesses. Recent shipped work is on the Work page.",
  },
  {
    title: "Working toward the CFI",
    body: "Written tests done, lesson plans underway. Teaching other people to fly is the next rating.",
  },
  {
    title: "Flying out of Centennial (KAPA)",
    body: "Single and multi-engine, fixed-wing and helicopter, mountains whenever the weather allows.",
  },
  {
    title: "Fresh out of DU",
    body: "BA Applied Computing, minors in Entrepreneurship and Spanish, June 2026. Closed the summer with the BASE Camp accelerator final pitch.",
  },
];

const NEXT = [
  {
    title: "First clients for Aviari",
    body: "Conversations with operators across Denver's restaurant and small-business scene.",
  },
];

const FLAVOR = [
  {
    icon: Waves,
    title: "Whitewater kayaking",
    body: "Colorado rivers, as often as the season and the snowpack allow.",
  },
  {
    icon: Snowflake,
    title: "Skiing and snowboarding",
    body: "Love them both, snowboard on powder days. Ski on groomers.",
  },
  {
    icon: Mountain,
    title: "AIARE 2",
    body: "Avalanche certified through the AIARE 2 course, backcountry decision-making, not just resort laps.",
  },
];

/** Denver wall clock, HH:MM:SS, ticking once a second. */
function useDenverClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const tick = () => setTime(format.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const ROW =
  "relative grid grid-cols-1 items-start gap-[clamp(16px,3vw,48px)] overflow-hidden border-b border-white/[.12] py-[clamp(28px,4vw,52px)] md:grid-cols-[minmax(120px,.5fr)_minmax(0,1.2fr)_minmax(0,1.4fr)]";
const ROW_GLOW =
  "ed-glow pointer-events-none absolute inset-0 [--glow-alpha:.18] [--glow-fade:.5s] [--glow-size:640px]";
const ROW_TITLE =
  "relative text-balance font-editorial font-normal text-[clamp(28px,3.6vw,56px)] leading-[.98] tracking-[-.03em]";
const ROW_BODY = "relative text-[clamp(15px,1.25vw,18px)] font-light leading-[1.65] text-ed-body";
const STATUS = "inline-flex items-center gap-2 text-[11px] uppercase tracking-[.26em]";

export default function Now() {
  const time = useDenverClock();
  const title = useParallax<HTMLHeadingElement>(0.06);

  return (
    <EditorialPage>
      <SEO
        title="Now | Noah Berman"
        description="What Noah Berman is doing right now: founding Aviari, working toward a CFI, flying out of Centennial, and planning a move to Latin America."
      />
      <div className={`mx-auto max-w-[1200px] pt-[clamp(130px,18vh,190px)] pb-[clamp(96px,14vw,180px)] ${PAD_X}`}>
        <div
          className={`ed-rise mb-[clamp(24px,4vw,48px)] flex flex-wrap items-center justify-between gap-4 ${EYEBROW}`}
          style={rise(0.05)}
        >
          <span>Now</span>
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-2.5">
              <span className="ed-pulse h-[7px] w-[7px] rounded-full bg-ed-light" />
              Live
            </span>
            <span>
              Denver <span className="tabular-nums tracking-[.1em] text-ed-ink">{time}</span>
            </span>
            <span>Updated {NOW_UPDATED}.</span>
          </div>
        </div>

        <div className="mb-[clamp(56px,8vw,110px)] flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <m.h1
            ref={title.ref}
            style={{ y: title.y }}
            className="font-editorial font-normal text-[clamp(110px,24vw,360px)] leading-[.78] tracking-[-.06em]"
          >
            <span className="ed-rise inline-block" style={rise(0.15, 1.2)}>Now</span>
            <span className="ed-rise inline-block italic text-ed-light" style={rise(0.35, 1.2)}>.</span>
          </m.h1>
          <div className="pb-[clamp(8px,1.5vw,24px)]">
            <p
              className="ed-rise mb-3 font-editorial italic text-[clamp(30px,4vw,60px)] leading-none text-ed-light"
              style={rise(0.5)}
            >
              Ahora
            </p>
            <p className="ed-rise text-[clamp(17px,1.4vw,21px)] font-light leading-[1.5] text-ed-body" style={rise(0.65)}>
              What I am doing right now.
            </p>
          </div>
        </div>

        <div className="border-t border-white/[.12]">
          {RIGHT_NOW.map((item) => (
            <Reveal key={item.title} className={ROW} {...glow}>
              <div aria-hidden className={ROW_GLOW} />
              <div className="relative flex flex-col gap-2.5 pt-[.35em]">
                <span className={`${STATUS} text-ed-light`}>
                  <span className="ed-blink h-1.5 w-1.5 rounded-full bg-ed-light" />
                  Active
                </span>
              </div>
              <h2 className={ROW_TITLE}>{item.title}</h2>
              <p className={ROW_BODY}>{item.body}</p>
            </Reveal>
          ))}
          {NEXT.map((item) => (
            <Reveal key={item.title} className={ROW} {...glow}>
              <div aria-hidden className={ROW_GLOW} />
              <div className="relative flex flex-col gap-2.5">
                <span className="font-editorial italic text-[clamp(28px,3vw,44px)] leading-none tracking-[-.03em] text-ed-light">
                  Next
                </span>
                <span className={`${STATUS} text-ed-muted`}>
                  <span className="h-1.5 w-1.5 rounded-full border border-ed-light" />
                  Queued
                </span>
              </div>
              <h2 className={ROW_TITLE}>{item.title}</h2>
              <p className={ROW_BODY}>{item.body}</p>
            </Reveal>
          ))}
        </div>

        <Reveal
          as="h2"
          className="mt-[clamp(72px,10vw,140px)] mb-[clamp(32px,4vw,56px)] text-center font-editorial font-normal text-[clamp(44px,7vw,110px)] leading-[.92] tracking-[-.035em]"
        >
          Beyond <em className="text-ed-light">the cockpit</em>
        </Reveal>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-[clamp(24px,3vw,48px)] gap-y-[clamp(32px,4vw,56px)]">
          {FLAVOR.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div
                {...tilt(4)}
                className="h-full rounded-3xl border border-white/[.1] px-[clamp(16px,2vw,28px)] py-[clamp(24px,3vw,40px)] text-center backdrop-blur-[8px] [background:radial-gradient(400px_circle_at_var(--mx,50%)_var(--my,30%),rgba(128,51,204,.16),transparent_60%)]"
              >
                <Icon className="mx-auto mb-5 h-7 w-7 text-ed-light" />
                <h3 className="mb-2.5 font-editorial font-normal text-[clamp(26px,2.4vw,34px)] leading-none tracking-[-.02em]">
                  {title}
                </h3>
                <p className="text-[15px] font-light leading-[1.6] text-ed-body">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-[clamp(32px,4vw,56px)]">
          <CarillonEmbed />
        </Reveal>
      </div>
    </EditorialPage>
  );
}
