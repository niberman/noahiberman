import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { caseStudies } from "@/data/caseStudies";
import { EditorialPage, EYEBROW, PAD_X } from "@/components/editorial/EditorialPage";
import { m } from "framer-motion";
import { Reveal, glow, rise, useParallax } from "@/components/editorial/fx";
import { Magnetic } from "@/components/motion/Magnetic";

export default function CaseStudies() {
  const navigate = useNavigate();
  const title = useParallax<HTMLHeadingElement>(0.08);

  return (
    <EditorialPage>
      <SEO
        title="Work | Noah Berman"
        description="Shipped work by Noah Berman: production platforms built alone and in use, across restaurant operations, aviation training, education, and AI infrastructure."
      />

      <section className={`flex min-h-[92vh] flex-col items-center justify-center pt-[140px] pb-[60px] text-center ${PAD_X}`}>
        <p className={`ed-rise mb-7 ${EYEBROW}`} style={rise(0.05)}>Work</p>
        <m.h1
          ref={title.ref}
          style={{ y: title.y }}
          className="text-balance font-editorial font-normal text-[clamp(64px,13vw,210px)] leading-[.9] tracking-[-.035em]"
        >
          <span className="ed-rise inline-block" style={rise(0.15, 1.2)}>Things</span>{" "}
          <span className="ed-rise inline-block" style={rise(0.3, 1.2)}>I've</span>{" "}
          <span className="ed-rise inline-block italic text-ed-light" style={rise(0.45, 1.2)}>built</span>
        </m.h1>
        <p
          className="ed-rise mt-[clamp(20px,3vw,36px)] font-editorial italic text-[clamp(24px,3vw,44px)] leading-none text-ed-muted"
          style={rise(0.65)}
        >
          Lo que he construido
        </p>
        <p
          className="ed-rise mt-[clamp(28px,4vw,48px)] max-w-[560px] text-[clamp(17px,1.4vw,21px)] font-light leading-[1.55] text-ed-body"
          style={rise(0.8)}
        >
          Production software, not mockups. Every project here is shipped, and every one was built alone.
        </p>
        <div
          className="ed-rise mt-[clamp(48px,8vh,96px)] flex flex-col items-center gap-2.5 text-[11px] uppercase tracking-[.3em] text-ed-muted"
          style={rise(1.1)}
        >
          <span>Scroll</span>
          <span className="h-12 w-px bg-gradient-to-b from-ed-light to-transparent" />
        </div>
      </section>

      {caseStudies.map((study, i) => {
        const left = i % 2 === 0;
        return (
          <section
            key={study.id}
            {...glow}
            onClick={() => navigate(`/work/${study.id}`)}
            className={`relative flex min-h-[78vh] cursor-pointer items-center overflow-hidden border-t border-white/[.08] py-[clamp(72px,10vw,140px)] ${PAD_X}`}
          >
            <div aria-hidden className="ed-glow pointer-events-none absolute inset-0" />
            <div
              className={`relative mx-auto flex w-full max-w-[1200px] flex-col ${
                left ? "items-start text-left" : "items-end text-right"
              }`}
            >
              <Reveal className="mb-[clamp(20px,3vw,36px)] flex items-center gap-3 text-xs uppercase tracking-[.28em] text-ed-muted">
                <span className="h-px w-8 bg-ed-accent" />
                <span>{study.category}</span>
              </Reveal>
              <Reveal
                as="h2"
                delay={80}
                className="mb-[clamp(14px,2vw,24px)] max-w-[16ch] text-balance font-editorial font-normal text-[clamp(48px,8vw,136px)] leading-[.92] tracking-[-.035em]"
              >
                {study.title}
              </Reveal>
              <Reveal
                as="p"
                delay={140}
                className="mb-[clamp(24px,3.5vw,44px)] max-w-[30ch] font-editorial italic text-[clamp(24px,3vw,42px)] leading-[1.05] text-ed-light"
              >
                {study.tagline}
              </Reveal>
              <Reveal
                as="p"
                delay={200}
                className="mb-[clamp(24px,3vw,40px)] max-w-[600px] text-[clamp(16px,1.3vw,19px)] font-light leading-[1.65] text-ed-body"
              >
                {study.summary}
              </Reveal>
              <Reveal delay={320}>
                <Magnetic strength={0.15} className="inline-block">
                  <Link
                    to={`/work/${study.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-3.5 rounded-full border border-[rgba(236,230,245,.25)] px-6 py-3.5 text-sm font-medium tracking-[.02em] text-ed-ink backdrop-blur-[8px] transition-colors hover:border-ed-light hover:bg-[rgba(128,51,204,.15)]"
                  >
                    Read the case study <ArrowRight className="h-4 w-4" />
                  </Link>
                </Magnetic>
              </Reveal>
            </div>
          </section>
        );
      })}
    </EditorialPage>
  );
}
