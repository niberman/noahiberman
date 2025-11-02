import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Plane } from "lucide-react";
import { FlightPath } from "@/components/FlightPath";
import { useRef } from "react";

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="min-h-screen relative">
      {/* Hero Section with Parallax */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-dusk" />
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
              className="inline-block mb-8"
            >
              <Plane className="h-20 w-20 md:h-24 md:w-24 text-secondary drop-shadow-glow animate-float" />
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
                Building the future of aviation and technology,
              </p>
              <p className="text-xl md:text-2xl text-secondary font-display italic">
                con pasión y propósito
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-5 justify-center items-center"
            >
              <Button
                asChild
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow text-lg px-10 py-6 rounded-full transition-all hover:scale-105"
              >
                <Link to="/ventures">
                  View Ventures <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 backdrop-blur-sm text-lg px-10 py-6 rounded-full transition-all hover:scale-105"
              >
                <Link to="/contact">Get in Touch</Link>
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

      {/* Featured Section - Asymmetric Layout */}
      <section className="py-32 bg-gradient-subtle relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-4">What I Do</h2>
            <p className="text-2xl text-secondary font-display italic mb-3">
              Lo Que Hago
            </p>
            <p className="text-xl text-muted-foreground max-w-2xl">
              At the intersection of aviation and technology, building ventures that matter.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-8 max-w-7xl">
            {[
              {
                title: "Aviation",
                spanish: "Aviación",
                description: "Training the next generation of pilots with modern methods and technology.",
                icon: "✈️",
                colSpan: "lg:col-span-5",
                delay: 0
              },
              {
                title: "Technology",
                spanish: "Tecnología",
                description: "Building software solutions that solve real problems for real people.",
                icon: "💻",
                colSpan: "lg:col-span-7",
                delay: 0.1
              },
              {
                title: "Cultural Connection",
                spanish: "Conexión Cultural",
                description: "Bridging worlds through bilingual ventures that unite communities.",
                icon: "🌍",
                colSpan: "lg:col-span-7",
                delay: 0.2
              },
              {
                title: "Entrepreneurship",
                spanish: "Emprendimiento",
                description: "Creating ventures that combine passion with purpose and innovation.",
                icon: "🚀",
                colSpan: "lg:col-span-5",
                delay: 0.3
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: item.delay }}
                className={`${item.colSpan} group`}
              >
                <div className="bg-gradient-card p-10 rounded-3xl shadow-elegant hover:shadow-glow transition-all duration-500 hover:scale-[1.02] h-full border border-border/50">
                  <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-3xl font-bold mb-2">{item.title}</h3>
                  <p className="text-lg text-secondary font-display italic mb-4">
                    {item.spanish}
                  </p>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
