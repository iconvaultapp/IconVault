import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Layers, CheckSquare, X, ArrowDown } from "lucide-react";
import PackSeoSection from "@/components/PackSeoSection";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { CTABand } from "@/components/kit";
import SearchBar from "@/components/SearchBar";
import IconifyGrid from "@/components/IconifyGrid";
import IconifySidebar from "@/components/IconifySidebar";
import IconifyDetail from "@/components/IconifyDetail";
import BulkActionBar from "@/components/BulkActionBar";
import CollectionCard from "@/components/CollectionCard";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import {
  fetchCollections,
  fetchCollectionIcons,
  loadIconData,
  searchIcons,
  type IconifyCollection,
} from "@/lib/iconify";
import { POPULAR_SET_PREFIXES } from "@/lib/popular-sets";

export const Route = createFileRoute("/app")({
  validateSearch: (search: Record<string, unknown>): { q?: string; set?: string } => {
    const q = typeof search['q'] === "string" ? (search['q'] as string) : undefined;
    const set = typeof search['set'] === "string" ? (search['set'] as string) : undefined;
    return { ...(q ? { q } : {}), ...(set ? { set } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Browse 421,020 icons - IconVault" },
      {
        name: "description",
        content:
          "Search every open-source icon set from one place. Filter by family, preview at real size and export SVG, PNG or framework snippets.",
      },
      { property: "og:title", content: "Browse 421,020 icons - IconVault" },
      { property: "og:description", content: "Search, filter and export open-source icons instantly." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/app" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/app" }],
  }),
  component: AppBrowser,
});

