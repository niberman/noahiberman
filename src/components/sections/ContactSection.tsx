import { m } from "framer-motion";
import { BilingualHeading } from "@/components/BilingualHeading";
import { ContactMessageForm } from "@/components/contact/ContactMessageForm";
import { DirectContactCard, ScheduleMeetingCard } from "@/components/contact/ContactCards";

export function ContactSection() {
  return (
    <section id="contact" className="py-16 sm:py-20 md:py-24 lg:py-32 scroll-mt-24 relative bg-background/90 backdrop-blur-xs">
      <div className="container mx-auto px-4 sm:px-6">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-10 sm:mb-12 md:mb-16 text-center"
        >
          <BilingualHeading 
            english="Get in Touch"
            spanish="Conectemos"
            as="h2"
            className="mb-4"
          />
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
            Whether you want to talk aviation, technology, or a potential collaboration, I'd love to hear from you.
          </p>
        </m.div>

        <div className="max-w-6xl mx-auto">
          {/* Main Contact Section */}
          <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 mb-6 sm:mb-8">
            {/* Contact Form - Takes 2 columns on large screens */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <ContactMessageForm />
            </m.div>

            {/* Quick Contact - Takes 1 column on large screens */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-5 sm:space-y-6"
            >
              <DirectContactCard />

              <ScheduleMeetingCard />
            </m.div>
          </div>
        </div>
      </div>
    </section>
  );
}












