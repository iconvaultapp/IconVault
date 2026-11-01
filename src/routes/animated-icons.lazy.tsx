import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// v63 cloud-last classifier: a Meteocons icon counts as cloud-type when its
// slug names a cloud-bearing weather phenomenon (Thunderstorms included).
// Verified against the actual SVG group ids / Lottie layer names where the
// name alone was ambiguous: rainbow, lightning-bolt, snowman, snowflake,
// raindrop and wind-dust carry no cloud shape, so they stay out (snowman /
// snowflake / raindrop* / wind-dust / flag-hurricane-warning /
// thermometer-raindrop are explicit exclusions, not keyword misses).
// Result on the 625-entry gallery: 316 cloud icons sort last, 309 first.
const CLOUD_KEYWORDS = [
  "cloud",
  "overcast",
  "drizzle",
  "rain",
  "snow",
  "hail",
  "sleet",
  "fog",
  "haze",
  "smoke",
  "dust",
  "thunderstorm",
  "mist",
  "tornado",
  "hurricane",
  "extreme",
];
const CLOUD_EXCLUSIONS = new Set([
  "meteocons-fill-snowman",
  "meteocons-fill-snowflake",
  "meteocons-fill-raindrop",
  "meteocons-fill-raindrop-measure",
  "meteocons-fill-raindrops",
  "meteocons-fill-wind-dust",
  "meteocons-fill-flag-hurricane-warning",
  "meteocons-fill-thermometer-raindrop",
]);

function isCloudAnimated(a: { pack: string; slug: string }): boolean {
  return (
    a.pack === "meteocons" &&
    CLOUD_KEYWORDS.some((k) => a.slug.includes(k)) &&
    !CLOUD_EXCLUSIONS.has(a.slug)
  );
}

function Page() {
  const [query, setQuery] = useState("");
  const [pack, setPack] = useState("all");
  // v59 infinite scroll: visibleCount starts at one page (60) and grows
  // by 60 each time the sentinel scrolls into view, capped at the
  // filtered total. Filter/search changes reset it to 60.
  const [visibleCount, setVisibleCount] = useState(60);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = ANIMATED_ICONS.filter((a) => {
      if (pack !== "all" && a.pack !== pack) return false;
      if (q && !(a.title + " " + a.slug + " " + a.packName).toLowerCase().includes(q)) return false;
      return true;
    });
    // v63 cloud-last: cloud-type Meteocons (Thunderstorms and every other
    // cloud-bearing weather icon) sort to the end of the gallery, so the
    // first screens are loaders/spinners and non-cloud weather. Premium-first
    // still applies inside each group (the 3 non-cloud Pro picks —
    // clear-day, clear-night, wind — still lead). Gallery-local stable sort
    // only — the data file itself is never reordered, so the detail pages
    // and counts are untouched.
    const ordered = [...list].sort(
      (a, b) =>
        Number(isCloudAnimated(a)) - Number(isCloudAnimated(b)) ||
        Number(b.premium) - Number(a.premium),
    );
    return ordered;
  }, [query, pack]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Sentinel pattern reused from BrowsePage: a callback ref so the
  // observer always tracks the CURRENT sentinel node (a plain ref +
  // effect can go stale when React swaps the node during re-renders).
  const totalRef = useRef(0);
  totalRef.current = filtered.length;
  const sentinelObserver = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((el: HTMLDivElement | null) => {
    sentinelObserver.current?.disconnect();
    sentinelObserver.current = null;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => (n < totalRef.current ? Math.min(n + PAGE_SIZE, totalRef.current) : n));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    sentinelObserver.current = io;
  }, []);
  useEffect(() => () => sentinelObserver.current?.disconnect(), []);

  return (
    <PageShell
      fluid
      eyebrow="Animated icons"
      title="Free animated icons"
      description={`${ANIMATED_TOTAL} free MIT-licensed animated icons. Everything previews live here; downloads are free except ${ANIMATED_PREMIUM} curated Meteocons Pro picks. "Pro pick" means a curated favourite — never exclusive content.`}
    >
      <div className="w-full space-y-6">
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
                setVisibleCount(60);
              }}
              placeholder="Search animated icons…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <select
            value={pack}
            onChange={(e) => {
              setPack(e.target.value);
              setVisibleCount(60);
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
          Showing {visible.length} of {filtered.length} icons
        </p>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {visible.map((a) => (
            <Link
              key={a.slug}
              to="/animated-icons/$slug"
              params={{ slug: a.slug }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center hover:border-primary"
            >
              <AnimatedPreview item={a} size={76} interactive={false} />
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

        {/* v59 infinite-scroll sentinel: when it scrolls near the viewport
            the next 60 icons append. The sentinel stays mounted while
            more icons remain, so scrolling never dead-ends; the loading
            line below it holds layout steady (no jumps). */}
        {hasMore && (
          <>
            <div ref={sentinelRef} className="py-2 text-center text-sm text-muted-foreground" aria-live="polite">
              Loading more icons…
            </div>
            {/* v60 manual fallback for the same append: if the observer
                never fires (e.g. a stale live chunk), this button still
                loads the next 60. The sentinel above is untouched. */}
            <div className="pb-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length))}
                className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-accent"
              >
                Load more icons
              </button>
            </div>
          </>
        )}
        {!hasMore && filtered.length > 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Showing all {filtered.length} icons.
          </p>
        )}

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
