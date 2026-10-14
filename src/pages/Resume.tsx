import { Link } from "react-router-dom";
import { ArrowUpRight, Printer } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ROUTE_META } from "@/data/routeMeta";
import { EditorialPage, EYEBROW, PAD_X } from "@/components/editorial/EditorialPage";
import { useFlightStats } from "@/hooks/use-flight-stats";
import resume from "@/data/resume.json";

/**
 * Public resume. Content lives in src/data/resume.json so the build-time
 * prerender (scripts/prerender-routes.mjs) can ship the same text as static
 * HTML for crawlers and link previews. Flight time is never typed here: it is
 * read live from the nightly ForeFlight sync, same source as /aviation.
 */

const H2 = "font-editorial font-normal text-[clamp(30px,4vw,48px)] leading-none tracking-[-.02em] mb-6 print:text-[18pt] print:mb-2";
const SECTION = "border-t border-white/[.12] py-[clamp(32px,5vw,56px)] print:border-black/30 print:py-3";
const BODY = "text-[clamp(15px,1.2vw,17px)] font-light leading-[1.65] text-ed-body print:text-[10pt] print:leading-snug print:text-black";
const ITEM_TITLE = "text-[clamp(18px,1.6vw,22px)] font-medium text-ed-ink print:text-[11pt] print:text-black";
const META = "text-[13px] tracking-[.04em] text-ed-muted print:text-[9pt] print:text-black/70";

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 print:mt-1 print:space-y-0.5">
      {items.map((b) => (
        <li key={b} className={`flex items-start gap-3 ${BODY}`}>
          <span aria-hidden className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-ed-light print:bg-black" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function FlightTime() {
  const { stats, isLoading } = useFlightStats();
  if (isLoading || !stats.totalFlights) {
    return (
      <p className={BODY}>
        Live from my ForeFlight logbook on the <Link to="/aviation" className="underline decoration-ed-light/50 underline-offset-4">Aviation page</Link>.
      </p>
    );
  }
  return (
    <p className={BODY}>
      {stats.totalHoursDisplay} hours across {stats.totalFlightsDisplay} flights, read live from my ForeFlight logbook, which syncs to this site every night.
    </p>
  );
}

export default function Resume() {
  const c = resume.contact;
  return (
    <EditorialPage>
      <SEO title={ROUTE_META["/resume"].title} description={ROUTE_META["/resume"].description} />
      <article className={`mx-auto max-w-[920px] pt-[clamp(120px,16vh,170px)] pb-[clamp(72px,10vw,140px)] ${PAD_X} print:max-w-none print:p-0`}>
        <header className="mb-[clamp(32px,5vw,56px)] print:mb-3">
          <div className={`mb-6 flex flex-wrap items-center justify-between gap-4 ${EYEBROW} print:hidden`}>
            <span>Resume</span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(236,230,245,.25)] px-4 py-2 text-[12px] normal-case tracking-[.02em] text-ed-ink transition-colors hover:border-ed-light"
            >
              <Printer className="h-3.5 w-3.5" /> Print or save as PDF
            </button>
          </div>
          <h1 className="font-editorial font-normal text-[clamp(56px,10vw,128px)] leading-[.9] tracking-[-.04em] print:text-[28pt] print:text-black">
            {resume.name}
          </h1>
          <p className="mt-4 font-editorial italic text-[clamp(22px,2.6vw,34px)] leading-tight text-ed-light print:mt-1 print:text-[13pt] print:text-black">
            {resume.headline}
          </p>
          <p className={`mt-5 ${META} print:mt-1`}>
            {resume.location} | <a href={`mailto:${c.email}`} className="hover:text-ed-light">{c.email}</a> |{" "}
            <a href={`https://${c.site}`} className="hover:text-ed-light">{c.site}</a> |{" "}
            <a href={`https://${c.github}`} target="_blank" rel="noopener noreferrer" className="hover:text-ed-light">{c.github}</a> |{" "}
            <a href={`https://www.${c.linkedin}`} target="_blank" rel="noopener noreferrer" className="hover:text-ed-light">{c.linkedin}</a>
          </p>
          <p className={`mt-2 ${META} text-ed-ink print:mt-0.5`}>{resume.availability}</p>
          <p className={`mt-6 max-w-[68ch] ${BODY} print:mt-2`}>{resume.summary}</p>
        </header>

        <section className={SECTION}>
          <h2 className={H2}>Experience</h2>
          <div className="space-y-8 print:space-y-2">
            {resume.experience.map((e) => (
              <div key={e.org} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <p className={ITEM_TITLE}>
                    {e.org} <span className="text-ed-muted print:text-black/70">|</span> {e.title}
                  </p>
                  <p className={META}>{[e.place, e.dates].filter(Boolean).join(" | ")}</p>
                </div>
                <Bullets items={e.bullets} />
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>Selected projects</h2>
          <div className="space-y-8 print:space-y-2">
            {resume.projects.map((p) => (
              <div key={p.name} className="break-inside-avoid">
                <p className={ITEM_TITLE}>
                  {p.link ? (
                    <Link to={p.link} className="inline-flex items-center gap-1.5 hover:text-ed-light">
                      {p.name} <ArrowUpRight className="h-4 w-4 print:hidden" />
                    </Link>
                  ) : (
                    p.name
                  )}{" "}
                  <span className="text-ed-muted print:text-black/70">|</span>{" "}
                  <span className="font-light text-ed-body print:text-black">{p.kind}</span>
                </p>
                <Bullets items={p.bullets} />
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>Aviation</h2>
          <div className="grid gap-8 md:grid-cols-2 print:grid-cols-2 print:gap-3">
            <div className="break-inside-avoid">
              <p className={`${EYEBROW} mb-3 print:mb-1 print:text-black`}>Certificates and ratings</p>
              <Bullets items={resume.certificates} />
            </div>
            <div className="break-inside-avoid">
              <p className={`${EYEBROW} mb-3 print:mb-1 print:text-black`}>Flight time</p>
              <FlightTime />
              <p className={`${EYEBROW} mt-6 mb-3 print:mt-2 print:mb-1 print:text-black`}>Pilot in command in</p>
              <p className={BODY}>{resume.aircraft}</p>
            </div>
          </div>
          <div className="mt-8 break-inside-avoid print:mt-2">
            <p className={`${EYEBROW} mb-3 print:mb-1 print:text-black`}>Flight experience</p>
            <Bullets items={resume.flightExperience} />
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>Skills</h2>
          <dl className="space-y-2 print:space-y-0.5">
            {resume.skills.map((s) => (
              <div key={s.label} className={`flex flex-wrap gap-x-3 ${BODY}`}>
                <dt className="font-medium text-ed-ink print:text-black">{s.label}:</dt>
                <dd>{s.items}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>Education</h2>
          <div className="space-y-4 print:space-y-1">
            {resume.education.map((e) => (
              <div key={e.school} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 break-inside-avoid">
                <p className={BODY}>
                  <span className="font-medium text-ed-ink print:text-black">{e.school}</span> | {e.detail}
                </p>
                <p className={META}>{e.dates}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>Languages and additional</h2>
          <Bullets items={resume.additional} />
        </section>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row print:hidden">
          <a
            href={`mailto:${c.email}`}
            className="inline-flex items-center justify-center rounded-full bg-secondary px-7 py-3.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            Email me
          </a>
          <Link
            to="/work"
            className="inline-flex items-center justify-center rounded-full border border-[rgba(236,230,245,.25)] px-7 py-3.5 text-sm font-medium text-ed-ink transition-colors hover:border-ed-light"
          >
            See the work
          </Link>
        </div>
      </article>
    </EditorialPage>
  );
}
