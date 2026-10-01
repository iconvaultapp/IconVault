import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/kit";
import { fetchCategories, type IconCategory } from "@/lib/iconify";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Browse icons by category - 200+ categories | IconVault" },
      {
        name: "description",
        content:
          "Explore free SVG icons by category: arrows, animals, food, weather, social media, maps and 200+ more curated categories.",
      },
      { property: "og:title", content: "Browse icons by category | IconVault" },
      {
        property: "og:description",
        content: "200+ curated icon categories - arrows, food, weather, social media and more.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/categories" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/categories" }],
  }),
  component: Page,
});

function Page() {
  const [categories, setCategories] = useState<IconCategory[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    void fetchCategories().then((c) => {
      if (alive) setCategories(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = query
    ? categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : categories;

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <SectionHeading
          eyebrow={`${categories.length} categories`}
          title="Browse icons by category"
        />
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every icon on IconVault, grouped into curated categories - from arrows and animals
          to weather, food and social media.
        </p>

        <div className="mt-6 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter categories…"
            className="focus-ring w-full rounded-full border border-border bg-surface px-5 py-2.5 text-sm"
            aria-label="Filter categories"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((c, i) => (
            <Reveal key={c.slug} delay={Math.min(i * 20, 300)}>
              <Link
                to="/categories/$slug"
                params={{ slug: c.slug }}
                className="focus-ring group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted/60 text-muted-foreground transition-colors group-hover:bg-primary-soft group-hover:text-primary">
                  <LayoutGrid className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.count.toLocaleString("en-US")} icons
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            No categories match “{query}”.
          </p>
        )}
      </div>
    </PageShell>
  );
}

export default Page;
