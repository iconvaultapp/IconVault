// Homepage "Popular libraries" section: the biggest icon sets on IconVault,
// shown with live sample icons so visitors can compare styles side by side.
// All names, counts and licences come from the real collection index.
// v2 (Sameer 2026-10-23): richer cards, gradient headline word, staggered
// icon animation on hover, card-style rows - same theme, more premium feel.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import ReliableIcon from "@/components/ReliableIcon";
import { Reveal } from "@/components/Reveal";
import { fetchCollections, parseIconId, type IconifyCollection } from "@/lib/iconify";

const DESCRIPTIONS: Record<string, string> = {
  lucide: "Clean 2px outline icons, the shadcn/ui default.",
  tabler: "Consistent 24px outline set, huge range.",
  mdi: "Google style icons, community extended.",
  "material-symbols": "Google Material: outline, rounded and sharp.",
  heroicons: "Made by the Tailwind CSS team.",
};

const FEATURED = ["lucide", "tabler", "mdi", "material-symbols", "heroicons"];
const ROWS = ["ph", "fluent-emoji-flat", "bi", "carbon", "solar", "twemoji"];

function Samples({
  prefix,
  collection,
  count,
  cols,
  size = 20,
}: {
  prefix: string;
  collection: IconifyCollection;
  count: number;
  cols: string;
  size?: number;
}) {
  const samples = (collection.samples ?? []).slice(0, count);
  if (samples.length === 0) return null;
  return (
    <div
      className={`grid gap-2 rounded-2xl bg-[image:var(--gradient-hero)] p-4 ring-1 ring-inset ring-border/60 ${cols}`}
    >
      {samples.map((sample, i) => {
        const parsed = sample.includes(":") ? parseIconId(sample) : { prefix, name: sample };
        return (
          <span
            key={sample}
            className="grid place-items-center py-1 transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-125"
            style={{ transitionDelay: `${i * 35}ms` }}
          >
            <ReliableIcon prefix={parsed.prefix} name={parsed.name} alt="" width={size} height={size} className="opacity-80 transition-opacity group-hover:opacity-100" />
          </span>
        );
      })}
    </div>
  );
}

function LibraryCard({
  prefix,
  collection,
  large = false,
}: {
  prefix: string;
  collection: IconifyCollection;
  large?: boolean;
}) {
  return (
    <Link
      to="/app"
      search={{ set: prefix }}
      className="surface-card lift-hover focus-ring group relative flex h-full flex-col overflow-hidden p-5"
      aria-label={`Browse ${collection.name} icons`}
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)] opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
      <Samples
        prefix={prefix}
        collection={collection}
        count={large ? 24 : 8}
        cols={large ? "grid-cols-6 sm:grid-cols-8" : "grid-cols-4"}
      />
      <h3 className="mt-5 font-display text-[1.35rem] font-semibold tracking-tight transition-colors group-hover:text-primary">
        {collection.name}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {DESCRIPTIONS[prefix] ?? `${collection.name} icon set, ready to search and export.`}
      </p>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-[1.7rem] font-semibold leading-none tracking-tight">
          {collection.total.toLocaleString("en-US")}
        </span>
        <span className="text-sm text-muted-foreground">icons</span>
        {collection.license?.title && (
          <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[11px] font-medium text-primary">
            {collection.license.title}
          </span>
        )}
        <ArrowUpRight className="ml-auto h-5 w-5 -translate-x-1 translate-y-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      </p>
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
  const featured = FEATURED.filter((p) => collections[p]);
  const rows = ROWS.filter((p) => collections[p]);

  return (
    <section className="relative overflow-hidden">
      <span className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="eyebrow">The vault · {totalLibraries > 0 ? totalLibraries : 239} libraries</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Popular <span className="text-gradient">libraries</span>
              </h2>
              <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">
                The same icons in every set, side by side, so you can feel the style before you commit.
              </p>
            </div>
            <Link
              to="/collections"
              className="focus-ring group inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              {totalLibraries > 0 ? `All ${totalLibraries} libraries` : "All libraries"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        {featured.length === 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl border border-border bg-surface-2" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((prefix, i) => (
                <Reveal key={prefix} delay={i * 70} className={i === 0 ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""}>
                  <LibraryCard prefix={prefix} collection={collections[prefix]!} large={i === 0} />
                </Reveal>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {rows.map((prefix, i) => {
                const collection = collections[prefix]!;
                return (
                  <Reveal key={prefix} delay={i * 50}>
                    <Link
                      to="/app"
                      search={{ set: prefix }}
                      className="surface-card lift-hover focus-ring group flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-display text-[1.05rem] font-semibold tracking-tight transition-colors group-hover:text-primary">
                          {collection.name}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{collection.total.toLocaleString("en-US")}</span>{" "}
                          icons{collection.license?.title ? ` · ${collection.license.title}` : ""}
                        </span>
                      </span>
                      <span className="hidden shrink-0 items-center gap-3 sm:flex" aria-hidden>
                        {(collection.samples ?? []).slice(0, 8).map((sample, j) => {
                          const parsed = sample.includes(":") ? parseIconId(sample) : { prefix, name: sample };
                          return (
                            <span
                              key={sample}
                              className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-125"
                              style={{ transitionDelay: `${j * 30}ms` }}
                            >
                              <ReliableIcon prefix={parsed.prefix} name={parsed.name} alt="" width={17} height={17} className="opacity-70 group-hover:opacity-100" />
                            </span>
                          );
                        })}
                      </span>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
