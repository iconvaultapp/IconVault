import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Copy, CheckCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

/** Section heading used across every content page. */
export const SectionHeading = ({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) => (
  <Reveal>
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-2 text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      )}
    </div>
  </Reveal>
);

export interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

export const FeatureGrid = ({ items, columns = 3 }: { items: Feature[]; columns?: 2 | 3 }) => (
  <div
    className={cn(
      "grid gap-4",
      columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
    )}
  >
    {items.map((item, i) => (
      <Reveal key={item.title} delay={i * 45}>
        <div className="surface-card lift-hover h-full p-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
            <item.icon className="h-4.5 w-4.5" />
          </span>
          <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
        </div>
      </Reveal>
    ))}
  </div>
);

export const StepList = ({ steps }: { steps: { title: string; body: string }[] }) => (
  <ol className="grid gap-4 sm:grid-cols-3">
    {steps.map((step, i) => (
      <Reveal key={step.title} as="li" delay={i * 45} className="surface-card h-full p-5">
        <span className="font-mono text-xs text-primary">0{i + 1}</span>
        <h3 className="mt-2 font-display text-base font-semibold">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      </Reveal>
    ))}
  </ol>
);

export const CodeBlock = ({ code, label }: { code: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {label ?? "terminal"}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const FaqList = ({ items }: { items: { q: string; a: string }[] }) => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((item, i) => (
        <div key={item.q}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="font-display text-sm font-semibold sm:text-base">{item.q}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                open === i && "rotate-180 text-primary",
              )}
            />
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: open === i ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const CheckList = ({ items }: { items: string[] }) => (
  <ul className="grid gap-2.5">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export const CTABand = ({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { label: string; to: string; href?: string };
  secondary?: { label: string; to: string };
}) => (
  <Reveal>
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 text-center shadow-soft sm:p-12">
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      <div className="relative">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{body}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {primary.href ? (
            <a
              href={primary.href}
              className="focus-ring inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5"
            >
              {primary.label}
            </a>
          ) : (
            <Link
              to={primary.to}
              className="focus-ring inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5"
            >
              {primary.label}
            </Link>
          )}
          {secondary && (
            <Link
              to={secondary.to}
              className="focus-ring inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  </Reveal>
);

export const Stack = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-14", className)}>{children}</div>
);