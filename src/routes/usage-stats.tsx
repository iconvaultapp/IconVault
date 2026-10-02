import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Clock, Download, FolderOpen, Search, TrendingUp } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { SectionHeading, Stack, CTABand } from "@/components/kit";
import { useFavourites } from "@/hooks/useFavourites";
import { useCollections } from "@/hooks/useCollections";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { getIconSvgUrl } from "@/lib/iconify";
import { downloadCsv, stamp } from "@/lib/csv";

export const Route = createFileRoute("/usage-stats")({
  head: () => ({
    meta: [
      { title: "Your usage stats | IconVault" },
      {
        name: "description",
        content:
          "See which icon sets you actually rely on, how many icons you've saved, and where your searches are going - a quick read on your icon habits.",
      },
      { property: "og:title", content: "Your usage stats" },
      {
        property: "og:description",
        content: "See which icon sets you rely on and how your searches trend.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/usage-stats" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/usage-stats" }],
  }),
  component: Page,
});

function Page() {
  const { favourites } = useFavourites();
  const { collections } = useCollections();
  const { recent } = useRecentlyViewed();
  const { history } = useSearchHistory();

  const setUsage = useMemo(() => {
    const counts = new Map<string, number>();
    [...favourites, ...recent].forEach((id) => {
      const prefix = id.split(":")[0];
      if (prefix) counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    });
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = entries[0]?.[1] ?? 1;
    return entries.map(([prefix, count]) => ({ prefix, count, pct: Math.round((count / max) * 100) }));
  }, [favourites, recent]);

  const savedIcons = useMemo(
    () => collections.reduce((n, c) => n + (c.icon_ids?.length ?? 0), 0),
    [collections],
  );

  const stats = [
    { icon: Heart, label: "Favourites", value: favourites.length, to: "/collections" },
    { icon: FolderOpen, label: "Collections", value: collections.length, to: "/collections" },
    { icon: Clock, label: "Icons viewed", value: recent.length, to: "/history" },
    { icon: Search, label: "Searches run", value: history.length, to: "/history" },
  ] as const;

  return (
    <PageShell
      wide
      eyebrow="Your account"
      title="Usage stats"
      description="A read on your own icon habits: what you save, what you search, and which sets you keep coming back to."
    >
      <Stack>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              const rows: unknown[][] = [
                ["summary", "Favourites", favourites.length],
                ["summary", "Collections", collections.length],
                ["summary", "Icons in collections", savedIcons],
                ["summary", "Icons viewed", recent.length],
                ["summary", "Searches run", history.length],
                ...setUsage.map((r) => ["set usage", r.prefix, r.count]),
                ...history.map((h) => ["search", h.query, h.results ?? ""]),
                ...favourites.map((id) => ["favourite", id, ""]),
                ...recent.map((id) => ["viewed icon", id, ""]),
              ];
              downloadCsv(`iconvault-usage-stats-${stamp()}.csv`, ["Type", "Item", "Value"], rows);
            }}
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 45}>
              <Link to={stat.to} className="surface-card lift-hover block h-full p-5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <stat.icon className="h-4.5 w-4.5" />
                </span>
                <p className="mt-4 font-display text-3xl font-semibold tabular-nums">
                  <CountUp value={stat.value} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </Link>
            </Reveal>
          ))}
        </div>

        <div>
          <SectionHeading
            eyebrow="Distribution"
            title="Sets you actually use"
            description="Based on the icons you've favourited and opened. If one set dominates, that's usually a good sign - mixing families is what makes an interface feel assembled."
          />
          <div className="mt-8">
            {setUsage.length > 0 ? (
              <div className="surface-card divide-y divide-border">
                {setUsage.map((row, i) => (
                  <Reveal key={row.prefix} delay={i * 40}>
                    <div className="flex items-center gap-4 px-5 py-4">
                      <img
                        src={getIconSvgUrl(row.prefix, "home", { width: 18, height: 18, color: "currentColor" })}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-4.5 w-4.5 opacity-70"
                      />
                      <span className="w-28 shrink-0 truncate font-mono text-xs text-muted-foreground">
                        {row.prefix}
                      </span>
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {row.count}
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="surface-card p-10 text-center">
                <TrendingUp className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-semibold">Not enough activity yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Favourite a few icons and this fills in with the sets you lean on.
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Collections" title="What you've saved" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.length > 0 ? (
              collections.map((collection, i) => (
                <Reveal key={collection.id} delay={i * 40}>
                  <Link to="/collections" className="surface-card lift-hover block h-full p-5">
                    <h3 className="font-display text-base font-semibold">{collection.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {collection.icon_ids?.length ?? 0} icons
                    </p>
                  </Link>
                </Reveal>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No collections yet - {savedIcons} icons saved.
              </p>
            )}
          </div>
        </div>

        <CTABand
          title="Turn habits into a system"
          body="Lock your team to one icon family, share the collection, and stop the drift before it starts."
          primary={{ label: "See team workspaces", to: "/team" }}
          secondary={{ label: "Browse icons", to: "/app" }}
        />
      </Stack>
    </PageShell>
  );
}
