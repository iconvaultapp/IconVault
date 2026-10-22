// Homepage "Popular libraries" section: the biggest icon sets on IconVault,
// shown with live sample icons so visitors can compare styles side by side.
// All names, counts and licences come from the real collection index.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
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
    <div className={`grid gap-2 rounded-2xl bg-muted/50 p-3.5 ${cols}`}>
      {samples.map((sample) => {
        const parsed = sample.includes(":") ? parseIconId(sample) : { prefix, name: sample };
        return (
          <span key={sample} className="grid place-items-center py-1">
            <ReliableIcon
              prefix={parsed.prefix}
              name={parsed.name}
              alt=""
              width={size}
              height={size}
              className="opacity-80"
            />
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
      className="surface-card lift-hover focus-ring group flex h-full flex-col p-5"
      aria-label={`Browse ${collection.name} icons`}
    >
      <Samples
        prefix={prefix}
        collection={collection}
        count={large ? 24 : 8}
        cols={large ? "grid-cols-6 sm:grid-cols-8" : "grid-cols-4"}
      />
      <h3 className="mt-4 font-display text-lg font-semibold transition-colors group-hover:text-primary">
        {collection.name}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {DESCRIPTIONS[prefix] ?? `${collection.name} icon set, ready to search and export.`}
      </p>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">{collection.total.toLocaleString("en-US")} icons</span>
        {collection.license?.title && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">{collection.license.title}</span>
        )}
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
    <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Popular libraries</h2>
            <p className="mt-2 text-muted-foreground">Same icons in each set, so you can compare styles.</p>
          </div>
          <Link
            to="/collections"
            className="focus-ring group inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            {totalLibraries > 0 ? `All ${totalLibraries} libraries` : "All libraries"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>

      {featured.length === 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl border border-border bg-surface-2" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((prefix, i) => (
              <Reveal key={prefix} delay={i * 60} className={i === 0 ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""}>
                <LibraryCard prefix={prefix} collection={collections[prefix]!} large={i === 0} />
              </Reveal>
            ))}
          </div>

          <div className="mt-2 grid gap-x-10 md:grid-cols-2">
            {rows.map((prefix) => {
              const collection = collections[prefix]!;
              return (
                <Link
                  key={prefix}
                  to="/app"
                  search={{ set: prefix }}
                  className="focus-ring group flex items-center justify-between gap-4 border-b border-border py-4"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-base font-semibold transition-colors group-hover:text-primary">
                      {collection.name}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">
                      {collection.total.toLocaleString("en-US")} icons
                      {collection.license?.title ? ` · ${collection.license.title}` : ""}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-3.5 sm:flex" aria-hidden>
                    {(collection.samples ?? []).slice(0, 8).map((sample) => {
                      const parsed = sample.includes(":") ? parseIconId(sample) : { prefix, name: sample };
                      return (
                        <ReliableIcon
                          key={sample}
                          prefix={parsed.prefix}
                          name={parsed.name}
                          alt=""
                          width={17}
                          height={17}
                          className="opacity-70"
                        />
                      );
                    })}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
