import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Raw HTML reaches this component from TipTap documents and from model output,
// so every node goes through the sanitizer before it is rendered. The default
// schema is extended only with the attributes the styled output relies on.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className"],
  },
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
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
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
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
    </div>
  );
}
