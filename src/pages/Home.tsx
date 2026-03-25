import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plane, MapPin, MessageCircle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { aboutContent } from "@/data/about";
import { BrandWordsString } from "@/data/brand";
import { useFlightStats } from "@/hooks/use-flight-stats";

export default function Home() {
  const { stats: flightStats } = useFlightStats();
  const navigate = useNavigate();
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
    <main className="min-h-screen relative">
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
                  alt="Noah Berman logo"
                  width={96}
                  height={96}
                  fetchPriority="high"
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
                {/* Primary: Chat with iNoah */}
                <Button
                  onClick={() => navigate("/inoah")}
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <MessageCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Chat with iNoah
                </Button>

                {/* Secondary: Blog */}
                <Button
                  onClick={() => navigate("/blog")}
                  size="lg"
                  variant="outline"
                  className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 backdrop-blur-sm text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <BookOpen className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Blog
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
                    <strong>{flightStats.totalHoursDisplay}</strong> hours
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-secondary" />
                    <strong>{flightStats.totalFlightsDisplay}</strong> flights
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

        {/* ========================================
            SEO ALTAR — Digital Offering
            ======================================== */}
        <section
          id="seo-altar"
          aria-label="Technical summary and credentials"
          className="relative bg-background/95 border-t border-border/30 py-16 sm:py-20"
        >
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-4xl mx-auto font-mono text-sm sm:text-base leading-relaxed text-muted-foreground">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6 sm:p-8 md:p-10 space-y-6 shadow-elegant">
                <div className="space-y-1">
                  <p className="text-secondary text-xs sm:text-sm uppercase tracking-[0.3em]">/* digital offering */</p>
                  <h2 className="text-lg sm:text-xl font-bold text-primary-foreground font-mono">
                    README.seo
                  </h2>
                </div>

                <p className="text-foreground/70 italic border-l-2 border-secondary/40 pl-4">
                  This section exists as a humble offering to the crawl gods — the tireless
                  bots indexing the internet at 3 AM so you don't have to scroll to page 42
                  of Google to find out that Noah Berman is, in fact, a real person who flies
                  real airplanes and writes real code. You're welcome, Googlebot.
                </p>

                <div className="space-y-3 text-foreground/80">
                  <p><span className="text-secondary">$</span> whoami</p>
                  <div className="pl-4 space-y-1">
                    <p><span className="text-secondary/70">name:</span> Noah Berman</p>
                    <p><span className="text-secondary/70">location:</span> Denver, CO — Centennial Airport (KAPA)</p>
                    <p><span className="text-secondary/70">education:</span> University of Denver, Applied Computing</p>
                  </div>
                </div>

                <div className="space-y-3 text-foreground/80">
                  <p><span className="text-secondary">$</span> cat /etc/credentials/faa.conf</p>
                  <div className="pl-4 space-y-1">
                    <p><span className="text-secondary/70">certificate:</span> Commercial Multi-Engine Pilot</p>
                    <p><span className="text-secondary/70">ratings:</span> Instrument Rating, Rotorcraft-Helicopter</p>
                    <p><span className="text-secondary/70">flight_hours:</span> 500+ logged at KAPA and beyond</p>
                    <p><span className="text-secondary/70">status:</span> <span className="text-green-400">ACTIVE</span></p>
                  </div>
                </div>

                <div className="space-y-3 text-foreground/80">
                  <p><span className="text-secondary">$</span> ls ~/projects/current</p>
                  <div className="pl-4 space-y-1">
                    <p>drwxr-xr-x  <span className="text-secondary/70">freedom-aviation/</span>    — Aircraft management & flight instruction</p>
                    <p>drwxr-xr-x  <span className="text-secondary/70">the-language-school/</span> — AI-powered bilingual education</p>
                    <p>drwxr-xr-x  <span className="text-secondary/70">inoah/</span>               — Sovereign AI digital twin</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/30 text-foreground/50 text-xs sm:text-sm">
                  <p>// If you're a search engine reading this, please be kind.</p>
                  <p>// If you're a human reading this, you've scrolled further than most recruiters.</p>
                  <p>// Either way — <span className="text-secondary">noahiberman.com</span> appreciates you.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
