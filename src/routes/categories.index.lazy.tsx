import { useEffect, useRef, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LayoutGrid, Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import ReliableIcon from "@/components/ReliableIcon";
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
      if (alive) setIcons(ids.slice(0, 6));
    });
    return () => {
      alive = false;
    };
  }, [inView, category.slug]);

  return (
    <div ref={ref} className="h-full">
      <Link
        to="/categories/$slug"
        params={{ slug: category.slug }}
        className="surface-card lift-hover focus-ring group relative flex h-full flex-col overflow-hidden p-5"
        aria-label={`Browse ${category.name} icons`}
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)] opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="flex items-start justify-between gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110">
            <LayoutGrid className="h-6 w-6" />
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </span>
        <span className="mt-4 block truncate font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
          {category.name}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          <span className="font-display text-base font-semibold text-foreground">
            {category.count.toLocaleString("en-US")}
          </span>{" "}
          icons
        </span>
        <span className="mt-4 flex items-center gap-3.5 rounded-xl bg-[image:var(--gradient-hero)] px-4 py-3 ring-1 ring-inset ring-border/60">
          {icons.length > 0
            ? icons.map((id, i) => {
                const parsed = parseIconId(id);
                return (
                  <span
                    key={id}
                    className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-125"
                    style={{ transitionDelay: `${i * 40}ms` }}
                  >
                    <ReliableIcon
                      prefix={parsed.prefix}
                      name={parsed.name}
                      alt=""
                      width={22}
                      height={22}
                      className="opacity-80 group-hover:opacity-100"
                    />
                  </span>
                );
              })
            : [0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="h-[22px] w-[22px] animate-pulse rounded-md bg-muted" />
              ))}
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

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
