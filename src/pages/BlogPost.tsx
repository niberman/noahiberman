import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft } from "lucide-react";
import { useBlogPost } from "@/hooks/use-supabase-blog";
import { cn, formatLongDate } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { BlogImageGallery } from "@/components/BlogImageGallery";
import { SEO } from "@/components/SEO";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useBlogPost(slug || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading post...
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Post not found</p>
        <Button asChild variant="outline">
          <Link to="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>
        </Button>
      </div>
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

      <article className="min-h-screen pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6">
          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Button asChild variant="ghost" size="sm">
              <Link to="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.published_at || undefined}>
                {formatLongDate(post.published_at)}
              </time>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-6">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-lg text-foreground/80 leading-relaxed">
                {post.excerpt}
              </p>
            )}
          </motion.header>

          {/* Image gallery */}
          {post.images && post.images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-8"
            >
              <BlogImageGallery images={post.images} title={post.title} />
            </motion.div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="flex flex-wrap gap-2 mb-8"
            >
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-sm rounded-full"
                >
                  {tag}
                </Badge>
              ))}
            </motion.div>
          )}

          {/* Content */}
          {post.content && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className={cn(
                "rounded-xl border border-border/50 p-6 sm:p-8 lg:p-10",
                "bg-gradient-to-br from-background/80 via-background/60 to-background/40",
                "backdrop-blur-sm"
              )}
            >
              <MarkdownRenderer content={post.content} />
            </motion.div>
          )}

          {/* Footer navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-12 pt-8 border-t border-border/50"
          >
            <Button asChild variant="outline">
              <Link to="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to all posts
              </Link>
            </Button>
          </motion.div>
        </div>
      </article>
    </>
  );
}
