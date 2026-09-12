import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Github } from "lucide-react";
import { SEO } from "@/components/SEO";
import { EditorialPage, EYEBROW, PAD_X } from "@/components/editorial/EditorialPage";
import { Reveal, rise } from "@/components/editorial/fx";
import { Magnetic } from "@/components/motion/Magnetic";
import { DemoLoop } from "@/components/projects/DemoLoop";
import { StatusBadge, UptimeDot, hexA } from "@/components/projects/projectBits";
import { projectBySlug, projects } from "@/data/projectsCatalog";
import { useDemoStatus } from "@/hooks/useDemoStatus";
import { isSsr, ssgLandingPath } from "@/lib/ssg";
import { projectDetailMeta } from "@/lib/routeMeta";
import NotFound from "./NotFound";

const PILL =
  "inline-flex items-center gap-2.5 rounded-full border px-6 py-3.5 text-sm font-medium tracking-[.02em] text-ed-ink backdrop-blur-[8px] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-light";

export default function ProjectDetail() {
  const { slug = "" } = useParams();
  const { pathname } = useLocation();
  const project = projectBySlug(slug);
  const health = useDemoStatus();

  if (!project) return <NotFound />;

  const animate = !isSsr && ssgLandingPath !== pathname;
  const meta = projectDetailMeta(project);
  const state = project.demoUrl ? health[project.slug] : undefined;
  const offline = state === "offline";
  const index = projects.findIndex((p) => p.slug === project.slug);
  const next = projects[(index + 1) % projects.length];

  return (
    <EditorialPage>
      <SEO
        title={meta.title}
        description={meta.description}
        image={`https://noahiberman.com${meta.ogImage}`}
        structuredData={meta.jsonLd}
      />

      <section className={`pt-[clamp(120px,16vh,170px)] pb-[clamp(48px,7vw,88px)] ${PAD_X}`}>
        <div className="mx-auto w-full max-w-[1200px]">
          <Link
            to="/projects"
            className={`${animate ? "ed-rise" : ""} inline-flex items-center gap-2 text-[13px] tracking-[.02em] text-ed-muted transition-colors hover:text-ed-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ed-light`}
            style={animate ? rise(0.02) : undefined}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All projects
          </Link>

          <div
            className={`${animate ? "ed-rise" : ""} mt-[clamp(28px,4vw,44px)] flex flex-wrap items-center gap-3`}
            style={animate ? rise(0.1) : undefined}
          >
            <span className={EYEBROW}>Project</span>
            <StatusBadge status={project.status} note={project.statusNote} />
            {state && project.demoUrl && (
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[.22em] text-ed-muted">
                <UptimeDot health={state} /> {state === "online" ? "Live" : "Offline"}
              </span>
            )}
          </div>

          <h1
            className={`${animate ? "ed-rise" : ""} mt-[clamp(14px,2vw,22px)] max-w-[14ch] text-balance font-editorial font-normal text-[clamp(44px,8vw,124px)] leading-[.92] tracking-[-.035em] text-ed-ink`}
            style={animate ? rise(0.18, 1.1) : undefined}
          >
            {project.displayName}
          </h1>
          <p
            className={`${animate ? "ed-rise" : ""} mt-[clamp(16px,2.2vw,26px)] max-w-[34ch] font-editorial italic text-[clamp(22px,2.8vw,40px)] leading-[1.08] text-ed-light`}
            style={animate ? rise(0.3) : undefined}
          >
            {project.oneLiner}
          </p>
        </div>
      </section>

      <section className={`pb-[clamp(48px,6vw,80px)] ${PAD_X}`}>
        <div
          className={`${animate ? "ed-rise" : ""} mx-auto w-full max-w-[1200px]`}
          style={animate ? rise(0.42, 1.1) : undefined}
        >
          <div
            className="overflow-hidden rounded-[24px] border border-white/[.08]"
            style={{ boxShadow: `0 32px 120px -48px ${hexA(project.accent, 0.35)}` }}
          >
            <DemoLoop poster={project.poster} loop={project.loop} alt={project.alt} mode="inview" eager priority />
          </div>
        </div>
      </section>

      <section className={`pb-[clamp(72px,10vw,140px)] ${PAD_X}`}>
        <div className="mx-auto w-full max-w-[1200px]">
          <Reveal
            as="p"
            className="max-w-[640px] text-[clamp(16px,1.3vw,19px)] font-light leading-[1.65] text-ed-body"
          >
            {project.paragraph}
          </Reveal>

          <Reveal delay={120} className="mt-[clamp(28px,4vw,44px)] flex flex-wrap items-center gap-4">
            {project.demoUrl && !offline && (
              <Magnetic strength={0.15} className="inline-block">
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={PILL}
                  style={{
                    borderColor: hexA(project.accent, 0.5),
                    backgroundColor: hexA(project.accent, 0.12),
                  }}
                >
                  Open the demo <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              </Magnetic>
            )}
            {project.demoUrl && offline && (
              <span className={`${PILL} cursor-default border-white/[.15] text-ed-muted`}>
                <UptimeDot health="offline" /> Demo offline
              </span>
            )}
            {project.repoUrl && (
              <Magnetic strength={0.15} className="inline-block">
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${PILL} border-[rgba(236,230,245,.25)] hover:border-ed-light hover:bg-[rgba(128,51,204,.15)]`}
                >
                  <Github className="h-4 w-4" aria-hidden /> Repository
                </a>
              </Magnetic>
            )}
            {project.writeupUrl && (
              <Magnetic strength={0.15} className="inline-block">
                <Link
                  to={project.writeupUrl}
                  className={`${PILL} border-[rgba(236,230,245,.25)] hover:border-ed-light hover:bg-[rgba(128,51,204,.15)]`}
                >
                  <BookOpen className="h-4 w-4" aria-hidden /> Read the case study
                </Link>
              </Magnetic>
            )}
          </Reveal>

          {project.shots.length > 0 && (
            <div className="mt-[clamp(56px,8vw,104px)]">
              <Reveal className={`mb-6 ${EYEBROW}`}>Screens</Reveal>
              <Reveal delay={100}>
                <div
                  className="ed-strip -mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2"
                  role="group"
                  aria-label={`${project.name} screenshots`}
                >
                  {project.shots.map((shot, i) => (
                    <img
                      key={shot}
                      src={shot}
                      alt={`${project.name} screen ${i + 1}`}
                      width={1200}
                      height={750}
                      loading="lazy"
                      decoding="async"
                      className="w-[min(78vw,540px)] shrink-0 snap-start rounded-[16px] border border-white/[.08] object-cover"
                    />
                  ))}
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </section>

      <section className={`border-t border-white/[.08] py-[clamp(56px,8vw,104px)] text-center ${PAD_X}`}>
        <Reveal className={`mb-5 ${EYEBROW}`}>Next</Reveal>
        <Reveal delay={80}>
          <Link
            to={`/projects/${next.slug}`}
            className="group inline-flex max-w-full items-center gap-4 font-editorial text-[clamp(34px,6vw,88px)] leading-[1] tracking-[-.03em] text-ed-ink transition-colors duration-300 hover:text-ed-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ed-light"
          >
            <span className="truncate">{next.name}</span>
            <ArrowRight
              className="h-[.55em] w-[.55em] shrink-0 transition-transform duration-300 group-hover:translate-x-1.5"
              aria-hidden
            />
          </Link>
        </Reveal>
      </section>
    </EditorialPage>
  );
}
