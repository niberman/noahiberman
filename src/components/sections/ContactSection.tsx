import { BilingualHeading } from "@/components/BilingualHeading";
import { INTRO, PAD_X } from "@/components/editorial/EditorialPage";
import { ContactMessageForm } from "@/components/contact/ContactMessageForm";
import { DirectContactCard, ScheduleMeetingCard } from "@/components/contact/ContactCards";

export function ContactSection() {
  return (
    <section
      id="contact"
      data-fix="contact"
      className={`py-[clamp(72px,10vw,140px)] scroll-mt-24 relative border-t border-white/[.08] bg-background/90 backdrop-blur-xs [content-visibility:auto] [contain-intrinsic-size:auto_1100px] ${PAD_X}`}
    >
      <div className="mx-auto max-w-[1200px]">
        {/* reveal-view: CSS scroll-driven rise (see index.css), replacing the
            old framer whileInView so scrolling costs no JS here. */}
        <div className="reveal-view max-w-3xl mx-auto mb-[clamp(40px,6vw,80px)] text-center">
          <BilingualHeading
            english="Get in Touch"
            spanish="Conectemos"
            as="h2"
            className="mb-[clamp(20px,3vw,32px)]"
          />
          <p className={`mx-auto max-w-[560px] ${INTRO}`}>
            Whether you want to talk aviation, technology, or a potential collaboration, I'd love to hear from you.
          </p>
        </div>

        <div>
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












