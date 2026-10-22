// Renders structured blog blocks to React elements.
// Supports **bold** and [label](/internal-path) inside text.
import type { ReactNode } from "react";
import type { BlogBlock } from "@/lib/blog";

const INLINE_RE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export function renderInline(text: string): ReactNode[] {
  const parts = text.split(INLINE_RE);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
        >
          {link[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function BlogBody({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="blog-body">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={i} className="mt-10 font-display text-2xl font-semibold tracking-tight first:mt-0">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="mt-8 font-display text-xl font-semibold tracking-tight">
                {block.text}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="mt-4 leading-[1.85] text-muted-foreground">
                {renderInline(block.text)}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="mt-4 list-disc space-y-2.5 pl-6 leading-[1.75] text-muted-foreground marker:text-primary">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre
                key={i}
                className="mt-5 overflow-x-auto rounded-2xl bg-ink p-5 font-mono text-[13px] leading-relaxed text-background"
              >
                <code>{block.text}</code>
              </pre>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
