import { lazy, Suspense } from "react";
import { SEO } from "@/components/SEO";

// The shell is eager so the page paints instantly with a fixed-size card and
// nothing shifts when the conversation surface arrives inside it.
const InoahSurface = lazy(() => import("@/components/inoah/InoahSurface"));

function SurfaceSkeleton() {
  return (
    <div className="inoah-surface flex h-full flex-col overflow-hidden rounded-[12px] border border-white/10 bg-[var(--in-bg)] text-[var(--in-text)]">
      <div className="border-b border-white/10 bg-[var(--in-surface)] px-4 py-3">
        <p className="text-[15px] font-semibold leading-tight tracking-tight">iNoah</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--in-muted)]">
          AI twin · public notes only
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="inoah-orb" aria-hidden="true" />
        <p className="text-lg font-semibold tracking-tight">Ask me anything on file.</p>
      </div>
    </div>
  );
}

export default function Inoah() {
  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="iNoah | Noah Berman's AI twin"
        description="Ask iNoah about Noah Berman's flying, ventures, and education. An AI built by Noah that answers from his public notes."
        canonical="https://noahiberman.com/inoah"
      />
      <section className="container mx-auto px-4 pt-24 pb-10 sm:pt-28 sm:pb-16">
        <div className="mx-auto h-[calc(100dvh-11rem)] min-h-[540px] max-w-2xl sm:h-[calc(100dvh-13rem)]">
          <Suspense fallback={<SurfaceSkeleton />}>
            <InoahSurface variant="page" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
