// Homepage code-showcase card (extracted from src/routes/index.tsx, v26
// PERF-M3): lazy-loaded so it stays out of the homepage entry chunk.
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

const CODE_SAMPLE = `import { Icon } from '@iconify/react';

export function CheckoutButton() {
  return (
    <button className="btn-primary">
      <Icon icon="solar:cart-large-2-bold-duotone"
            width="20" color="#0F766E" />
      Secure checkout
    </button>
  );
}`;

/** Premium code window for the developer-experience section: gradient
    hairline, glow, floating emoji chips and a working copy button
    (Sameer 2026-10-23). */
function CodeShowcaseCard() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE_SAMPLE);
      setCopied(true);
      toast.success("Snippet copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed - select the code manually");
    }
  };

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-[image:var(--gradient-hero)] opacity-70 blur-2xl"
        aria-hidden
      />
      <span
        className="animate-float absolute -left-3 -top-4 z-10 grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface text-lg shadow-soft sm:-left-5"
        aria-hidden
      >
        ✨
      </span>
      <span
        className="animate-float absolute -bottom-4 -right-3 z-10 grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface text-lg shadow-soft [animation-delay:900ms] sm:-right-5"
        aria-hidden
      >
        🚀
      </span>
      <div className="surface-card relative overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)]" aria-hidden />
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
            <span aria-hidden>📄 </span>CheckoutButton.tsx
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
              TSX
            </span>
            <button
              type="button"
              onClick={copy}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-primary/40 hover:text-primary"
              aria-label="Copy code snippet"
            >
              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
          {CODE_SAMPLE}
        </pre>
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <span aria-hidden>✅</span> Size, colour &amp; import path baked in - paste it and it
          just works.
        </div>
      </div>
    </div>
  );
}

export default CodeShowcaseCard;
