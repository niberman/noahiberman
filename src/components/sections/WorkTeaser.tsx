import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BilingualHeading } from "@/components/BilingualHeading";
import { caseStudies } from "@/data/caseStudies";

/**
 * Homepage shortcut for hiring managers: the featured aviation work and a
 * resume link, between the flight-map story and the contact form.
 */
export function WorkTeaser() {
  const featured = caseStudies.filter((c) => c.featured);

  return (
    <section
      id="work-teaser"
      className="py-16 sm:py-20 md:py-24 lg:py-32 scroll-mt-24 relative bg-background/90 backdrop-blur-xs border-t border-white/[.08] [content-visibility:auto] [contain-intrinsic-size:auto_900px]"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="reveal-view max-w-3xl mx-auto mb-10 sm:mb-12 md:mb-16 text-center">
          <BilingualHeading english="Aviation software" spanish="Software de aviación" as="h2" className="mb-4" />
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
            I fly the airplanes and I write the software around them. These are the aviation pieces, the rest is on the Work page.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid gap-5 sm:gap-6 md:grid-cols-3">
          {featured.map((study) => (
            <Link
              key={study.id}
              to={`/work/${study.id}`}
              className="reveal-view group flex flex-col rounded-[24px] border border-white/[.12] bg-card/40 p-6 sm:p-7 transition-colors hover:border-ed-light/60 hover:bg-[rgba(128,51,204,.08)]"
            >
              <p className="mb-4 text-[11px] uppercase tracking-[.26em] text-ed-muted">{study.category}</p>
              <h3 className="mb-3 font-display font-normal text-[28px] leading-[1.05] tracking-[-.02em] text-primary-foreground">
                {study.title}
              </h3>
              <p className="mb-6 font-display italic text-lg leading-snug text-ed-light">{study.tagline}</p>
              <p className="mb-6 text-sm leading-relaxed text-foreground/80">{study.summary}</p>
              <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/90 group-hover:text-ed-light">
                Read more <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/work"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-8 py-3.5 text-base font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            All work <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/resume"
            className="inline-flex items-center justify-center rounded-full border border-primary-foreground/30 px-8 py-3.5 text-base font-medium text-primary-foreground transition-colors hover:border-ed-light"
          >
            Resume
          </Link>
        </div>
      </div>
    </section>
  );
}
