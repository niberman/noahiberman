import { Link, Navigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { EYEBROW, PageHeader, PageShell } from "@/components/editorial/EditorialPage";
import { Reveal, glow } from "@/components/editorial/fx";
import { Calendar, Clock, Loader2, MapPin, ArrowRight } from "lucide-react";
import { usePublicMeetingTypes } from "@/hooks/use-scheduling";

function locationLabel(locationType: string): string {
  if (locationType === "zoom") return "Video call";
  if (locationType === "phone") return "Phone";
  return "In person";
}

export default function BookLanding() {
  const { data, isLoading, error } = usePublicMeetingTypes();
  const meetings = data?.meeting_types ?? [];

  if (!isLoading && meetings.length === 1) {
    return <Navigate to={`/book/${meetings[0].slug}`} replace />;
  }

  return (
    <>
      <SEO
        title="Book a meeting"
        description="Choose a meeting type and pick a time that works for you."
      />

      <PageShell width="max-w-[960px]">
          <PageHeader
            align="center"
            eyebrow={<Calendar className="mx-auto h-6 w-6 text-ed-light" />}
            title="Book a meeting"
            intro="Select the kind of conversation you want. You will choose an available time on the next step."
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-ed-muted" />
            </div>
          ) : error ? (
            <p className="border-t border-white/[.12] py-12 text-center text-sm text-destructive">
              Could not load meeting types. Please try again later.
            </p>
          ) : meetings.length === 0 ? (
            <p className="border-t border-white/[.12] py-12 text-center text-[15px] font-light text-ed-body">
              No meetings are available to book right now. Reach out through the contact form
              instead.
            </p>
          ) : (
            // Ledger rows, as on Now: hairline-separated, glow on hover.
            <ul className="border-t border-white/[.12]">
              {meetings.map((mt, i) => (
                <Reveal
                  as="li"
                  key={mt.slug}
                  delay={i * 80}
                  {...glow}
                  className="relative flex flex-col gap-5 overflow-hidden border-b border-white/[.12] py-[clamp(24px,3.5vw,44px)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div aria-hidden className="ed-glow pointer-events-none absolute inset-0 [--glow-alpha:.18] [--glow-fade:.5s] [--glow-size:640px]" />
                  <div className="relative min-w-0">
                    <h2 className="font-editorial font-normal text-[clamp(28px,3.6vw,52px)] leading-none tracking-[-.03em]">
                      {mt.name}
                    </h2>
                    <div className={`mt-3 flex flex-wrap items-center gap-5 ${EYEBROW} tracking-[.2em]`}>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {mt.duration_min} min
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {locationLabel(mt.location_type)}
                      </span>
                    </div>
                    {mt.description ? (
                      <p className="mt-3 max-w-[520px] text-[15px] font-light leading-[1.6] text-ed-body">
                        {mt.description}
                      </p>
                    ) : null}
                  </div>
                  <Button asChild variant="outline" className="relative w-full shrink-0 sm:w-auto">
                    <Link to={`/book/${mt.slug}`}>
                      Choose time
                      <ArrowRight />
                    </Link>
                  </Button>
                </Reveal>
              ))}
            </ul>
          )}
      </PageShell>
    </>
  );
}
