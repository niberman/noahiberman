import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plane, MapPin } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useRef, useEffect } from "react";
import { BackgroundFlightMap } from "@/components/BackgroundFlightMap";
import { LiveFlightIndicator } from "@/components/LiveFlightIndicator";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { WhatIDoContent } from "@/components/sections/WhatIDo";
import { AboutMeContent } from "@/components/sections/AboutMe";
import { VenturesSectionContent } from "@/components/sections/VenturesSection";
import { FollowFlightSectionContent } from "@/components/sections/FollowFlightSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { aboutContent, flightStats } from "@/data/about";
import { BrandWordsString } from "@/data/brand";

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle hash navigation on page load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Background Flight Map */}
      <BackgroundFlightMap />

      {/* Live Flight Status Indicator */}
      <LiveFlightIndicator />

      {/* Main Content - pointer-events-none allows map interaction, children re-enable */}
      <div className="relative z-10 pointer-events-none [&>*]:pointer-events-auto">
        <SEO
          title={`Noah Berman — ${BrandWordsString} | Aviation & Technology`}
          description="Commercial pilot, bilingual entrepreneur, and founder building Freedom Aviation, The Language School platform, and innovative aviation technology solutions. FAA Commercial Pilot with Instrument & Multi-Engine ratings."
          keywords="Noah Berman, commercial pilot, aviation, Freedom Aviation, flight instructor, bilingual entrepreneur, aviation technology, aircraft management, flight training, The Language School, aviation startup, Spanish-English entrepreneur, ATP-rated pilot, multi-engine pilot, helicopter pilot"
          structuredData={{
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Noah Berman — Home",
            "description": "Commercial pilot and entrepreneur building aviation and technology ventures",
            "url": "https://noahiberman.com/",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://noahiberman.com/"
                }
              ]
            }
          }}
        />

        {/* ========================================
            HERO SECTION (No expansion)
            ======================================== */}
        <section
          id="home"
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/80" />
          <motion.div
            style={{ opacity, scale }}
            className="container mx-auto px-4 relative z-10 pb-16 sm:pb-20"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
              className="text-center max-w-5xl mx-auto"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.3,
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                className="inline-block mb-6 sm:mb-8 h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 overflow-hidden rounded drop-shadow-glow animate-float relative"
              >
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="absolute inset-0 w-full h-full object-contain origin-center"
                />
              </motion.div>

              {/* Name */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-lg sm:text-xl md:text-2xl font-display text-secondary mb-2"
              >
                Noah Berman
              </motion.p>

              {/* Tagline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-display font-bold mb-4 sm:mb-6 text-primary-foreground text-balance leading-tight"
              >
                {BrandWordsString}
              </motion.h1>

              {/* Sub-tagline */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="space-y-2 sm:space-y-3 mb-6 sm:mb-8"
              >
                <p className="text-xl sm:text-2xl md:text-3xl text-primary-foreground/95 font-light text-balance px-4">
                  The sky is not the limit
                </p>
                <p className="text-lg sm:text-xl md:text-2xl text-secondary font-display italic px-4">
                  El cielo no es el límite
                </p>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center px-4"
              >
                {/* Primary: View Ventures */}
                <Button
                  onClick={() => scrollToSection("ventures")}
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  View Ventures <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                {/* Secondary: Follow My Flight */}
                <Button
                  onClick={() => {
                    scrollToSection("follow-my-flight");
                    // After scrolling, enable interactive map mode
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("enableFlightMapInteractive"));
                    }, 600);
                  }}
                  size="lg"
                  variant="outline"
                  className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 backdrop-blur-sm text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <Plane className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Follow My Flight
                </Button>

                {/* Tertiary: Get in Touch */}
                <Button
                  onClick={() => scrollToSection("contact")}
                  size="lg"
                  variant="ghost"
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-background/10 text-base sm:text-lg px-6 py-5 sm:py-6 rounded-full transition-all w-full sm:w-auto"
                >
                  Get in Touch
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            style={{ y }}
            className="absolute bottom-8 sm:bottom-12 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-primary-foreground/60"
            >
              <div className="w-6 h-10 border-2 border-current rounded-full flex items-start justify-center p-2">
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 bg-current rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ========================================
            WHAT I DO SECTION (Collapsible) - COMMENTED OUT
            ========================================
        <div className="relative bg-background/90 backdrop-blur-xs">
          <CollapsibleSection
            id="what-i-do"
            title="What I Do"
            subtitle="Lo Que Hago"
            collapsedContent={
              <p>
                Aviation, technology, entrepreneurship, and cultural connection — four pillars that define my work.
              </p>
            }
          >
            <WhatIDoContent />
          </CollapsibleSection>
        </div>
        */}

        {/* ========================================
            ABOUT ME SECTION (Collapsible)
            ======================================== */}
        <div id="about" className="relative bg-background/90 backdrop-blur-xs">
          <CollapsibleSection
            title="About Me"
            subtitle="Sobre Mí"
            collapsedContent={
              <p>{aboutContent.intro}</p>
            }
          >
            <AboutMeContent />
          </CollapsibleSection>
        </div>

        {/* ========================================
            VENTURES SECTION (Collapsible)
            ======================================== */}
        <div id="ventures" className="relative bg-background/90 backdrop-blur-xs">
          <CollapsibleSection
            title="Ventures"
            subtitle="Proyectos"
            collapsedContent={
              <p>I build and operate companies that combine aviation, technology, and education.</p>
            }
          >
            <VenturesSectionContent />
          </CollapsibleSection>
        </div>

        {/* ========================================
            FOLLOW MY FLIGHT SECTION (Collapsible)
            ======================================== */}
        <div id="follow-my-flight" className="relative bg-background/90 backdrop-blur-xs">
          <CollapsibleSection
            title="Follow My Flight"
            subtitle="Sigue Mi Vuelo"
            collapsedContent={
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <p className="flex-1">
                  Explore my flight history on an interactive 3D map showing every route I've flown.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-secondary" />
                    <strong>{flightStats.totalHours}</strong> hours
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-secondary" />
                    <strong>{flightStats.totalFlights}</strong> flights
                  </span>
                </div>
              </div>
            }
          >
            <FollowFlightSectionContent />
          </CollapsibleSection>
        </div>

        {/* ========================================
            CONTACT SECTION (Always open)
            ======================================== */}
        <ContactSection />
      </div>
    </div>
  );
}
