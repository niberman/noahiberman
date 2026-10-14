import { m } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { caseStudyById } from "@/data/caseStudies";
import NotFound from "./NotFound";

export default function CaseStudyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const study = id ? caseStudyById(id) : undefined;
  if (!study) return <NotFound />;

  return (
    <main className="min-h-screen bg-background pt-24 sm:pt-28 pb-20 px-4 sm:px-6">
      <SEO
        title={`${study.title} | Noah Berman`}
        description={study.summary}
      />
      <div className="container mx-auto max-w-3xl">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/work")}
            className="mb-8 -ml-3 text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> All work
          </Button>

          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">
            {study.category}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-normal tracking-[-0.03em] text-primary-foreground mb-2">
            {study.title}
          </h1>
          <p className="text-xl text-ed-light font-display italic mb-6">{study.tagline}</p>

          <div className="flex flex-wrap items-center gap-3 mb-10 text-sm text-muted-foreground">
            <span>{study.year}</span>
            <span aria-hidden="true">·</span>
            <span>{study.status}</span>
          </div>

          <p className="text-lg text-foreground/90 leading-relaxed mb-8">{study.summary}</p>

          <h2 className="text-2xl font-display font-normal text-primary-foreground mb-4">
            What I built
          </h2>
          <ul className="space-y-3 mb-10">
            {study.highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-foreground/85">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                {h}
              </li>
            ))}
          </ul>

          {study.stack.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              {study.stack.map((tech) => (
                <Badge key={tech} variant="secondary" className="font-normal">
                  {tech}
                </Badge>
              ))}
            </div>
          )}

          <div className="border-t border-white/[.08] pt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/resume"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-6 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
            >
              Resume <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:noah@noahiberman.com"
              className="inline-flex items-center justify-center rounded-full border border-[rgba(236,230,245,.25)] px-6 py-3 text-sm font-medium text-ed-ink transition-colors hover:border-ed-light"
            >
              noah@noahiberman.com
            </a>
          </div>

        </m.div>
      </div>
    </main>
  );
}
