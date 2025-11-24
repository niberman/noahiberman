import { motion } from "framer-motion";
import { aboutContent, timeline } from "@/data/about";
import { BilingualHeading } from "@/components/BilingualHeading";
import { SEO } from "@/components/SEO";

export default function About() {
  const typeColors = {
    aviation: "bg-secondary/20 text-secondary border-secondary/40",
    business: "bg-primary/20 text-primary border-primary/40",
    education: "bg-accent/20 text-accent border-accent/40",
    personal: "bg-muted text-muted-foreground border-muted-foreground/40",
  };

  return (
    <div className="pt-16 sm:pt-20 md:pt-24 lg:pt-32 pb-8 sm:pb-12 md:pb-16 lg:pb-20">
      <SEO
        title="About Noah Berman — Commercial Pilot & Entrepreneur | Aviation Journey"
        description="Learn about Noah Berman's journey from private pilot to FAA Commercial Pilot with multi-engine and helicopter ratings. Building Freedom Aviation and bridging aviation, technology, and culture. Studied in Spain, fluent in Spanish and English."
        keywords="Noah Berman about, aviation career, commercial pilot journey, flight training, bilingual pilot, Freedom Aviation founder, University of Deusto Spain, entrepreneur, aviation timeline, pilot certifications, multi-engine rating, helicopter pilot license, instrument rating"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "mainEntity": {
            "@type": "Person",
            "name": "Noah Berman",
            "description": "Commercial pilot, bilingual entrepreneur, and founder",
            "knowsLanguage": ["en-US", "es-ES"]
          }
        }}
      />
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto mb-16 sm:mb-20 md:mb-24"
        >
          <div className="bg-gradient-card p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl sm:rounded-3xl shadow-glow space-y-8 sm:space-y-10">
            <div className="space-y-4 sm:space-y-6">
              <BilingualHeading 
                english="About Me"
                spanish="Sobre Mí"
                as="h1"
                className="mb-2"
              />
              <p className="text-lg sm:text-xl md:text-2xl text-foreground/90 leading-relaxed">
                {aboutContent.intro}
              </p>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
                {aboutContent.mission}
              </p>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-[0.7rem] sm:text-[0.75rem] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-muted-foreground mb-4 sm:mb-0">
                <span>What I Do</span>
                <span className="text-secondary/80">Lo Que Hago</span>
              </div>
              <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2">
                {aboutContent.focusAreas.map((area) => (
                  <div
                    key={area.title}
                    className="rounded-xl sm:rounded-2xl border border-border/40 bg-background/60 p-4 sm:p-5 md:p-6 shadow-elegant"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-primary-foreground">{area.title}</h3>
                      <span className="text-xs font-medium uppercase tracking-wider sm:tracking-widest text-secondary/80">
                        {area.spanish}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{area.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto"
        >
          <BilingualHeading 
            english="Journey"
            spanish="El Viaje"
            className="mb-8 sm:mb-10 md:mb-12 text-center"
          />
          
          {/* Mobile & Tablet: Vertical Timeline */}
          <div className="relative lg:hidden">
            {/* Vertical line for mobile/tablet */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-secondary via-accent to-secondary/30" />
            
            <div className="space-y-8 sm:space-y-10">
              {[...timeline].reverse().map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="relative pl-16 sm:pl-20"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-[18px] sm:left-[26px] top-3 w-4 h-4 sm:w-5 sm:h-5 bg-secondary rounded-full border-2 sm:border-3 border-background transform -translate-x-1/2 shadow-glow z-10">
                    <div className="absolute inset-0 bg-secondary rounded-full animate-pulse-glow" />
                  </div>
                  
                  {/* Content card */}
                  <div className="bg-gradient-card p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-elegant transition-all duration-300 active:scale-[0.98]">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-base sm:text-lg font-bold text-secondary">{item.year}</span>
                      <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium border ${typeColors[item.type]}`}>
                        {item.type}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Desktop: Horizontal Scrollable Timeline */}
          <div className="hidden lg:block relative">
            {/* Horizontal line */}
            <div className="absolute left-0 right-0 top-[72px] h-0.5 bg-gradient-to-r from-secondary via-accent to-secondary/30" />
            
            <div className="relative overflow-x-auto overflow-y-visible pb-8 scrollbar-thin hover:scrollbar-thumb-secondary/50 scrollbar-track-transparent">
              <div className="flex gap-6 xl:gap-8 px-4 pt-16 pb-4 min-w-min">
                {[...timeline].reverse().map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: index * 0.08, duration: 0.4 }}
                    className="relative flex-shrink-0 w-72 xl:w-80"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-1/2 top-[-72px] w-5 h-5 bg-secondary rounded-full border-3 border-background transform -translate-x-1/2 shadow-glow z-10">
                      <div className="absolute inset-0 bg-secondary rounded-full animate-pulse-glow" />
                    </div>
                    
                    {/* Content card */}
                    <div className="bg-gradient-card p-5 xl:p-6 rounded-2xl shadow-elegant hover:shadow-warm transition-all duration-300 hover:scale-[1.02] group">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-secondary">{item.year}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${typeColors[item.type]}`}>
                          {item.type}
                        </span>
                      </div>
                      <h3 className="text-lg xl:text-xl font-bold mb-2 group-hover:text-secondary transition-colors">{item.title}</h3>
                      <p className="text-muted-foreground text-sm xl:text-base leading-relaxed">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Scroll indicator for desktop */}
            <div className="flex justify-center mt-6 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                <span>Scroll to explore</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
