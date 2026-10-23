// Homepage "Popular libraries" section: the biggest icon sets on IconVault.
// v3 (Sameer 2026-10-23, style-grid reference): every set is a pastel panel
// filled with 9 large real icons, each set on its own stable tint colour;
// the set name and its real icon count sit below the panel. All names and
// counts come from the real collection index.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Layers } from "lucide-react";
import { IconPanel, type PanelIcon } from "@/components/IconPanel";
import { Reveal } from "@/components/Reveal";
import {
  fetchCollectionIcons,
  fetchCollections,
  parseIconId,
  type IconifyCollection,
} from "@/lib/iconify";

const FEATURED = ["lucide", "tabler", "mdi", "material-symbols", "heroicons"];
const ROWS = ["ph", "fluent-emoji-flat", "bi", "carbon", "solar", "twemoji"];
const ALL_SETS = [...FEATURED, ...ROWS];

function toPanelIcons(ids: string[], prefix: string): PanelIcon[] {
  return ids.map((id) => {
    const parsed = id.includes(":") ? parseIconId(id) : { prefix, name: id };
    return { key: id, prefix: parsed.prefix, name: parsed.name };
  });
}

function SetCard({
  prefix,
  collection,
}: {
  prefix: string;
  collection: IconifyCollection;
}) {
  // 9 real icons per panel: the collection ships only 6 curated samples,
  // the rest come from the local per-set name index.
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void fetchCollectionIcons(prefix, 12).then((ids) => {
      if (alive) setNames(ids);
    });
    return () => {
      alive = false;
    };
  }, [prefix]);

  const ids = (names.length > 0 ? names : (collection.samples ?? [])).slice(0, 9);

  return (
    <Link
      to="/app"
      search={{ set: prefix }}
      className="focus-ring group block"
      aria-label={`Browse ${collection.name} icons`}
    >
      <IconPanel tintKey={prefix} icons={toPanelIcons(ids, prefix)} size={44} />
      <span className="mt-4 flex items-start gap-2 px-1">
        <span className="min-w-0">
          <span className="block truncate font-display text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
            {collection.name}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {collection.total.toLocaleString("en-US")} icons
          </span>
        </span>
        <ArrowUpRight className="ml-auto mt-1 h-5 w-5 shrink-0 -translate-x-1 translate-y-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      </span>
    </Link>
  );
}

export default function PopularLibraries() {
  const [collections, setCollections] = useState<Record<string, IconifyCollection>>({});

  useEffect(() => {
    let alive = true;
    void fetchCollections().then((c) => {
      if (alive) setCollections(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  const totalLibraries = Object.keys(collections).length;
  const sets = ALL_SETS.filter((p) => collections[p]);

  return (
    <section className="relative overflow-hidden">
      <span className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-[1440px] px-5 py-20 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow"><span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> The vault · {totalLibraries > 0 ? totalLibraries : 239} libraries</span></p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Popular <span className="text-gradient">libraries</span>
            </h2>
            <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">
              The same icons in every set, side by side, so you can feel the style before you commit.
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              to="/libraries"
              className="focus-ring group inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              {totalLibraries > 0 ? `All ${totalLibraries} libraries` : "All libraries"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        {sets.length === 0 ? (
          <div className="mt-10 grid gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-[1.5rem] bg-surface-2" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sets.map((prefix, i) => (
              <Reveal key={prefix} delay={(i % 4) * 60}>
                <SetCard prefix={prefix} collection={collections[prefix]!} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
