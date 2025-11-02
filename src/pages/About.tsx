import { motion } from "framer-motion";
import { aboutContent, timeline } from "@/data/about";
import { Check } from "lucide-react";

export default function About() {
  const typeColors = {
    aviation: "bg-secondary/20 text-secondary border-secondary/30",
    business: "bg-primary/20 text-primary border-primary/30",
    education: "bg-accent/20 text-accent border-accent/30",
    personal: "bg-muted text-muted-foreground border-muted-foreground/30",
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">About Me</h1>
          <p className="text-xl text-muted-foreground mb-8">
            {aboutContent.intro}
          </p>
          <p className="text-lg text-muted-foreground">
            {aboutContent.mission}
          </p>
        </motion.div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mb-20"
        >
          <h2 className="text-3xl font-bold mb-8 text-center">Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {aboutContent.values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card p-6 rounded-xl shadow-elegant"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-secondary" />
                  </div>
                  <h3 className="text-xl font-bold">{value.title}</h3>
                </div>
                <p className="text-muted-foreground">{value.description}</p>
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
          <h2 className="text-3xl font-bold mb-12 text-center">Journey</h2>
          <div className="relative">
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-0.5 bg-border transform md:-translate-x-1/2" />
            
            {timeline.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex items-center mb-12 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className={`w-full md:w-5/12 ${index % 2 === 0 ? "md:text-right md:pr-12" : "md:pl-12"}`}>
                  <div className="bg-card p-6 rounded-xl shadow-elegant">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${typeColors[item.type]}`}>
                        {item.type}
                      </span>
                      <span className="text-sm text-muted-foreground">{item.year}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                
                <div className="absolute left-0 md:left-1/2 w-4 h-4 bg-secondary rounded-full border-4 border-background transform md:-translate-x-1/2" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
