import { useEffect, useMemo, useRef, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import RouteError from "@/components/RouteError";
import IconifyGrid from "@/components/IconifyGrid";
import { GridPagination } from "@/components/GridPagination";
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

export const Route = createLazyFileRoute("/packs/$prefix")({
  component: Page,
  errorComponent: RouteError,
});

const PAGE_SIZE = 96;

function Page() {
  const { prefix, collection } = Route.useLoaderData();
  const [seo, setSeo] = useState<PackSeo | null>(null);
  const [names, setNames] = useState<string[]>([]);
  // PERF-H3: real pagination, not "Load more" (see categories page).
  const [page, setPage] = useState(0);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Opening a set must start at the top of the page - never leave the user
  // staring at the footer because the scroll position carried over.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [prefix]);

  useEffect(() => {
    let alive = true;
    // STALE-GRID FIX (v57 bug-2): clear the previous set's names BEFORE the
    // new set's names arrive. Without this, `prefix` (from the loader, new)
    // combined with stale `names` (old set) to render tiles — and clicks —
    // for `${newPrefix}:${oldName}`, icons that do not exist in the new set,
    // so the detail modal could never load. Never show old-set tiles under
    // a new set's header; the brief empty state is the honest loading state.
    setNames([]);
    setPage(0);
    void fetchPackSeo(prefix).then((s) => {
      if (alive) setSeo(s);
    });
    void fetchAllCollectionIconNames(prefix).then((n) => {
      if (alive) {
        setNames(n);
        setPage(0);
      }
    });
    return () => {
      alive = false;
    };
  }, [prefix]);

  const totalPages = Math.max(1, Math.ceil(names.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const icons = useMemo(
    () =>
      names
        .slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
        .map((n) => `${prefix}:${n}`),
    [names, safePage, prefix],
  );
  const gotoPage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
          <Link to="/" className="hover:text-foreground">Icon packs</Link>
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
          <div className="mt-4" ref={gridRef}>
            <IconifyGrid icons={icons} onIconClick={setActiveIcon} />
          </div>
          <GridPagination
            page={safePage}
            totalPages={totalPages}
            total={names.length}
            pageSize={PAGE_SIZE}
            onPage={gotoPage}
          />
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

