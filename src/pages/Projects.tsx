import { useLocation } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { EditorialPage, EYEBROW, PAD_X } from "@/components/editorial/EditorialPage";
import { rise } from "@/components/editorial/fx";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { projects } from "@/data/projectsCatalog";
import { useDemoStatus } from "@/hooks/useDemoStatus";
import { isSsr, ssgLandingPath } from "@/lib/ssg";
import { projectsIndexMeta } from "@/lib/routeMeta";

export default function Projects() {
  const { pathname } = useLocation();
  // Prerendered HTML and the React takeover of it both render settled; entry
  // motion plays only on in-app navigation to a path that was not the one
  // this document was prerendered for.
  const animate = !isSsr && ssgLandingPath !== pathname;
  const health = useDemoStatus();
  const meta = projectsIndexMeta();

  return (
    <EditorialPage>
      <SEO
        title={meta.title}
        description={meta.description}
        image={`https://noahiberman.com${meta.ogImage}`}
        structuredData={meta.jsonLd}
      />

      <section className={`pt-[clamp(150px,20vh,220px)] pb-[clamp(40px,6vw,72px)] text-center ${PAD_X}`}>
        <p className={`${animate ? "ed-rise" : ""} mb-7 ${EYEBROW}`} style={animate ? rise(0.05) : undefined}>
          Projects
        </p>
        <h1 className="text-balance font-editorial font-normal text-[clamp(52px,10vw,150px)] leading-[.9] tracking-[-.035em] text-ed-ink">
          <span className={`${animate ? "ed-rise" : ""} inline-block`} style={animate ? rise(0.15, 1.2) : undefined}>
            Things
          </span>{" "}
          <span className={`${animate ? "ed-rise" : ""} inline-block`} style={animate ? rise(0.28, 1.2) : undefined}>
            you can
          </span>{" "}
          <span
            className={`${animate ? "ed-rise" : ""} inline-block italic text-ed-light`}
            style={animate ? rise(0.42, 1.2) : undefined}
          >
            try
          </span>
        </h1>
        <p
          className={`${animate ? "ed-rise" : ""} mt-[clamp(18px,2.5vw,30px)] font-editorial italic text-[clamp(22px,2.8vw,40px)] leading-none text-ed-muted`}
          style={animate ? rise(0.58) : undefined}
        >
          Pruébalo tú mismo
        </p>
        <p
          className={`${animate ? "ed-rise" : ""} mx-auto mt-[clamp(24px,3.5vw,40px)] max-w-[560px] text-[clamp(16px,1.3vw,19px)] font-light leading-[1.6] text-ed-body`}
          style={animate ? rise(0.72) : undefined}
        >
          Live demos of the things I build and run. Hover a card to see it move, open one to try it
          yourself.
        </p>
      </section>

      <section className={`pb-[clamp(96px,12vw,180px)] ${PAD_X}`} aria-label="Project demos">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.slug}
              project={project}
              health={project.demoUrl ? health[project.slug] : undefined}
              index={i}
              animate={animate}
            />
          ))}
        </div>
      </section>
    </EditorialPage>
  );
}
