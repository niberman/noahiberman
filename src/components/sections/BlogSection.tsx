import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { useBlogPosts } from "@/hooks/use-supabase-blog";
import type { BlogPost } from "@/lib/supabase";
import { cn, formatLongDate } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { BlogImageGallery } from "@/components/BlogImageGallery";
import { BODY, EYEBROW } from "@/components/editorial/EditorialPage";
import { Reveal, glow } from "@/components/editorial/fx";

interface BlogPostCardProps {
  post: BlogPost;
  index: number;
}

function BlogPostCard({ post, index }: BlogPostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // One ledger row per post, in the Now page's pattern: hairline rule,
  // date eyebrow, serif title, light body, cursor glow on hover.
  return (
    <Reveal as="article" delay={Math.min(index, 4) * 80} className="relative overflow-hidden border-b border-white/[.12]" {...glow}>
      <div aria-hidden className="ed-glow pointer-events-none absolute inset-0 [--glow-alpha:.18] [--glow-fade:.5s] [--glow-size:640px]" />

      {post.images && post.images.length > 0 && (
        <div className="relative mt-[clamp(28px,4vw,52px)] overflow-hidden rounded-3xl">
          <BlogImageGallery images={post.images} title={post.title} variant="card" />
        </div>
      )}

      <div className="relative py-[clamp(28px,4vw,52px)]">
        <p className={`mb-4 ${EYEBROW}`}>
          <time dateTime={post.published_at || undefined}>{formatLongDate(post.published_at)}</time>
        </p>

        <h2 className="mb-4 max-w-[22ch] text-balance font-editorial font-normal text-[clamp(32px,4.2vw,64px)] leading-[.98] tracking-[-.03em]">
          <Link to={`/blog/${post.slug}`} className="transition-colors hover:text-ed-light">
            {post.title}
          </Link>
        </h2>

        {post.excerpt && <p className={`mb-6 max-w-[640px] ${BODY}`}>{post.excerpt}</p>}

        <AnimatePresence>
          {isExpanded && post.content && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mb-6 border-t border-white/[.08] pt-6">
                <MarkdownRenderer content={post.content} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {post.tags?.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {post.tags && post.tags.length > 4 && (
              <span className="self-center text-xs text-ed-muted">+{post.tags.length - 4}</span>
            )}
          </div>

          {post.content && (
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "Show less" : "Read more"}
              <ArrowRight className={cn("transition-transform", isExpanded && "rotate-90")} />
            </Button>
          )}
        </div>
      </div>
    </Reveal>
  );
}

export function BlogSectionContent() {
  const { data: posts, isLoading, error } = useBlogPosts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center border-t border-white/[.12] py-16">
        <p className={`animate-pulse ${EYEBROW}`}>Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-white/[.12] py-16 text-center">
        <p className={BODY}>Unable to load blog posts</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="border-t border-white/[.12] py-16 text-center">
        <FileText className="mx-auto mb-5 h-7 w-7 text-ed-light" />
        <p className="font-editorial text-[clamp(26px,2.4vw,34px)] leading-none">No blog posts yet</p>
        <p className="mt-3 text-[15px] font-light text-ed-body">Check back soon for updates</p>
      </div>
    );
  }

  return (
    <div className="border-t border-white/[.12]">
      {posts.map((post, index) => (
        <BlogPostCard key={post.id} post={post} index={index} />
      ))}
    </div>
  );
}



