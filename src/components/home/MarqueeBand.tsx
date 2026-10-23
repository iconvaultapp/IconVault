// Homepage marquee band, premium rebuild (Sameer 2026-10-23): the big icon
// sets as rich pills - a real sample icon, the set name and its icon count -
// scrolling in a seamless loop with soft edge fades. Pauses on hover, and
// every pill opens that set in the vault.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import ReliableIcon from "@/components/ReliableIcon";
import { fetchCollections, parseIconId, type IconifyCollection } from "@/lib/iconify";

const SETS: { name: string; prefix: string }[] = [
  { name: "Lucide", prefix: "lucide" },
  { name: "Material Symbols", prefix: "material-symbols" },
  { name: "Phosphor", prefix: "ph" },
  { name: "Tabler", prefix: "tabler" },
  { name: "Remix Icon", prefix: "ri" },
  { name: "Solar", prefix: "solar" },
  { name: "Heroicons", prefix: "heroicons" },
  { name: "Carbon", prefix: "carbon" },
  { name: "Bootstrap", prefix: "bi" },
  { name: "Feather", prefix: "feather" },
  { name: "Iconoir", prefix: "iconoir" },
  { name: "Simple Icons", prefix: "simple-icons" },
];

export default function MarqueeBand() {
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

  return (
    <section
      className="group relative overflow-hidden border-y border-border bg-surface-2 py-5"
      aria-label="Popular icon sets"
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-surface-2 to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-surface-2 to-transparent"
        aria-hidden
      />
      <div className="flex w-max animate-marquee gap-4 pr-4 group-hover:[animation-play-state:paused]">
        {[...SETS, ...SETS].map((set, i) => {
          const collection = collections[set.prefix];
          const sample = collection?.samples?.[0];
          const parsed = sample
            ? sample.includes(":")
              ? parseIconId(sample)
              : { prefix: set.prefix, name: sample }
            : null;
          return (
            <Link
              key={`${set.prefix}-${i}`}
              to="/app"
              search={{ set: set.prefix }}
              className="focus-ring group/pill flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-surface py-2.5 pl-3 pr-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
              aria-label={`Browse ${set.name} icons`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-hero)] ring-1 ring-inset ring-border/60 transition-transform duration-300 group-hover/pill:scale-110">
                {parsed ? (
                  <ReliableIcon prefix={parsed.prefix} name={parsed.name} alt="" width={20} height={20} />
                ) : (
                  <span className="h-5 w-5 animate-pulse rounded bg-muted" />
                )}
              </span>
              <span className="whitespace-nowrap font-display text-sm font-semibold tracking-tight">
                {set.name}
              </span>
              {collection && (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {collection.total.toLocaleString("en-US")} icons
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
