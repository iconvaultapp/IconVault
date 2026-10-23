import { useEffect, useRef, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { IconPanel, type PanelIcon } from "@/components/IconPanel";
import { Reveal } from "@/components/Reveal";
import {
  fetchCategories,
  fetchCategoryIcons,
  parseIconId,
  type IconCategory,
} from "@/lib/iconify";

export const Route = createLazyFileRoute("/categories/")({
  component: Page,
});

/** Fires once when the element gets near the viewport (lazy sample strips). */
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

function CategoryCard({ category }: { category: IconCategory }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [icons, setIcons] = useState<string[]>([]);

  useEffect(() => {
    if (!inView) return;
    let alive = true;
    void fetchCategoryIcons(category.slug).then((ids) => {
      if (alive) setIcons(ids.slice(0, 9));
    });
    return () => {
      alive = false;
    };
  }, [inView, category.slug]);

  const panelIcons: PanelIcon[] = icons.map((id) => {
    const parsed = parseIconId(id);
    return { key: id, prefix: parsed.prefix, name: parsed.name };
  });

  return (
    <div ref={ref} className="h-full">
      <Link
        to="/categories/$slug"
        params={{ slug: category.slug }}
        className="focus-ring group block h-full"
        aria-label={`Browse ${category.name} icons`}
      >
        <IconPanel tintKey={category.slug} icons={panelIcons} size={38} />
        <span className="mt-4 flex items-start gap-2 px-1">
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
              {category.name}
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {category.count.toLocaleString("en-US")} icons
            </span>
          </span>
          <ArrowUpRight className="ml-auto mt-1 h-5 w-5 shrink-0 -translate-x-1 translate-y-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
        </span>
      </Link>
    </div>
  );
}

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
    <PageShell fullWidth>
      <Reveal>
        <div className="text-center">
          <p className="eyebrow">{categories.length > 0 ? categories.length : 215} categories</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Browse icons by <span className="text-gradient">category</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-muted-foreground">
            Every icon on IconVault, grouped into curated categories - from arrows and animals to
            weather, food and social media.
          </p>
        </div>
      </Reveal>

      <Reveal delay={70}>
        <div className="relative mt-8 w-full">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter categories…"
            className="focus-ring w-full rounded-full border border-border bg-surface py-3.5 pl-12 pr-5 text-base shadow-soft"
            aria-label="Filter categories"
          />
        </div>
        {categories.length > 0 && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Showing {filtered.length} of {categories.length} categories
            {query && (
              <>
                {" "}
                matching “{query}”
              </>
            )}
          </p>
        )}
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c, i) => (
          <Reveal key={c.slug} delay={Math.min(i * 25, 300)} className="h-full">
            <CategoryCard category={c} />
          </Reveal>
        ))}
      </div>

      {filtered.length === 0 && categories.length > 0 && (
        <p className="mt-10 text-center text-muted-foreground">No categories match “{query}”.</p>
      )}
    </PageShell>
  );
}

export default Page;
