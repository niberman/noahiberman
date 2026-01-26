import { SEO } from "@/components/SEO";
import { FlightLogLayout } from "@/components/FlightLogLayout";
import { BackgroundFlightMap } from "@/components/BackgroundFlightMap";
import { INoahChat } from "@/components/INoahChat";
import { MapScrollySection } from "@/components/MapScrollySection";
import {
  AboutMeContent,
  BlogSectionContent,
  ContactSection,
  FollowFlightSectionContent,
  VenturesSectionContent,
  WhatIDoContent,
} from "@/components/sections";
import { BilingualHeading } from "@/components/BilingualHeading";

const LOCATIONS = {
  kapa: { lat: 39.5701, lng: -104.8486, zoom: 12, pitch: 45, bearing: -10, durationMs: 1400 },
  du: { lat: 39.6780, lng: -104.9637, zoom: 14, pitch: 45, bearing: -20, durationMs: 1400 },
  rockies: { lat: 39.1178, lng: -106.4454, zoom: 9, pitch: 50, bearing: -15, durationMs: 1600 },
  bilbao: { lat: 43.2630, lng: -2.9350, zoom: 12, pitch: 45, bearing: -20, durationMs: 1600 },
  bucaramanga: { lat: 7.1193, lng: -73.1227, zoom: 12, pitch: 45, bearing: -10, durationMs: 1600 },
} as const;

export default function FlightLog() {
  return (
    <>
      <SEO
        title="Flight Log — Noah Berman"
        description="A glass cockpit flight log experience with map scrollytelling."
        canonical="https://noahiberman.com/flight-log"
      />

      <FlightLogLayout
        mapComponent={<BackgroundFlightMap />}
        chatComponent={<INoahChat />}
      >
        {/* Slot A: Hero */}
        <MapScrollySection flyTo={LOCATIONS.kapa}>
          <div id="home" className="space-y-3">
            <BilingualHeading
              english="Flight Log"
              spanish="Bitácora"
              as="h1"
              className="text-primary-foreground"
              variant="compact"
            />
            <p className="text-sm text-muted-foreground">
              A glass cockpit view of places, work, and trajectory.
            </p>
          </div>
        </MapScrollySection>

        {/* Slot B: Scrollable body */}
        <MapScrollySection flyTo={LOCATIONS.rockies}>
          <div id="ventures">
            <VenturesSectionContent variant="sidebar" />
          </div>
        </MapScrollySection>

        <MapScrollySection flyTo={LOCATIONS.bilbao}>
          <WhatIDoContent variant="sidebar" />
        </MapScrollySection>

        <MapScrollySection flyTo={LOCATIONS.du}>
          <div id="about">
            <AboutMeContent variant="sidebar" />
          </div>
        </MapScrollySection>

        <MapScrollySection flyTo={LOCATIONS.kapa}>
          <div id="blog">
            <BlogSectionContent />
          </div>
        </MapScrollySection>

        <MapScrollySection flyTo={LOCATIONS.kapa}>
          <div id="follow-my-flight">
            <FollowFlightSectionContent />
          </div>
        </MapScrollySection>

        <MapScrollySection flyTo={LOCATIONS.kapa}>
          <ContactSection variant="sidebar" />
        </MapScrollySection>

        <MapScrollySection flyTo={LOCATIONS.bucaramanga}>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-primary-foreground">
              Future Plans
            </h2>
            <p className="text-sm text-muted-foreground">
              Colombia (Bucaramanga) — building language, aviation, and software at scale.
            </p>
          </div>
        </MapScrollySection>
      </FlightLogLayout>
    </>
  );
}

