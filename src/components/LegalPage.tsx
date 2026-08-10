import { SEO } from "@/components/SEO";

// Terms and Privacy render from src/data/legal.json, which scripts/prerender.mjs
// also reads to build the static shells at dist/terms and dist/privacy. One
// source, so the crawled copy and the rendered copy cannot drift.
// A line beginning with "## " is a subheading.

interface LegalPageProps {
  path: "terms" | "privacy";
  heading: string;
  title: string;
  description: string;
  body: string[];
}

export function LegalPage({ path, heading, title, description, body }: LegalPageProps) {
  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical={`https://noahiberman.com/${path}`}
      />
      <main className="min-h-screen relative pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary-foreground mb-8">
              {heading}
            </h1>
            {body.map((line, i) =>
              line.startsWith("## ") ? (
                <h2
                  key={i}
                  className="text-xl sm:text-2xl font-display font-semibold text-primary-foreground mt-8 mb-3"
                >
                  {line.slice(3)}
                </h2>
              ) : (
                <p key={i} className="text-muted-foreground leading-relaxed mb-4">
                  {line}
                </p>
              )
            )}
          </div>
        </div>
      </main>
    </>
  );
}
