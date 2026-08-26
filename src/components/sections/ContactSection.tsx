import { BilingualHeading } from "@/components/BilingualHeading";
import { ContactMessageForm } from "@/components/contact/ContactMessageForm";
import { DirectContactCard, ScheduleMeetingCard } from "@/components/contact/ContactCards";

export function ContactSection() {
  return (
    <section
      id="contact"
      className="py-16 sm:py-20 md:py-24 lg:py-32 scroll-mt-24 relative bg-background/90 backdrop-blur-xs [content-visibility:auto] [contain-intrinsic-size:auto_1100px]"
    >
      <div className="container mx-auto px-4 sm:px-6">
        {/* reveal-view: CSS scroll-driven rise (see index.css), replacing the
            old framer whileInView so scrolling costs no JS here. */}
        <div className="reveal-view max-w-3xl mx-auto mb-10 sm:mb-12 md:mb-16 text-center">
          <BilingualHeading 
            english="Get in Touch"
            spanish="Conectemos"
            as="h2"
            className="mb-4"
          />
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
            Whether you want to talk aviation, technology, or a potential collaboration, I'd love to hear from you.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Main Contact Section */}
          <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 mb-6 sm:mb-8">
            {/* Contact Form - Takes 2 columns on large screens */}
            <div className="reveal-view lg:col-span-2">
              <ContactMessageForm />
            </div>

            {/* Quick Contact - Takes 1 column on large screens */}
            <div className="reveal-view space-y-5 sm:space-y-6">
              <DirectContactCard />

              <ScheduleMeetingCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}












