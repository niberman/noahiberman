import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BilingualHeading } from "@/components/BilingualHeading";
import { Badge } from "@/components/ui/badge";
import { caseStudies } from "@/data/caseStudies";

const ACCENT_DOT: Record<string, string> = {
  aviation: "bg-sky-400",
  education: "bg-emerald-400",
  business: "bg-amber-400",
};

export default function CaseStudies() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background pt-24 sm:pt-28 pb-20 px-4 sm:px-6">
      <SEO
        title="Work | Noah Berman"
        description="Shipped work by Noah Berman: production platforms built alone and in use, across restaurant operations, aviation training, education, and AI infrastructure."
      />
      <div className="container mx-auto max-w-5xl">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BilingualHeading
            english="Things I've built"
            spanish="Lo que he construido"
            as="h1"
            className="mb-3"
          />
          <p className="text-muted-foreground text-lg max-w-2xl mb-12">
            Production software, not mockups. Every project here is shipped,
            and every one was built alone.
          </p>
        </m.div>

        <div className="grid gap-6 md:grid-cols-2">
          {caseStudies.map((study, i) => (
            <m.button
              key={study.id}
              type="button"
              onClick={() => navigate(`/work/${study.id}`)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 * i }}
              className="group text-left bg-card/50 border border-border/50 rounded-xl p-6 sm:p-7 shadow-elegant hover:border-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`h-2 w-2 rounded-full ${ACCENT_DOT[study.accent]}`} />
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {study.category}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary-foreground mb-1">
                {study.title}
              </h2>
              <p className="text-secondary font-display italic mb-4">{study.tagline}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                {study.summary}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {study.stack.slice(0, 4).map((tech) => (
                  <Badge key={tech} variant="secondary" className="font-normal">
                    {tech}
                  </Badge>
                ))}
              </div>
              <span className="inline-flex items-center text-sm text-secondary group-hover:gap-2 transition-all">
                Read the case study <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </m.button>
          ))}
        </div>
      </div>
    </main>
  );
}
