import { m } from "framer-motion";
import { Plane, Award, Wrench, Radio } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BilingualHeading } from "@/components/BilingualHeading";
import { Badge } from "@/components/ui/badge";
import { useFlightStats } from "@/hooks/use-flight-stats";
import { aviationTimeline } from "@/data/aviationTimeline";
import { scrollToId } from "@/lib/lenis-ref";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

function LiveStats() {
  const { stats, isLoading } = useFlightStats();
  const items = [
    { label: "Total hours", value: isLoading ? "..." : stats.totalHoursDisplay },
    { label: "Flights", value: isLoading ? "..." : stats.totalFlightsDisplay },
    { label: "Airports", value: isLoading ? "..." : String(stats.uniqueAirports) },
    { label: "Mountain hours", value: isLoading ? "..." : stats.mountainHours },
  ];
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-6 sm:p-8 mb-14 shadow-elegant">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-3xl sm:text-4xl font-bold text-primary-foreground font-display">
              {item.value}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
              {item.label}
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground/70 mt-6">
        Live numbers, synced from my ForeFlight logbook - never hand-edited, never stale.
      </p>
    </div>
  );
}

const RATINGS = [
  { icon: Plane, label: "Commercial Pilot, ASEL" },
  { icon: Plane, label: "Commercial Pilot, AMEL" },
  { icon: Radio, label: "Instrument Rating" },
  { icon: Award, label: "Private Pilot, Rotorcraft-Helicopter" },
  { icon: Wrench, label: "Wilderness First Responder (NOLS)" },
];

export default function Aviation() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background pt-24 sm:pt-28 pb-20 px-4 sm:px-6">
      <SEO
        title="Aviation | Noah Berman"
        description="Commercial pilot, single and multi-engine, instrument rated, rotorcraft-helicopter. The full flying record, synced live from ForeFlight."
      />
      <div className="container mx-auto max-w-4xl">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BilingualHeading
            english="The flying"
            spanish="El vuelo"
            as="h1"
            className="mb-3"
          />
          <p className="text-muted-foreground text-lg max-w-2xl mb-10">
            Commercial pilot based at Centennial Airport (KAPA). Fixed-wing and
            rotorcraft, single and multi-engine, VFR and IFR.
          </p>
        </m.div>

        <LiveStats />

        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-14"
        >
          <h2 className="text-xl font-semibold text-primary-foreground mb-4">
            Certificates and ratings
          </h2>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map(({ icon: Icon, label }) => (
              <Badge
                key={label}
                variant="secondary"
                className="font-normal py-1.5 px-3 text-sm"
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {label}
              </Badge>
            ))}
            <Badge variant="outline" className="font-normal py-1.5 px-3 text-sm border-secondary/50 text-secondary">
              CFI - in progress
            </Badge>
          </div>
        </m.div>

        <h2 className="text-xl font-semibold text-primary-foreground mb-8">
          The record, in order
        </h2>
        <ol className="relative border-l border-border/60 ml-2 space-y-10 mb-14">
          {aviationTimeline.map((item, i) => (
            <m.li
              key={item.id}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: 0.04 * i }}
              className="ml-6 relative"
            >
              <span
                className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background ${
                  item.status === "in-progress" ? "bg-secondary animate-pulse" : "bg-sky-400"
                }`}
              />
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                {item.year}
              </p>
              <h3 className="text-lg font-semibold text-primary-foreground">
                {item.title}
              </h3>
              {item.subtitleEs && (
                <p className="text-secondary/90 font-display italic text-sm mb-1">
                  {item.subtitleEs}
                </p>
              )}
              <p className="text-muted-foreground leading-relaxed max-w-xl">{item.body}</p>
            </m.li>
          ))}
        </ol>

        <div className="rounded-xl border border-border/50 bg-card/50 p-6 sm:p-8 text-center shadow-elegant">
          <h2 className="text-xl font-semibold text-primary-foreground mb-2">
            Every route, on the map
          </h2>
          <p className="text-muted-foreground mb-5">
            The homepage map flies through the whole network - pan, zoom, and explore it.
          </p>
          <Button
            onClick={() => {
              navigate("/");
              setTimeout(() => scrollToId("follow-my-flight"), 120);
            }}
            className="btn-sheen bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-8"
          >
            Open the flight map
          </Button>
        </div>
      </div>
    </main>
  );
}
