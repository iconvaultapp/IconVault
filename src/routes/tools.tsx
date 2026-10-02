import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Crown, Search, SearchX, Wrench, X } from "lucide-react";
import PageShell from "@/components/PageShell";
import { cn } from "@/lib/utils";
import {
  LIVE_TOOLS,
  SOON_TOOLS,
  TOOL_CATEGORIES,
  toolsByCategory,
  type ToolDef,
} from "@/lib/tool-catalog";
import { ToolIcon } from "@/components/ToolIcon";

const ToolCard = ({ tool }: { tool: ToolDef }) => {
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
        {tool.badge && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
              tool.badge === "Pro"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-primary/10 text-primary",
            )}
          >
            {tool.badge === "Pro" && <Crown className="h-3 w-3" />}
            {tool.badge}
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
};

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
      const cat = TOOL_CATEGORIES.find((c) => c.id === t.category);
      const hay = `${t.name} ${t.tagline} ${t.id.replace(/-/g, " ")} ${cat?.label ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [query]);

  const searching = results !== null;

  return (
    <PageShell
      title="Tools"
      description="579 free online tools for developers, designers and creators - no account needed."
      fullWidth
      compactHero
    >
      <div className="px-2 pb-4 pt-0 sm:px-4 sm:py-4">
        {/* Inner header hidden on mobile: PageShell already shows title + description,
            so the search lands directly beneath it on small screens. */}
        <div className="hidden items-center gap-3 sm:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tools</h1>
            <p className="text-sm text-muted-foreground">
              {LIVE_TOOLS.length} free tools, grouped by what they do - 5 free uses per tool, no account needed.
            </p>
          </div>
        </div>

        {/* Search sits directly beneath the heading + description (tight on mobile) */}
        <div className="mb-10 mt-2 sm:mt-6">
          <div className="relative mx-auto max-w-2xl">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 579 tools - try &quot;json&quot;, &quot;qr code&quot;, &quot;contrast&quot;..."
              aria-label="Search tools"
              className="h-14 w-full rounded-2xl border-2 border-border bg-card pr-12 text-base shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary sm:h-16 sm:text-lg"
              style={{ paddingLeft: "3.25rem" }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {searching && (
            <p className="mt-3 text-center text-sm text-muted-foreground" role="status">
              {results.length === 0 ? (
                <>No tools match &quot;{query.trim()}&quot;</>
              ) : (
                <>
                  {results.length} result{results.length === 1 ? "" : "s"} for &quot;{query.trim()}&quot;
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
              {results.map((t) => (
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
            <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
              {toolsByCategory(activeCat.id).map((t) => (
                <ToolCard key={t.id} tool={t} />
              ))}
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
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                    {tools.map((t) => (
                      <ToolCard key={t.id} tool={t} />
                    ))}
                  </div>
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
