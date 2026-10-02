import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GitCompare, Plus, X, Loader2, Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, Stack, CTABand } from "@/components/kit";
import { getIconSvgUrl, searchIcons } from "@/lib/iconify";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare icons side by side | IconVault" },
      {
        name: "description",
        content:
          "Put candidate icons next to each other at real sizes, on light and dark surfaces, before you commit one to your design system.",
      },
      { property: "og:title", content: "Compare icons side by side" },
      {
        property: "og:description",
        content: "Compare candidate icons at real sizes on light and dark surfaces.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/compare" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/compare" }],
  }),
  component: Page,
});

const SIZES = [16, 20, 24, 32, 48];

function Page() {
  const [picked, setPicked] = useState<string[]>(["lucide:heart", "mdi:heart", "ph:heart"]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState("#0f766e");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchIcons(query.trim(), 24)
        .then((r) => {
          if (!cancelled) setResults(r.icons);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const add = (id: string) => {
    setPicked((prev) => (prev.includes(id) || prev.length >= 6 ? prev : [...prev, id]));
    setQuery("");
    setResults([]);
  };

  const parsed = useMemo(
    () =>
      picked.map((id) => {
        const [prefix = "", name = ""] = id.split(":");
        return { id, prefix, name };
      }),
    [picked],
  );

  return (
    <PageShell
      wide
      eyebrow="Tools"
      title="Compare icons before you commit"
      description="The same glyph looks different in every set - stroke weight, optical size, corner radius. Line up your candidates at the sizes you actually ship and pick with your eyes, not a hunch."
    >
      <Stack>
        <div>
          <Reveal>
            <div className="surface-card p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search an icon to add to the comparison…"
                    aria-label="Search an icon to add"
                    className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-10 text-sm outline-none transition-colors focus:border-primary/50"
                  />
                  {loading && (
                    <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Colour
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      aria-label="Preview colour"
                      className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setDark((v) => !v)}
                    className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {dark ? "Light surface" : "Dark surface"}
                  </button>
                </div>
              </div>

              {results.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {results.map((id) => {
                    const [prefix = "", name = ""] = id.split(":");
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => add(id)}
                        className="focus-ring group flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2 transition-colors hover:border-primary/40"
                        title={id}
                      >
                        <img
                          src={getIconSvgUrl(prefix, name, { width: 18, height: 18, color: "currentColor" })}
                          alt={name}
                          loading="lazy"
                          className="h-4.5 w-4.5"
                        />
                        <span className="max-w-32 truncate font-mono text-[11px] text-muted-foreground">{id}</span>
                        <Plus className="h-3 w-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {parsed.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <GitCompare className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-semibold">Nothing to compare yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Search above and add two or more icons. Six is the practical maximum before your eye stops
              being useful.
            </p>
          </div>
        ) : (
          <Reveal>
            <div
              className={cn(
                "overflow-x-auto rounded-2xl border border-border transition-colors",
                dark ? "bg-ink" : "bg-surface",
              )}
            >
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className={cn("border-b", dark ? "border-white/10" : "border-border")}>
                    <th
                      className={cn(
                        "w-24 px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest",
                        dark ? "text-white/50" : "text-muted-foreground",
                      )}
                    >
                      Size
                    </th>
                    {parsed.map((icon) => (
                      <th key={icon.id} className="px-5 py-3 text-left">
                        <span className="flex items-center justify-between gap-3">
                          <span
                            className={cn(
                              "truncate font-mono text-[11px]",
                              dark ? "text-white/70" : "text-muted-foreground",
                            )}
                          >
                            {icon.id}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${icon.id}`}
                            onClick={() => setPicked((p) => p.filter((x) => x !== icon.id))}
                            className={cn(
                              "focus-ring rounded-full p-1 transition-colors",
                              dark ? "text-white/50 hover:text-white" : "text-muted-foreground hover:text-destructive",
                            )}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SIZES.map((size) => (
                    <tr key={size} className={cn("border-b last:border-0", dark ? "border-white/10" : "border-border")}>
                      <td
                        className={cn(
                          "px-5 py-5 font-mono text-xs",
                          dark ? "text-white/50" : "text-muted-foreground",
                        )}
                      >
                        {size}px
                      </td>
                      {parsed.map((icon) => (
                        <td key={icon.id} className="px-5 py-5">
                          <img
                            src={getIconSvgUrl(icon.prefix, icon.name, {
                              width: size,
                              height: size,
                              color,
                            })}
                            alt={`${icon.id} at ${size} pixels`}
                            loading="lazy"
                            style={{ width: size, height: size }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}

        <div>
          <SectionHeading
            eyebrow="What to look for"
            title="Three things that decide it"
            description="Stroke weight against your type - a 1.5px icon next to a 400-weight label looks thin. Optical size - does it still read at 16px, or does the detail collapse? And corner language - rounded joins beside square buttons always feel borrowed."
          />
        </div>

        <CTABand
          title="Found the winner?"
          body="Save it to a collection so the rest of the team stops re-litigating the same chevron."
          primary={{ label: "Open my collections", to: "/collections" }}
          secondary={{ label: "Back to the vault", to: "/app" }}
        />
      </Stack>
    </PageShell>
  );
}
