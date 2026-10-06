import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import IconifyGrid from "@/components/IconifyGrid";
import IconifyDetail from "@/components/IconifyDetail";
import PackHeader from "@/components/PackHeader";
import PackSeoSection from "@/components/PackSeoSection";
import { SectionHeading, CTABand } from "@/components/kit";
import collectionsData from "../../public/iconify/collections.json";
import {
  fetchPackSeo,
  fetchAllCollectionIconNames,
  type PackSeo,
  type IconifyCollection,
} from "@/lib/iconify";

const staticCollections = collectionsData as Record<string, IconifyCollection>;

export const Route = createFileRoute("/packs/$prefix")({
  loader: async ({ params }) => {
    // Static import: loaders run on the server where relative fetch() fails.
    const collection = staticCollections[params.prefix];
    if (!collection) throw notFound();
    return { prefix: params.prefix, collection };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.collection.name ?? loaderData?.prefix ?? "Icon pack";
    const total = loaderData?.collection.total ?? 0;
    const title = `${name} - ${total.toLocaleString("en-US")} free SVG icons | IconVault`;
    const description = `Download ${total.toLocaleString("en-US")} ${name} as SVG, PNG, WebP or copy-paste React components. Free, no account needed.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://iconvault.site/packs/${loaderData?.prefix}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://iconvault.site/packs/${loaderData?.prefix}` }],
    };
  },
  component: Page,
});

const PAGE_SIZE = 96;
// Rendering cap: "Load more" stops here so huge packs can't grow the DOM
// (and its observers/fetches) until the tab dies. Search covers the rest.
const MAX_SHOWN = 2000;

function Page() {
  const { prefix, collection } = Route.useLoaderData();
  const [seo, setSeo] = useState<PackSeo | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);

  // Opening a set must start at the top of the page - never leave the user
  // staring at the footer because the scroll position carried over.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [prefix]);

  useEffect(() => {
    let alive = true;
    void fetchPackSeo(prefix).then((s) => {
      if (alive) setSeo(s);
    });
    void fetchAllCollectionIconNames(prefix).then((n) => {
      if (alive) {
        setNames(n);
        setShown(PAGE_SIZE);
      }
    });
    return () => {
      alive = false;
    };
  }, [prefix]);

  const icons = useMemo(
    () => names.slice(0, shown).map((n) => `${prefix}:${n}`),
    [names, shown, prefix],
  );

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

  return (
    <PageShell>
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      )}

      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/app" className="hover:text-foreground">Icon packs</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{collection.name}</span>
        </nav>

        {/* Header */}
        <div className="mt-6">
          <PackHeader collection={collection} seo={seo} />
        </div>

        {/* Icon grid */}
        <div className="mt-10">
          <SectionHeading
            eyebrow={`${names.length.toLocaleString("en-US")} icons`}
            title={`Browse ${collection.name}`}
          />
          <div className="mt-4">
            <IconifyGrid icons={icons} onIconClick={setActiveIcon} />
          </div>
          {shown < Math.min(names.length, MAX_SHOWN) && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShown((s) => Math.min(s + PAGE_SIZE, MAX_SHOWN))}
                className="focus-ring rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-medium hover:border-primary/40"
              >
                Load more ({(names.length - shown).toLocaleString("en-US")} remaining)
              </button>
            </div>
          )}
        </div>

        {/* About / FAQ / Tags / Related */}
        <PackSeoSection prefix={prefix} collection={collection} collections={staticCollections} />

        <p className="mt-10 text-sm text-muted-foreground">
          Browse all{" "}
          <Link to="/app" className="text-primary hover:underline">
            icon packs
          </Link>{" "}
          or explore{" "}
          <Link to="/categories" className="text-primary hover:underline">
            icons by category
          </Link>
          .
        </p>

        <CTABand
          title="Need these icons in production?"
          body="Convert SVG to PNG, generate favicons, or optimize your SVGs - free tools, no account."
          primary={{ label: "Open icon tools", to: "/app" }}
        />
      </div>

      {activeIcon && <IconifyDetail iconId={activeIcon} onClose={() => setActiveIcon(null)} />}
    </PageShell>
  );
}

export default Page;
