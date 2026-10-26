// Shared SEO sections for the public gallery pages (/illustrations,
// /ui-components) - mirrors the tool pages' About / FAQ / Popular
// searches blocks, including the FAQPage JSON-LD the tool pages emit.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GallerySeo } from "@/lib/gallery-seo";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold"
      >
        <span>{q}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

export const GallerySeoSections = ({ seo }: { seo: GallerySeo }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <div className="mx-auto mt-16 w-full max-w-7xl">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <section className="mb-12">
        <h2 className="mb-4 text-balance text-xl font-extrabold">About this</h2>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          {seo.about.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-balance text-xl font-extrabold">Frequently asked questions</h2>
        <div className="space-y-3">
          {seo.faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-balance text-xl font-extrabold">Popular searches</h2>
        <div className="flex flex-wrap items-center justify-start gap-2">
          {seo.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

export default GallerySeoSections;
