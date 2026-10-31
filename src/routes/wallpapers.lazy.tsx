import { useMemo, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { WALLPAPERS, WALLPAPER_CATEGORIES, WALLPAPER_COUNTS, WALLPAPERS_TOTAL } from "@/lib/wallpapers-data";
import { downloadUrlWithGate } from "@/lib/download-guard";

export const Route = createLazyFileRoute("/wallpapers")({
  component: Page,
});

function Page() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WALLPAPERS.filter((w) => {
      if (category !== "all" && w.category !== category) return false;
      if (q && !(w.title + " " + w.slug + " " + w.category).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  return (
    <PageShell
      eyebrow="Wallpapers"
      title="Original wallpapers"
      description={`${WALLPAPERS_TOTAL} original wallpapers, made in code in the IconVault theme. Preview free. Downloads need a free account.`}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wallpapers…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {WALLPAPER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c} ({WALLPAPER_COUNTS[c]})
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {WALLPAPERS_TOTAL} wallpapers · 3D: {WALLPAPER_COUNTS["3D"]}, Gradient:{" "}
          {WALLPAPER_COUNTS["Gradient"]}, Geometric: {WALLPAPER_COUNTS["Geometric"]}, Nature: {WALLPAPER_COUNTS["Nature"]}
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => (
            <article key={w.slug} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <Link to="/wallpapers/$slug" params={{ slug: w.slug }} aria-label={`View ${w.title}`}>
                <img
                  src={w.preview}
                  alt={`${w.title} wallpaper preview`}
                  loading="lazy"
                  width={1920}
                  height={1080}
                  className="aspect-video w-full object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-base font-semibold">
                  <Link to="/wallpapers/$slug" params={{ slug: w.slug }} className="hover:underline">
                    {w.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {w.category} · Mobile 1080x1920 · Desktop 1920x1080 · WebP and JPG
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    to="/wallpapers/$slug"
                    params={{ slug: w.slug }}
                    className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    View sizes
                  </Link>
                  <button
                    type="button"
                    onClick={() => downloadUrlWithGate(w.sizes[1]?.webp ?? w.preview, `${w.slug}-desktop.webp`)}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Download desktop WebP
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No wallpapers match that search.
          </p>
        )}

        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">About these wallpapers</h2>
          <p className="mt-2">
            Every wallpaper here is original artwork generated in code (vector gradients, shapes and
            shadows). The 3D category is 3D look art made in code, not a photograph and not a 3D
            render. Nothing here comes from a stock photo site or a wallpaper app. Each wallpaper
            comes in mobile 1080x1920 and desktop 1920x1080, in both WebP and JPG. Previews are
            free to view; taking a file needs a free account, and you will be asked to sign in if
            you are not signed in yet.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
