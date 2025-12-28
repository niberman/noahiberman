import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Check if content is HTML (from TipTap) or Markdown
  const isHtml = content.startsWith("<") || content.includes("</");

  // If it's pure HTML from TipTap, render it with proper styling
  if (isHtml) {
    return (
      <div
        className={cn(
          "prose prose-invert prose-sm sm:prose-base max-w-none",
          "prose-headings:font-display prose-headings:text-primary-foreground",
          "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
          "prose-p:text-foreground/80 prose-p:leading-relaxed",
          "prose-a:text-secondary prose-a:no-underline hover:prose-a:underline",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-em:text-foreground/90",
          "prose-code:text-secondary prose-code:bg-secondary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50",
          "prose-blockquote:border-l-secondary prose-blockquote:bg-secondary/5 prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:not-italic",
          "prose-ul:text-foreground/80 prose-ol:text-foreground/80",
          "prose-li:marker:text-secondary",
          "prose-hr:border-border/50",
          "prose-table:text-foreground/80",
          "prose-th:text-foreground prose-th:border-border",
          "prose-td:border-border",
          "[&_a]:text-secondary [&_a]:underline hover:[&_a]:text-secondary/80",
          className
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // For Markdown content, use ReactMarkdown
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      className={cn(
        "prose prose-invert prose-sm sm:prose-base max-w-none",
        "prose-headings:font-display prose-headings:text-primary-foreground",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
        "prose-p:text-foreground/80 prose-p:leading-relaxed",
        "prose-a:text-secondary prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-em:text-foreground/90",
        "prose-code:text-secondary prose-code:bg-secondary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50",
        "prose-blockquote:border-l-secondary prose-blockquote:bg-secondary/5 prose-blockquote:py-1 prose-blockquote:not-italic",
        "prose-ul:text-foreground/80 prose-ol:text-foreground/80",
        "prose-li:marker:text-secondary",
        "prose-hr:border-border/50",
        "prose-table:text-foreground/80",
        "prose-th:text-foreground prose-th:border-border",
        "prose-td:border-border",
        className
      )}
      components={{
        a: ({ href, children, ...props }) => {
          const isExternal = href?.startsWith("http");
          return (
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
