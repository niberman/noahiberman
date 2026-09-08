import { m } from "framer-motion";
import { Waves, Snowflake, Trophy } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BilingualHeading } from "@/components/BilingualHeading";
import { CarillonEmbed } from "@/components/CarillonEmbed";

const NOW_UPDATED = "September 2026";

const RIGHT_NOW = [
  {
    title: "Founder, Aviari LLC",
    body: "Building custom software and AI workflows for small businesses. Recent shipped work is on the Work page.",
  },
  {
    title: "Working toward the CFI",
    body: "Written tests done, lesson plans underway. Teaching other people to fly is the next rating.",
  },
  {
    title: "Flying out of Centennial (KAPA)",
    body: "Single and multi-engine, fixed-wing and helicopter, mountains whenever the weather allows.",
  },
  {
    title: "Fresh out of DU",
    body: "BA Applied Computing, minors in Entrepreneurship and Spanish, June 2026. Closed the summer with the BASE Camp accelerator final pitch.",
  },
];

const NEXT = [
  {
    title: "Latin America",
    body: "Scouting a post-graduation base - Bucaramanga and Cordoba are the frontrunners. The work travels; the Spanish is already there.",
  },
  {
    title: "First clients for Aviari",
    body: "Conversations with operators across Denver's restaurant and small-business scene.",
  },
];

const FLAVOR = [
  {
    icon: Waves,
    title: "Whitewater kayaking",
    body: "Colorado rivers, as often as the season and the snowpack allow.",
  },
  {
    icon: Snowflake,
    title: "Skiing",
    body: "Aspen regular. X Games 2022 was a highlight.",
  },
  {
    icon: Trophy,
    title: "Athletic Club de Bilbao",
    body: "Member since my year in Bilbao. San Mames is a second home.",
  },
];

export default function Now() {
  return (
    <main className="min-h-screen bg-background pt-24 sm:pt-28 pb-20 px-4 sm:px-6">
      <SEO
        title="Now | Noah Berman"
        description="What Noah Berman is doing right now: founding Aviari, working toward a CFI, flying out of Centennial, and planning a move to Latin America."
      />
      <div className="container mx-auto max-w-3xl">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BilingualHeading english="Now" spanish="Ahora" as="h1" className="mb-3" />
          <p className="text-muted-foreground text-lg mb-2">
            What I am doing right now.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-12">Updated {NOW_UPDATED}.</p>
        </m.div>

        <div className="space-y-4 mb-14">
          {RIGHT_NOW.map((item, i) => (
            <m.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 * i }}
              className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 shadow-elegant"
            >
              <h2 className="font-semibold text-primary-foreground mb-1">{item.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{item.body}</p>
            </m.div>
          ))}
        </div>

        <m.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xl font-semibold text-primary-foreground mb-4"
        >
          Next
        </m.h2>
        <div className="space-y-4 mb-14">
          {NEXT.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 shadow-elegant"
            >
              <h3 className="font-semibold text-primary-foreground mb-1">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <m.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xl font-semibold text-primary-foreground mb-4"
        >
          Beyond the cockpit
        </m.h2>
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          {FLAVOR.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border/50 bg-card/50 p-5 shadow-elegant"
            >
              <Icon className="h-5 w-5 text-secondary mb-2" />
              <h3 className="font-semibold text-primary-foreground text-sm mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <CarillonEmbed />
      </div>
    </main>
  );
}
