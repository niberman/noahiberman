import { useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { caseStudyById } from "@/data/caseStudies";
import { BODY, BackLink, CARD_TITLE, EYEBROW, PageHeader, PageShell } from "@/components/editorial/EditorialPage";
import { Reveal } from "@/components/editorial/fx";
import NotFound from "./NotFound";

export default function CaseStudyDetail() {
  const { id } = useParams<{ id: string }>();
  const study = id ? caseStudyById(id) : undefined;
  if (!study) return <NotFound />;

  return (
    <PageShell width="max-w-[1000px]">
      <SEO
        title={`${study.title} | Noah Berman`}
        description={study.summary}
      />
      <BackLink to="/work">All work</BackLink>

      {/* Same eyebrow, title, and tagline treatment as the row on /work. */}
      <PageHeader
        size="item"
        eyebrow={
          <span className="flex items-center gap-3">
            <span className="h-px w-8 bg-ed-accent" />
            {study.category}
          </span>
        }
        title={study.title}
        es={study.tagline}
      >
        <div className={`flex flex-wrap items-center gap-3 ${EYEBROW}`}>
          <span>{study.year}</span>
          <span aria-hidden="true">·</span>
          <span>{study.status}</span>
        </div>
      </PageHeader>

      <Reveal as="p" className={`mb-[clamp(48px,7vw,96px)] max-w-[680px] ${BODY}`}>
        {study.summary}
      </Reveal>

      <Reveal as="h2" className={`mb-[clamp(20px,3vw,32px)] ${CARD_TITLE}`}>
        What makes it interesting
      </Reveal>
      <ul className="mb-[clamp(40px,6vw,72px)] border-t border-white/[.12]">
        {study.highlights.map((h, i) => (
          <Reveal
            as="li"
            key={h}
            delay={i * 60}
            className="flex items-start gap-4 border-b border-white/[.12] py-[clamp(16px,2.2vw,24px)] text-[clamp(16px,1.3vw,19px)] font-light leading-[1.6] text-ed-body"
          >
            <span className="mt-[.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-ed-light" />
            {h}
          </Reveal>
        ))}
      </ul>

      <Reveal className="flex flex-wrap gap-2">
        {study.stack.map((tech) => (
          <Badge key={tech} variant="secondary">
            {tech}
          </Badge>
        ))}
      </Reveal>
    </PageShell>
  );
}
