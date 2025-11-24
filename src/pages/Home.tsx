import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { FlightPath } from "@/components/FlightPath";
import { SEO } from "@/components/SEO";
import { useRef, useEffect } from "react";
import About from "./About";
import Ventures from "./Ventures";
import FollowMyFlight from "./FollowMyFlight";
import Contact from "./Contact";
import { BackgroundFlightMap } from "@/components/BackgroundFlightMap";

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
      
      {/* Main Content */}
      <div className="relative z-10">
        <SEO
          title="Noah Berman — Pilot, Founder & Builder | Aviation & Technology"
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
      {/* Hero Section with Parallax */}
      <section 
        id="home"
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/70 to-background/95 backdrop-blur-sm" />
        <FlightPath />
        
        <motion.div 
          style={{ opacity, scale }}
          className="container mx-auto px-4 relative z-10"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="text-center max-w-5xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.3,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              className="inline-block mb-8 h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded drop-shadow-glow animate-float relative"
            >
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="absolute inset-0 w-full h-full object-contain origin-center"
              />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-6xl md:text-8xl font-display font-bold mb-6 text-primary-foreground text-balance"
            >
              Pilot. Founder. Builder.
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="space-y-3 mb-10"
            >
              <p className="text-2xl md:text-3xl text-primary-foreground/95 font-light text-balance">
                The sky is not the limit
              </p>
              <p className="text-xl md:text-2xl text-secondary font-display italic">
                El cielo no es el límite
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-5 justify-center items-center"
            >
              <Button
                onClick={() => scrollToSection("ventures")}
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow text-lg px-10 py-6 rounded-full transition-all hover:scale-105"
              >
                View Ventures <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button
                onClick={() => scrollToSection("contact")}
                size="lg"
                variant="outline"
                className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 backdrop-blur-sm text-lg px-10 py-6 rounded-full transition-all hover:scale-105"
              >
                Get in Touch
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
        
        <motion.div 
          style={{ y }}
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
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

      {/* About Section */}
      <div id="about" className="relative bg-background/95 backdrop-blur-sm">
        <About showSEO={false} />
      </div>

      {/* Ventures Section */}
      <div id="ventures" className="relative bg-background/95 backdrop-blur-sm">
        <Ventures showSEO={false} />
      </div>

      {/* Follow My Flight Section */}
      <div id="follow-my-flight" className="relative bg-background/95 backdrop-blur-sm">
        <FollowMyFlight showSEO={false} />
      </div>

      {/* Contact Section */}
      <div id="contact" className="relative bg-background/95 backdrop-blur-sm">
        <Contact showSEO={false} />
      </div>
      </div>

    </div>
  );
}
