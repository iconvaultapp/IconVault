import { useMemo, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { AnimatedPreview } from "@/components/AnimatedPreview";
import { ANIMATED_ICONS, ANIMATED_PACKS, ANIMATED_PREMIUM, ANIMATED_TOTAL } from "@/lib/animated-icons-data";
import { ProPickBadge } from "@/components/V55Download";

export const Route = createLazyFileRoute("/animated-icons")({
  component: Page,
});

const PAGE_SIZE = 60;

const PACK_LABELS: Record<string, string> = {
  meteocons: "Meteocons (weather)",
  "svg-loaders": "SVG-Loaders",
  whirl: "Whirl",
  spinkit: "SpinKit",
  "epic-spinners": "Epic Spinners",
};

function Page() {
  const [query, setQuery] = useState("");
  const [pack, setPack] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ANIMATED_ICONS.filter((a) => {
      if (pack !== "all" && a.pack !== pack) return false;
      if (q && !(a.title + " " + a.slug + " " + a.packName).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, pack]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <PageShell
      eyebrow="Animated icons"
      title="Free animated icons"
      description={`${ANIMATED_TOTAL} free MIT-licensed animated icons. Everything previews live here; downloads are free except ${ANIMATED_PREMIUM} curated Meteocons Pro picks. "Pro pick" means a curated favourite — never exclusive content.`}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Already in the IconVault library</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Animated icon packs already indexed — no duplicate files were added for these:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/packs/$prefix"
              params={{ prefix: "line-md" }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              line-md — 1,279 animated icons →
            </Link>
            <Link
              to="/packs/$prefix"
              params={{ prefix: "svg-spinners" }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              svg-spinners — 46 animated icons →
            </Link>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search animated icons…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <select
            value={pack}
            onChange={(e) => {
              setPack(e.target.value);
              setPage(0);
            }}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm"
            aria-label="Filter by pack"
          >
            <option value="all">All packs</option>
            {ANIMATED_PACKS.map((p) => (
              <option key={p} value={p}>
                {PACK_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {visible.length} of {filtered.length} icons (page {safePage + 1} of {pageCount})
        </p>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {visible.map((a) => (
            <Link
              key={a.slug}
              to="/animated-icons/$slug"
              params={{ slug: a.slug }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center hover:border-primary"
            >
              <AnimatedPreview item={a} size={56} />
              <span className="text-xs font-medium leading-tight">{a.title}</span>
              <span className="text-[11px] text-muted-foreground">
                {a.packName} · {a.format}
                {!a.animated && " · static SVG"}
              </span>
              {a.premium && <ProPickBadge />}
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No animated icons match that search.
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Next →
          </button>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">Notes on this gallery</h2>
          <p className="mt-2">
            Meteocons files come from the author&apos;s published MIT npm packages, not the git repo
            (whose packages are stubs at HEAD). 28 Meteocons SVGs are static — their Lottie JSON
            version is the animated one, and they are labelled as such. Whirl&apos;s grow-fade-dots
            and orbit-star are not listed: they exist only as SCSS and no SCSS compiler is available
            here, so listing them would ship broken items. Component-only libraries (lucide-animated,
            AnimateIcons, Its Hover, heroicons-animated) have no entries here — their icons are React
            components, not files, and converting them is a separate future build task. Nothing here
            uses Lordicon, LottieFiles bulk files, or useAnimations bulk files.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
