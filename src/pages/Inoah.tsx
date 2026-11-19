import { lazy, Suspense } from "react";
import { SEO } from "@/components/SEO";

// The shell is eager so the page paints instantly with a fixed-size card and
// nothing shifts when the conversation surface arrives inside it.
const InoahSurface = lazy(() => import("@/components/inoah/InoahSurface"));

function SurfaceSkeleton() {
  return (
    <div className="inoah-surface flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[var(--in-bg)] text-[var(--in-text)]">
      <div className="border-b border-white/10 bg-[var(--in-surface)] px-4 py-3">
        <p className="font-editorial text-[22px] font-normal leading-none tracking-[-.01em]">iNoah</p>
        <p className="mt-1 truncate text-[10px] uppercase tracking-[0.26em] text-[var(--in-muted)] max-[359px]:tracking-[0.12em]">
          <span className="max-[419px]:hidden">AI twin · </span>public notes only
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="inoah-orb short:hidden max-sm:!h-10 max-sm:!w-10" aria-hidden="true" />
        <p className="font-editorial text-[30px] font-normal leading-none tracking-[-.02em]">Ask me anything on file.</p>
      </div>
    </div>
  );
}

export default function Inoah() {
  return (
    <main className="min-h-screen">
      <SEO
        title="iNoah | Noah Berman's AI twin"
        description="Ask iNoah about Noah Berman's flying, ventures, and education. An AI built by Noah that answers from his public notes."
        canonical="https://noahiberman.com/inoah"
      />
      <section className="container mx-auto px-4 pt-24 pb-10 sm:pt-28 sm:pb-16">
        {/* The card fills what the section's padding leaves of the first
            screen (pt-24 + pb-10 = 8.5rem on phones, pt-28 + pb-16 = 11rem
            above), so the composer sits on the fold with no dead band under
            it. The floor is low enough that a 568px-tall phone still gets
            the whole card on screen. */}
        <div className="mx-auto h-[calc(100svh-8.5rem)] min-h-[440px] max-w-2xl sm:h-[calc(100svh-13rem)] sm:min-h-[540px]">
          <Suspense fallback={<SurfaceSkeleton />}>
            <InoahSurface variant="page" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
