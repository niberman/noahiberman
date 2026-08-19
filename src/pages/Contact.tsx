import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { BilingualHeading } from "@/components/BilingualHeading";
import { ContactMessageForm } from "@/components/contact/ContactMessageForm";
import { DirectContactCard, ScheduleMeetingCard } from "@/components/contact/ContactCards";
import { SEO } from "@/components/SEO";

interface PageSectionProps {
  showSEO?: boolean;
}

export default function Contact({ showSEO = true }: PageSectionProps) {
  return (
    <main className="py-16 sm:py-20 md:py-24 lg:py-32">
      {showSEO && (
        <SEO
          title="Contact | Noah Berman"
          description="Get in touch with Noah Berman — Denver-based commercial pilot and software engineer. Aviation services, AI systems, and collaborations."
          structuredData={{
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "mainEntity": {
              "@type": "Person",
              "name": "Noah Berman"
            }
          }}
        />
      )}
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto mb-10 sm:mb-12 md:mb-16 text-center"
        >
          <BilingualHeading
            english="Get in Touch"
            spanish="Conectemos"
            as="h1"
            className="mb-4"
          />
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
            Let's connect. Whether you want to discuss aviation, technology, or potential collaborations.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Main Contact Section */}
          <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 mb-6 sm:mb-8">
            {/* Contact Form - Takes 2 columns on large screens */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <ContactMessageForm />
            </motion.div>

            {/* Quick Contact - Takes 1 column on large screens */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-5 sm:space-y-6"
            >
              <DirectContactCard />

              <ScheduleMeetingCard />
            </motion.div>
          </div>

          {/* Bottom CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-dusk text-primary-foreground border-secondary/20 shadow-glow">
              <CardContent className="pt-5 sm:pt-6 pb-5 sm:pb-6">
                <div className="text-center max-w-2xl mx-auto px-4">
                  <h2 className="text-xl sm:text-2xl font-display text-primary-foreground mb-2">
                    Let's Build Together
                  </h2>
                  <p className="text-base sm:text-lg font-display italic text-secondary mb-3 sm:mb-4">
                    Construyamos Juntos
                  </p>
                  <p className="text-primary-foreground/95 text-sm sm:text-base leading-relaxed">
                    Always interested in collaborating on projects at the intersection of aviation and technology. Let's create something meaningful together.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
