import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useBlogPost } from "@/hooks/use-supabase-blog";
import { formatLongDate } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { BlogImageGallery } from "@/components/BlogImageGallery";
import { SEO } from "@/components/SEO";
import { BackLink, EYEBROW, PageHeader, PageShell } from "@/components/editorial/EditorialPage";
import { Reveal } from "@/components/editorial/fx";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useBlogPost(slug || "");

  if (isLoading) {
    return (
      <PageShell width="max-w-[760px]" className="flex min-h-[70vh] items-center justify-center">
        <p className={`animate-pulse ${EYEBROW}`}>Loading post...</p>
      </PageShell>
    );
  }

  if (error || !post) {
    return (
      <PageShell width="max-w-[760px]">
        <BackLink to="/blog">Back to Blog</BackLink>
        <PageHeader title="Post not found" />
      </PageShell>
    );
  }

  return (
    <>
      <SEO
        title={`${post.title} | Noah Berman`}
        description={post.excerpt || `Read ${post.title} by Noah Berman`}
        type="article"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.excerpt || "",
          "author": {
            "@type": "Person",
            "name": "Noah Berman"
          },
          "datePublished": post.published_at || undefined,
          "url": `https://noahiberman.com/blog/${slug}`
        }}
      />

      <PageShell width="max-w-[860px]">
        <article>
          <BackLink to="/blog">Back to Blog</BackLink>
          <PageHeader
            eyebrow={
              <time dateTime={post.published_at || undefined}>{formatLongDate(post.published_at)}</time>
            }
            title={post.title}
            intro={post.excerpt}
          >
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </PageHeader>

          {post.images && post.images.length > 0 && (
            <Reveal className="mb-[clamp(32px,5vw,64px)]">
              <BlogImageGallery images={post.images} title={post.title} />
            </Reveal>
          )}

          {post.content && (
            <Reveal className="border-t border-white/[.12] pt-[clamp(32px,5vw,64px)]">
              <MarkdownRenderer content={post.content} />
            </Reveal>
          )}

          <div className="mt-[clamp(48px,7vw,96px)] border-t border-white/[.08] pt-8">
            <BackLink to="/blog">Back to all posts</BackLink>
          </div>
        </article>
      </PageShell>
    </>
  );
}
