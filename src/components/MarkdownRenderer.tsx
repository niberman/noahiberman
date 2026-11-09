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
        // Editorial reading type: Instrument Serif headings, Geist 300 body
        // in the body tone, light-purple accents, hairline rules.
        "prose prose-invert prose-sm sm:prose-base max-w-none",
        "prose-headings:font-editorial prose-headings:font-normal prose-headings:tracking-[-.02em] prose-headings:text-ed-ink",
        "prose-h1:text-[clamp(32px,3.4vw,48px)] prose-h2:text-[clamp(28px,2.8vw,40px)] prose-h3:text-[clamp(22px,2.2vw,30px)]",
        "prose-p:font-light prose-p:text-ed-body prose-p:leading-[1.7]",
        "prose-a:text-ed-light prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-ed-ink prose-strong:font-medium",
        "prose-em:text-ed-ink",
        "prose-code:text-ed-light prose-code:bg-[rgba(128,51,204,.12)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-white/[.03] prose-pre:border prose-pre:border-white/[.1] prose-pre:rounded-2xl",
        "prose-blockquote:border-l-ed-light prose-blockquote:pl-5 prose-blockquote:py-1 prose-blockquote:font-editorial prose-blockquote:font-normal prose-blockquote:italic prose-blockquote:text-[1.35em] prose-blockquote:leading-snug prose-blockquote:text-ed-ink",
        "prose-ul:font-light prose-ul:text-ed-body prose-ol:font-light prose-ol:text-ed-body",
        "prose-li:marker:text-ed-light",
        "prose-hr:border-white/[.12]",
        "prose-table:text-ed-body",
        "prose-th:text-ed-ink prose-th:border-white/[.12]",
        "prose-td:border-white/[.08]",
        "[&_a]:text-ed-light [&_a]:underline hover:[&_a]:text-ed-light/80",
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
