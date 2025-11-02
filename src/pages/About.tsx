import { motion } from "framer-motion";
import { aboutContent, timeline } from "@/data/about";
import { Check } from "lucide-react";
import { BilingualHeading } from "@/components/BilingualHeading";

export default function About() {
  const typeColors = {
    aviation: "bg-secondary/20 text-secondary border-secondary/40",
    business: "bg-primary/20 text-primary border-primary/40",
    education: "bg-accent/20 text-accent border-accent/40",
    personal: "bg-muted text-muted-foreground border-muted-foreground/40",
  };

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-24"
        >
          <BilingualHeading 
            english="About Me"
            spanish="Sobre Mí"
            as="h1"
            className="mb-8"
          />
          <p className="text-2xl text-foreground/90 mb-6 leading-relaxed">
            {aboutContent.intro}
          </p>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {aboutContent.mission}
          </p>
        </motion.div>

        {/* Spanish Story Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mb-32"
        >
          <div className="bg-gradient-dusk rounded-3xl p-12 md:p-16 shadow-glow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-secondary/20 to-transparent rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-3 text-primary-foreground">
                {aboutContent.spanishStory.title}
              </h2>
              <p className="text-2xl md:text-3xl text-secondary font-display italic mb-8">
                {aboutContent.spanishStory.subtitle}
              </p>
              <p className="text-xl text-primary-foreground/95 leading-relaxed">
                {aboutContent.spanishStory.content}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mb-32"
        >
          <BilingualHeading 
            english="Core Values"
            spanish="Valores Fundamentales"
            className="mb-12 text-center"
          />
          <div className="grid md:grid-cols-3 gap-8">
            {aboutContent.values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="bg-gradient-card p-8 rounded-2xl shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Check className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{value.title}</h3>
                    <p className="text-secondary font-display italic">{value.spanish}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <BilingualHeading 
            english="Journey"
            spanish="El Viaje"
            className="mb-16 text-center"
          />
          <div className="relative">
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-secondary via-accent to-secondary/30 transform md:-translate-x-1/2" />
            
            {timeline.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`relative flex items-center mb-16 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className={`w-full md:w-5/12 ${index % 2 === 0 ? "md:text-right md:pr-16" : "md:pl-16"}`}>
                  <div className="bg-gradient-card p-8 rounded-2xl shadow-elegant hover:shadow-warm transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex items-center gap-3 mb-3 justify-start md:justify-end">
                      <span className="text-lg font-bold text-secondary">{item.year}</span>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${typeColors[item.type]}`}>
                        {item.type}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">{item.description}</p>
                  </div>
                </div>
                
                <div className="absolute left-0 md:left-1/2 w-6 h-6 bg-secondary rounded-full border-4 border-background transform md:-translate-x-1/2 shadow-glow">
                  <div className="absolute inset-0 bg-secondary rounded-full animate-pulse-glow" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
