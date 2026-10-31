import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import IconifyGrid from "@/components/IconifyGrid";
import { GridPagination } from "@/components/GridPagination";
import IconifyDetail from "@/components/IconifyDetail";
import { SectionHeading } from "@/components/kit";
import categoriesData from "../../public/iconify/categories.json";
import { fetchCategoryIcons, type IconCategory } from "@/lib/iconify";

const staticCategories = categoriesData as IconCategory[];

export const Route = createFileRoute("/categories/$slug")({
  loader: async ({ params }) => {
    // Static import: loaders run on the server where relative fetch() fails.
    const category = staticCategories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.category.name ?? "Category";
    const count = loaderData?.category.count ?? 0;
    const title = `${name} icons - ${count.toLocaleString("en-US")} free SVG icons | IconVault`;
    const description = `Browse ${count.toLocaleString("en-US")} free ${name.toLowerCase()} icons. Download as SVG, PNG, WebP or copy-paste React components - free; downloads need a free account.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `/categories/${loaderData?.category.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://iconvault.site/categories/${loaderData?.category.slug}` }],
    };
  },
  component: Page,
});

const PAGE_SIZE = 96;

function Page() {
  const { category } = Route.useLoaderData();
  const [icons, setIcons] = useState<string[]>([]);
  // PERF-H3: real pagination, not "Load more". One page is 96 cards; the
  // old accumulator grew the DOM to 2,000 cards and never shrank it.
  const [page, setPage] = useState(0);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setPage(0);
    void fetchCategoryIcons(category.slug).then((ids) => {
      if (alive) setIcons(ids);
    });
    return () => {
      alive = false;
    };
  }, [category.slug]);

  const totalPages = Math.max(1, Math.ceil(icons.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = useMemo(
    () => icons.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [icons, safePage],
  );
  const gotoPage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageShell fullWidth>
      <div className="w-full pb-12 pt-2">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/categories" className="hover:text-foreground">Categories</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{category.name}</span>
        </nav>

        <div className="mt-6">
          <SectionHeading
            eyebrow={`${category.count.toLocaleString("en-US")} icons`}
            title={`${category.name} icons`}
          />
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Free {category.name.toLowerCase()} icons from every pack on IconVault - download as
            SVG, PNG, WebP or copy-paste React components.
          </p>
        </div>

        <div className="mt-6" ref={gridRef}>
          <IconifyGrid icons={visible} onIconClick={setActiveIcon} />
        </div>

        <GridPagination
          page={safePage}
          totalPages={totalPages}
          total={icons.length}
          pageSize={PAGE_SIZE}
          onPage={gotoPage}
        />

        <p className="mt-10 text-sm text-muted-foreground">
          Explore more{" "}
          <Link to="/categories" className="text-primary hover:underline">
            icon categories
          </Link>{" "}
          or browse all{" "}
          <Link to="/app" className="text-primary hover:underline">
            icon packs
          </Link>
          .
        </p>

        <section aria-label={`About ${category.name} icons`} className="mt-10">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            About {category.name} icons
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            This category holds {category.count.toLocaleString("en-US")} free {category.name.toLowerCase()}{" "}
            icons from every pack indexed by IconVault. Download any icon as SVG, PNG or WebP, or
            copy it as a React component. Every icon stays under its original open-source licence,
            and downloads need a free account.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Related categories:{" "}
            {staticCategories
              .filter((c) => c.slug !== category.slug)
              .sort((a, b) => b.count - a.count)
              .slice(0, 4)
              .map((c, i, arr) => (
                <span key={c.slug}>
                  <Link to="/categories/$slug" params={{ slug: c.slug }} className="text-primary hover:underline">
                    {c.name} icons
                  </Link>
                  {i < arr.length - 1 ? ", " : ""}
                </span>
              ))}
            .
          </p>
        </section>
      </div>

      {activeIcon && <IconifyDetail iconId={activeIcon} onClose={() => setActiveIcon(null)} />}
    </PageShell>
  );
}

export default Page;
