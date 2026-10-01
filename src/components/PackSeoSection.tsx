import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, FaqList } from "@/components/kit";
import PackHeader from "@/components/PackHeader";
import { fetchPackSeo, type PackSeo, type IconifyCollection } from "@/lib/iconify";

interface Props {
  prefix: string;
  collection: IconifyCollection;
  collections: Record<string, IconifyCollection>;
  /** Anchor id for in-page links (defaults to "pack-about"). */
  id?: string;
  /** Show the title + stat-cards header above the About section (used on /app). */
  showHeader?: boolean;
}

/**
 * About / FAQ / Tags / Related section for an icon pack.
 * Used both on the /packs/$prefix SEO page and inline at the bottom
 * of /app when a pack is selected.
 */
export default function PackSeoSection({ prefix, collection, collections, id = "pack-about", showHeader = false }: Props) {
  const [seo, setSeo] = useState<PackSeo | null>(null);
  const [related, setRelated] = useState<[string, IconifyCollection][]>([]);

  useEffect(() => {
    let alive = true;
    void fetchPackSeo(prefix).then((s) => {
      if (alive) setSeo(s);
    });
    void Promise.resolve().then(() => {
      if (!alive) return;
      const sameCategory = Object.entries(collections)
        .filter(([p, c]) => p !== prefix && c.category === collection.category)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 12);
      setRelated(sameCategory);
    });
    return () => {
      alive = false;
    };
  }, [prefix, collection.category, collections]);

  const faqJsonLd = useMemo(() => {
    if (!seo || seo.faqs.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: seo.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
  }, [seo]);

  if (!seo) return null;

  return (
    <section id={id} aria-label={`About ${collection.name}`} className="scroll-mt-24">
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Per-set header (title + stat cards), matching the pack page */}
      {showHeader && (
        <div className="mt-14">
          <PackHeader collection={collection} seo={seo} />
        </div>
      )}

      {/* About */}
      <Reveal className="mt-14">
        <SectionHeading align="center" eyebrow="About" title={`About ${collection.name}`} />
        <p className="mx-auto mt-3 w-full max-w-7xl text-center leading-relaxed text-muted-foreground">{seo.about}</p>
      </Reveal>

      {/* FAQ */}
      {seo.faqs.length > 0 && (
        <div className="mt-14">
          <SectionHeading align="center" eyebrow="FAQ" title={`${collection.name} - frequently asked questions`} />
          <div className="mx-auto mt-4 w-full max-w-7xl">
            <FaqList items={seo.faqs} />
          </div>
        </div>
      )}

      {/* Tags */}
      {seo.tags.length > 0 && (
        <div className="mt-14">
          <SectionHeading align="center" eyebrow="Tags" title={`Popular searches for ${collection.name}`} />
          <div className="mt-4 flex flex-wrap justify-start gap-2 px-1 sm:justify-center sm:px-0">
            {seo.tags.map((tag) => (
              <Link
                key={tag}
                to="/app"
                search={{ q: tag }}
                className="rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related packs */}
      {related.length > 0 && (
        <div className="mt-14">
          <SectionHeading align="center" eyebrow="Related" title={`Icon packs like ${collection.name}`} />
          <div className="mt-4 flex flex-wrap justify-start gap-2 px-1 sm:justify-center sm:px-0">
            {related.map(([p, c]) => (
              <Link
                key={p}
                to="/packs/$prefix"
                params={{ prefix: p }}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm transition-colors hover:border-primary/40"
              >
                {c.name}{" "}
                <span className="text-muted-foreground">{c.total.toLocaleString("en-US")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
