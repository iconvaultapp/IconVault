import { memo, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Crown, SearchX, X } from "lucide-react";
import PageShell from "@/components/PageShell";
import BrowseHero from "@/components/BrowseHero";
import { cn } from "@/lib/utils";
import {
  LIVE_TOOLS,
  SOON_TOOLS,
  TOOL_CATEGORIES,
  toolsByCategory,
  type ToolDef,
} from "@/lib/tool-catalog";
import { ToolIcon } from "@/components/ToolIcon";
import { isToolFreeUnlimited } from "@/lib/tool-trial";

const PAGE_SIZE = 12;

// Memoized: the card is pure in its props, so keystroke re-renders of the
// catalog skip cards whose tool didn't change. Rendered output is identical.
const ToolCard = memo(({ tool }: { tool: ToolDef }) => {
  // Fully-free tools (no daily limit, no account) get a visible "Free" badge
  // so the catalog honestly shows how much is free. "Free" wins over the
  // catalog "New" badge - the free status matters more to visitors.
  const badge = isToolFreeUnlimited(tool.id) ? "Free" : tool.badge;
  const inner = (
    <div
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all",
        tool.path && "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
        tool.soon && "opacity-75",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ToolIcon iconKey={tool.icon} className="h-6 w-6" />
        </span>
        {badge && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
              badge === "Pro"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-primary/10 text-primary",
            )}
          >
            {badge === "Pro" && <Crown className="h-3 w-3" />}
            {badge}
          </span>
        )}
      </div>
      <h3 className="mb-1.5 flex items-center gap-2 text-lg font-bold">
        {tool.name}
        {tool.soon && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Soon
          </span>
        )}
      </h3>
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{tool.tagline}</p>
      {tool.path && (
        <span className="mt-4 flex items-center gap-1 text-sm font-bold text-primary">
          Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      )}
    </div>
  );
  return tool.path ? (
    <Link to={tool.path} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
});

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Free Design & Developer Tools - IconVault" },
      {
        name: "description",
        content:
          "579 free online tools: dev utilities, image converters, SEO checkers, calculators, security tools, interactive web API playgrounds, text tools and more.",
      },
      { property: "og:title", content: "Free Design & Developer Tools - IconVault" },
      {
        property: "og:description",
        content:
          "579 free online tools: dev utilities, image converters, SEO checkers, calculators, security tools and more. No account needed.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/tools" },
      { property: "og:image", content: "https://iconvault.site/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Free Design & Developer Tools - IconVault" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/tools" }],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  // Deep-linkable search: /tools?q=json (from homepage and 404 search boxes).
  // Deep-linkable category: /tools?category=image (from header menu categories).
  // Read straight from the URL so no route search-schema typing is needed.
  const [query, setQuery] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("q") ?? ""),
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : (new URLSearchParams(window.location.search).get("category") ?? null),
  );
  const activeCat = TOOL_CATEGORIES.find((c) => c.id === activeCategory) ?? null;

  // id -> label lookup for the search haystack; built once instead of a
  // linear find per tool per keystroke.
  const catLabelById = useMemo(
    () => new Map(TOOL_CATEGORIES.map((c) => [c.id, c.label] as const)),
    [],
  );

  // Progressive rendering: each category section initially shows the first
  // PAGE_SIZE tools; "Show all" expands it client-side. This keeps the SSR
  // HTML (and hydration cost) small - the page used to ship all 579 cards
  // at once (~870KB HTML). Search still scans the full catalog.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const expandCat = (catId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(catId);
      return next;
    });
  const visibleTools = (catId: string, tools: ToolDef[]) =>
    expanded.has(catId) ? tools : tools.slice(0, PAGE_SIZE);

  // Keep the filters in sync when navigating between /tools URLs client-side
  // (e.g. picking another category from the header menu) without a remount.
  const router = useRouter();
  useEffect(() => {
    return router.history.subscribe(() => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get("q") ?? "");
      setActiveCategory(params.get("category"));
    });
  }, [router]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const words = q.split(/\s+/);
    return LIVE_TOOLS.filter((t) => {
      const catLabel = t.category ? (catLabelById.get(t.category) ?? "") : "";
      const hay = `${t.name} ${t.tagline} ${t.id.replace(/-/g, " ")} ${catLabel}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [query, catLabelById]);

  const searching = results !== null;
  // Search scans everything but only renders the first 60 matches to keep
  // the DOM small; the count line tells the user to refine when capped.
  const SEARCH_CAP = 60;
  const cappedResults = searching ? results.slice(0, SEARCH_CAP) : [];

  const renderCategoryGrid = (catId: string, tools: ToolDef[]) => {
    const visible = visibleTools(catId, tools);
    const collapsed = !expanded.has(catId) && tools.length > PAGE_SIZE;
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
          {visible.map((t) => (
            <ToolCard key={t.id} tool={t} />
          ))}
        </div>
        {collapsed && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => expandCat(catId)}
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition-colors hover:border-primary/40"
            >
              Show all {tools.length} tools
            </button>
          </div>
        )}
      </>
    );
  };

  const handleHeroSearch = (v: string) => {
    setQuery(v);
    requestAnimationFrame(() => {
      document.getElementById("tools-grid")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <PageShell fullWidth>
      <BrowseHero variant="tools" onSearch={handleHeroSearch} />
      <div id="tools-grid" className="scroll-mt-20 px-2 pb-4 pt-0 sm:px-4 sm:py-4">
        {/* Search lives in the hero above; this status line reflects it. */}
        <div className="mb-8 mt-2">
          {searching && (
            <p className="mt-3 text-center text-sm text-muted-foreground" role="status">
              {results.length === 0 ? (
                <>No tools match &quot;{query.trim()}&quot;</>
              ) : (
                <>
                  {results.length} result{results.length === 1 ? "" : "s"} for &quot;{query.trim()}&quot;
                  {results.length > SEARCH_CAP && (
                    <> - showing the first {SEARCH_CAP}, refine your search to narrow it down</>
                  )}
                </>
              )}
            </p>
          )}
        </div>

        {searching ? (
          results.length === 0 ? (
            <div className="mx-auto mb-16 flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <SearchX className="h-7 w-7" />
              </span>
              <h2 className="mb-2 text-lg font-bold">No tools found</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Nothing matches &quot;{query.trim()}&quot;. Try a shorter keyword like &quot;json&quot;,
                &quot;image&quot; or &quot;password&quot;.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
              {cappedResults.map((t) => (
                <ToolCard key={t.id} tool={t} />
              ))}
            </div>
          )
        ) : activeCat ? (
          <section aria-label={activeCat.label}>
            <div className="mb-4 flex flex-wrap items-center gap-x-3">
              <h2 className="text-lg font-extrabold tracking-tight">{activeCat.label}</h2>
              <p className="text-sm text-muted-foreground">{activeCat.blurb}</p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory(null);
                  window.history.replaceState(null, "", "/tools");
                }}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                All categories
              </button>
            </div>
            <div className="mb-12">
              {renderCategoryGrid(activeCat.id, toolsByCategory(activeCat.id))}
            </div>
          </section>
        ) : (
          <>
            {TOOL_CATEGORIES.map((cat) => {
              const tools = toolsByCategory(cat.id);
              if (tools.length === 0) return null;
              return (
                <section key={cat.id} className="mb-12" aria-label={cat.label}>
                  <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
                    <h2 className="text-lg font-extrabold tracking-tight">{cat.label}</h2>
                    <p className="text-sm text-muted-foreground">{cat.blurb}</p>
                  </div>
                  {renderCategoryGrid(cat.id, tools)}
                </section>
              );
            })}

            <div className="mb-10">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Coming soon
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                {SOON_TOOLS.map((t) => (
                  <ToolCard key={t.id} tool={t} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