function AppBrowser() {
  const search = Route.useSearch();
  const { q, set } = search;
  const navigate = useNavigate();
  const [query, setQuery] = useState(q ?? "");
  const [collections, setCollections] = useState<Record<string, IconifyCollection>>({});
  // The open icon set lives in the URL (?set=prefix) instead of local state,
  // so "Browse icons" (/app) always works as a back button - even when the
  // user is already on /app with a set open - and the browser back button
  // returns to the previous view too.
  const activePrefix = set ?? null;
  const openSet = useCallback(
    (prefix: string | null) => {
      const next = { ...search };
      if (prefix) next.set = prefix;
      else delete next.set;
      void navigate({ to: "/app", search: next });
    },
    [navigate, search],
  );

  // When a set is opened (or closed), jump to the top of the page so its
  // icons are visible immediately - no manual scroll-up needed.
  const prevSetRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevSetRef.current === undefined) {
      prevSetRef.current = activePrefix;
      return;
    }
    if (prevSetRef.current !== activePrefix) {
      prevSetRef.current = activePrefix;
      window.scrollTo(0, 0);
    }
  }, [activePrefix]);

  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string> | undefined>(undefined);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const { recent, addRecent } = useRecentlyViewed();
  const { record } = useSearchHistory();
  // Popular sets render in pages: 200+ cards at once means hundreds of icon
  // requests and a long first paint, so we grow the list on demand.
  const [visibleSets, setVisibleSets] = useState(24);

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch(() => undefined);
  }, []);

  // Warm the first screen of collection-card preview icons during idle time,
  // so opening /app feels instant instead of waiting for each card's
  // lazy-load observer to fire its own CDN fetch.
  useEffect(() => {
    const prefixes = Object.keys(collections).slice(0, 24);
    if (prefixes.length === 0) return;
    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      for (const p of prefixes) {
        const samples = collections[p]?.samples?.slice(0, 4) ?? [];
        for (const s of samples) {
          const [sp, sn] = s.includes(":") ? s.split(":") : [p, s];
          if (sp && sn) void loadIconData(sp, sn).catch(() => undefined);
        }
      }
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(warm);
      // NOTE: the 8.2MB search index is NOT preloaded here anymore - it
      // fetches on first search-box focus instead (see SearchBar), so plain
      // browsing never pays that download.
      return () => {
        cancelled = true;
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
      };
    }
    const t = setTimeout(warm, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [collections]);

  // Monotonic id for the search effect below: a newer keystroke bumps it, so
  // an abandoned scan can stop itself mid-flight instead of burning CPU on
  // results that will be discarded anyway.
  const searchRunId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!query.trim() && !activePrefix) {
        setIcons([]);
        return;
      }
      setLoading(true);
      const runId = ++searchRunId.current;
      try {
        const result = query.trim()
          ? (
              await searchIcons(
                query.trim(),
                120,
                0,
                activePrefix ?? undefined,
                () => runId !== searchRunId.current,
              )
            ).icons
          : await fetchCollectionIcons(activePrefix as string, 120);
        if (!cancelled) {
          setIcons(result);
          if (query.trim()) record(query.trim(), result.length);
        }
      } catch {
        if (!cancelled) setIcons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(() => void run(), 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, activePrefix, record]);

  // Curated popular sets first (editorial order), then every remaining set by size.
  const popularCollections = useMemo(() => {
    const curated = POPULAR_SET_PREFIXES.filter((p) => collections[p]).map(
      (p) => [p, collections[p]] as [string, IconifyCollection],
    );
    const curatedSet = new Set(POPULAR_SET_PREFIXES);
    const rest = Object.entries(collections)
      .filter(([p]) => !curatedSet.has(p))
      .sort((a, b) => b[1].total - a[1].total);
    return [...curated, ...rest];
  }, [collections]);

  // Auto-load more popular sets when the sentinel scrolls into view.
  // Callback-ref pattern: the observer always tracks the CURRENT sentinel
  // node (a plain ref + effect can go stale when React swaps the node during
  // re-renders, leaving the spinner stuck forever).
  const sentinelObserver = useRef<IntersectionObserver | null>(null);
  const totalSetsRef = useRef(0);
  totalSetsRef.current = popularCollections.length;
  const sentinelRef = useCallback((el: HTMLDivElement | null) => {
    sentinelObserver.current?.disconnect();
    sentinelObserver.current = null;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleSets((n) => (n < totalSetsRef.current ? n + 24 : n));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    sentinelObserver.current = io;
  }, []);
  useEffect(() => () => sentinelObserver.current?.disconnect(), []);

  const toggleBulk = () => setSelected((s) => (s ? undefined : new Set<string>()));

  const handleIconClick = (id: string) => {
    if (selected) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelected(next);
      return;
    }
    setActiveIcon(id);
  };

  const showBrowse = !query.trim() && !activePrefix;

  return (
    <div id="top" className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-[100rem]">
        <IconifySidebar
          collections={collections}
          activePrefix={activePrefix}
          onPrefixClick={openSet}
        />

        <div className="min-w-0 flex-1">
          <main className="px-5 py-8 lg:px-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="min-w-0 flex-1">
              <SearchBar value={query} onChange={setQuery} loading={loading} autoFocus />
            </div>
            <button
              onClick={toggleBulk}
              className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
            >
              {selected ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              <span className="hidden sm:inline">{selected ? "Exit select" : "Multi-select"}</span>
            </button>
          </div>

          {activePrefix && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary">
                <Layers className="h-3.5 w-3.5" />
                {collections[activePrefix]?.name ?? activePrefix}
                <button onClick={() => openSet(null)} aria-label="Clear icon set filter">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
              <a
                href="#pack-about"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                About this pack
                <ArrowDown className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {selected && (
            <p className="mt-4 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
              {selected.size > 0 ? (
                <>
                  <span className="font-medium text-foreground">{selected.size}</span> icons selected -
                  export them from the bar below
                </>
              ) : (
                "Tap icons to select them, then export as a zip."
              )}
            </p>
          )}

          <div className="mt-8">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" /> Searching…
              </div>
            ) : showBrowse ? (
              <div className="space-y-10">
                {recent.length > 0 && (
                  <section>
                    <p className="eyebrow">Recently viewed</p>
                    <div className="mt-4">
                      <IconifyGrid icons={recent.slice(0, 16)} onIconClick={handleIconClick} />
                    </div>
                  </section>
                )}
                <section>
                  <p className="eyebrow">Popular icon sets</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {popularCollections.slice(0, visibleSets).map(([prefix, col]) => (
                      <CollectionCard
                        key={prefix}
                        prefix={prefix}
                        collection={col}
                        onClick={() => openSet(prefix)}
                      />
                    ))}
                  </div>
                  {visibleSets < popularCollections.length && (
                    <div
                      ref={sentinelRef}
                      className="mt-8 flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading more icon sets…
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <>
                <IconifyGrid icons={icons} onIconClick={handleIconClick} selectedIcons={selected} />
                {activePrefix && collections[activePrefix] && (
                  <>
                    <PackSeoSection
                      prefix={activePrefix}
                      collection={collections[activePrefix]}
                      collections={collections}
                      showHeader
                    />
                    <div className="mt-14">
                      <CTABand
                        title="Need these icons in production?"
                        body="Convert SVG to PNG, generate favicons, or optimize your SVGs - free tools, no account."
                        primary={{ label: "Open icon tools", to: "/app", href: "#top" }}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>

      {selected && (
        <BulkActionBar
          selected={selected}
          onClear={() => setSelected(new Set())}
          {...(icons.length > 0 ? { onSelectAll: () => setSelected(new Set(icons)) } : {})}
        />
      )}

      {activeIcon && (
        <IconifyDetail iconId={activeIcon} onClose={() => setActiveIcon(null)} onAddToRecent={addRecent} />
      )}
    </div>
  );
}
