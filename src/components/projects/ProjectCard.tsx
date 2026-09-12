import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { DemoLoop } from "./DemoLoop";
import { StatusBadge, UptimeDot, hexA } from "./projectBits";
import { rise } from "@/components/editorial/fx";
import type { Project } from "@/data/projectsCatalog";
import type { DemoHealth } from "@/hooks/useDemoStatus";

/**
 * One grid card: poster that becomes its six second loop on hover or focus,
 * name, one line, status badge, uptime dot, and a Demo button that opens in a
 * new tab. The whole card is a stretched link to /projects/[slug]; the Demo
 * anchor sits above it. Entry uses the editorial rise unless the page landed
 * prerendered, in which case everything renders settled.
 */
export function ProjectCard({
  project,
  health,
  index,
  animate,
}: {
  project: Project;
  health?: DemoHealth;
  index: number;
  animate: boolean;
}) {
  const [intent, setIntent] = useState(false);
  const offline = health === "offline";
  const showDemo = Boolean(project.demoUrl) && !offline;

  return (
    <article
      className={`${animate ? "ed-rise" : ""} group relative`}
      style={animate ? rise(0.12 + index * 0.07, 0.9) : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && setIntent(true)}
      onPointerLeave={() => setIntent(false)}
      onFocusCapture={() => setIntent(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIntent(false);
      }}
    >
      <div
        className="pj-card relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/[.08] bg-white/[.02] transition-[border-color,box-shadow] duration-500 group-focus-within:border-ed-light/60 group-hover:shadow-[0_24px_80px_-32px_rgba(70,20,130,.55)]"
        style={{ "--card-accent": project.accent } as CSSProperties}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: `radial-gradient(560px circle at 50% 0%, ${hexA(project.accent, 0.1)}, transparent 65%)`,
          }}
        />
        <div className="relative overflow-hidden">
          <div className="transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035]">
            <DemoLoop
              poster={project.poster}
              loop={project.loop}
              alt={project.alt}
              mode="hover"
              active={intent}
              eager={index < 3}
              priority={index === 0}
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(4,2,8,.55)] to-transparent"
          />
        </div>

        <div className="relative z-[2] flex flex-1 flex-col gap-3 p-6 pb-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-editorial text-[clamp(24px,2vw,29px)] leading-[1.05] tracking-[-.01em] text-ed-ink transition-colors duration-300 group-hover:text-ed-light">
              {project.displayName}
            </h2>
            <StatusBadge status={project.status} note={project.statusNote} className="mt-1.5 shrink-0" />
          </div>
          <p className="text-[15px] font-light leading-[1.55] text-ed-body">{project.oneLiner}</p>

          <div className="mt-auto flex items-center gap-3 pt-2">
            {showDemo && (
              <a
                href={project.demoUrl!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="relative z-[2] inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium tracking-[.02em] text-ed-ink backdrop-blur-[8px] transition-colors duration-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-light"
                style={{
                  borderColor: hexA(project.accent, 0.4),
                  backgroundColor: hexA(project.accent, intent ? 0.14 : 0.06),
                }}
                aria-label={`Open the ${project.name} demo in a new tab`}
              >
                Demo <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            {offline && project.demoUrl && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[.12] px-4 py-2 text-[13px] font-medium tracking-[.02em] text-ed-muted">
                <UptimeDot health="offline" /> Offline
              </span>
            )}
            {health === "online" && showDemo && (
              <span className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[.2em] text-ed-muted">
                <UptimeDot health="online" /> Live
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-ed-muted transition-colors duration-300 group-hover:text-ed-light">
              Details
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>

        <Link
          to={`/projects/${project.slug}`}
          className="absolute inset-0 z-[1] rounded-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ed-light"
          aria-label={`${project.displayName}: ${project.oneLiner}`}
        />
      </div>
    </article>
  );
}
