import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, FileText } from "lucide-react";
import { useBlogPosts } from "@/hooks/use-supabase-blog";
import type { BlogPost } from "@/lib/supabase";
import { cn, formatLongDate } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { BlogImageGallery } from "@/components/BlogImageGallery";

interface BlogPostCardProps {
  post: BlogPost;
  index: number;
}

function BlogPostCard({ post, index }: BlogPostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="relative"
    >
      {/* Timeline connector */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border ml-3 sm:ml-4 hidden sm:block" />
      <div className="absolute left-0 top-6 w-7 sm:w-9 h-px bg-border hidden sm:block" />
      <div className="absolute left-2.5 sm:left-3.5 top-5 w-2 h-2 rounded-full bg-secondary ring-4 ring-background hidden sm:block" />

      <div
        className={cn(
          "sm:ml-12 rounded-xl border border-border/50 overflow-hidden",
          "bg-gradient-to-br from-background/80 via-background/60 to-background/40",
          "hover:border-secondary/40 transition-all duration-300",
          "backdrop-blur-sm"
        )}
      >
        {/* Images */}
        {post.images && post.images.length > 0 && (
          <BlogImageGallery images={post.images} title={post.title} variant="card" />
        )}

        <div className="p-4 sm:p-5 lg:p-6">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            <time dateTime={post.published_at || undefined}>
              {formatLongDate(post.published_at)}
            </time>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-display font-bold text-primary-foreground mb-2">
            <Link
              to={`/blog/${post.slug}`}
              className="hover:text-secondary transition-colors"
            >
              {post.title}
            </Link>
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-foreground/80 leading-relaxed mb-4">
              {post.excerpt}
            </p>
          )}

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && post.content && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mb-4 pt-4 border-t border-border/30">
                  <MarkdownRenderer content={post.content} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {post.tags?.slice(0, 4).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs rounded-full"
                >
                  {tag}
                </Badge>
              ))}
              {post.tags && post.tags.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{post.tags.length - 4}
                </span>
              )}
            </div>

            {/* Read more button */}
            {post.content && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-secondary hover:text-secondary/80"
              >
                {isExpanded ? "Show less" : "Read more"}
                <ArrowRight
                  className={cn(
                    "ml-1 h-4 w-4 transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function BlogSectionContent() {
  const { data: posts, isLoading, error } = useBlogPosts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">
          Loading posts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Unable to load blog posts</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">No blog posts yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Check back soon for updates
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {posts.map((post, index) => (
        <BlogPostCard key={post.id} post={post} index={index} />
      ))}
    </div>
  );
}




