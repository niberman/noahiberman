import { BlogSectionContent } from "@/components/sections/BlogSection";
import { SEO } from "@/components/SEO";
import { BackLink, PageHeader, PageShell } from "@/components/editorial/EditorialPage";

export default function Blog() {
  return (
    <PageShell width="max-w-[1000px]">
      <SEO
        title="Blog | Noah Berman"
        description="Aviation, AI systems, and technology insights from Noah Berman, a Denver-based commercial pilot, software engineer, and entrepreneur."
      />
      <BackLink to="/">Back to Home</BackLink>
      <PageHeader
        size="hero"
        title="Blog"
        es="Publicaciones"
        intro="Thoughts on aviation, technology, entrepreneurship, and life at altitude."
      />
      <BlogSectionContent />
    </PageShell>
  );
}
