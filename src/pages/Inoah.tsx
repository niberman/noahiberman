import { SEO } from "@/components/SEO";
import { InoahChat } from "@/components/inoah/InoahChat";

export default function Inoah() {
  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="iNoah | Noah Berman's digital twin"
        description="Ask iNoah about Noah Berman's aviation career, ventures, and engineering work."
        canonical="https://noahiberman.com/inoah"
      />
      <section className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-2xl mx-auto">
          <InoahChat />
        </div>
      </section>
    </main>
  );
}
