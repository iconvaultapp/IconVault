// All-libraries page (Sameer 2026-10-23): every icon set on IconVault in one
// searchable, sortable grid with live sample icons - the page behind the
// homepage "All 239 libraries" button (which previously landed on the
// personal My Collections page).
import { useEffect, useMemo, useRef, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { IconPanel, type PanelIcon } from "@/components/IconPanel";
import { Reveal } from "@/components/Reveal";
import { fetchCollectionIcons, fetchCollections, parseIconId, type IconifyCollection } from "@/lib/iconify";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/libraries")({
  component: Page,
});

type SortId = "popular" | "az" | "za";

const SORTS: { id: SortId; label: string }[] = [
  { id: "popular", label: "Most icons" },
  { id: "az", label: "Name A–Z" },
  { id: "za", label: "Name Z–A" },
];

/** Fires once when the element gets near the viewport (lazy panel icons). */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "260px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

function LibraryCard({
  prefix,
  collection,
}: {
  prefix: string;
  collection: IconifyCollection;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    if (!inView) return;
    let alive = true;
    void fetchCollectionIcons(prefix, 12).then((ids) => {
      if (alive) setNames(ids);
    });
    return () => {
      alive = false;
    };
  }, [inView, prefix]);

  const ids = (names.length > 0 ? names : (collection.samples ?? [])).slice(0, 9);
  const icons: PanelIcon[] = ids.map((id) => {
    const parsed = id.includes(":") ? parseIconId(id) : { prefix, name: id };
    return { key: id, prefix: parsed.prefix, name: parsed.name };
  });

  return (
    <div ref={ref} className="h-full">
      <Link
        to="/app"
        search={{ set: prefix }}
        className="focus-ring group block h-full"
        aria-label={`Browse ${collection.name} icons`}
      >
        <IconPanel tintKey={prefix} icons={icons} size={38} />
        <span className="mt-4 flex items-start gap-2 px-1">
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
              {collection.name}
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {collection.total.toLocaleString("en-US")} icons
              {collection.license?.title ? ` · ${collection.license.title}` : ""}
            </span>
          </span>
          <ArrowUpRight className="ml-auto mt-1 h-5 w-5 shrink-0 -translate-x-1 translate-y-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
        </span>
      </Link>
    </div>
  );
}

function Page() {
  const [collections, setCollections] = useState<Record<string, IconifyCollection>>({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("popular");

  useEffect(() => {
    let alive = true;
    void fetchCollections().then((c) => {
      if (alive) setCollections(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  const all = useMemo(() => Object.entries(collections), [collections]);
  const totalIcons = useMemo(
    () => all.reduce((sum, [, c]) => sum + (c.total ?? 0), 0),
    [all],
  );

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? all.filter(
          ([prefix, c]) => c.name.toLowerCase().includes(q) || prefix.toLowerCase().includes(q),
        )
      : [...all];
    if (sort === "popular") list.sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0));
    if (sort === "az") list.sort((a, b) => a[1].name.localeCompare(b[1].name));
    if (sort === "za") list.sort((a, b) => b[1].name.localeCompare(a[1].name));
    return list;
  }, [all, query, sort]);

  return (
    <PageShell fullWidth>
      <Reveal>
        <div className="text-center">
          <p className="eyebrow">The vault · {all.length > 0 ? all.length : 239} libraries</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            All icon <span className="text-gradient">libraries</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-muted-foreground">
            Every open-source icon set on IconVault, side by side with live samples -{" "}
            {totalIcons > 0 ? `${totalIcons.toLocaleString("en-US")} icons` : "421,020 icons"} in
            total. Open a set to browse, copy and download.
          </p>
        </div>
      </Reveal>

      <Reveal delay={70}>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search libraries…"
              className="focus-ring w-full rounded-full border border-border bg-surface py-3.5 pl-12 pr-5 text-base shadow-soft"
              aria-label="Search libraries"
            />
          </div>
          <div
            className="inline-flex rounded-full bg-muted p-1 shadow-inner"
            role="group"
            aria-label="Sort libraries"
          >
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                aria-pressed={sort === s.id}
                className={cn(
                  "focus-ring rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  sort === s.id
                    ? "bg-ink text-background shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Showing {entries.length} of {all.length} libraries
        </p>
      </Reveal>

      {all.length === 0 ? (
        <div className="mt-8 grid gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-[1.5rem] bg-surface-2" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entries.map(([prefix, collection], i) => (
            <Reveal key={prefix} delay={Math.min(i * 20, 300)} className="h-full">
              <LibraryCard prefix={prefix} collection={collection} />
            </Reveal>
          ))}
        </div>
      )}

      {all.length > 0 && entries.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          No libraries match “{query}”.
        </p>
      )}
    </PageShell>
  );
}

export default Page;
