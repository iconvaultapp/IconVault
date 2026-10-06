import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import IconifyGrid from "@/components/IconifyGrid";
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
    const description = `Browse ${count.toLocaleString("en-US")} free ${name.toLowerCase()} icons. Download as SVG, PNG, WebP or copy-paste React components - free, no account needed.`;
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
// Rendering cap: "Load more" stops here so huge categories can't grow the
// DOM (and its observers/fetches) until the tab dies. Search covers the rest.
const MAX_SHOWN = 2000;

function Page() {
  const { category } = Route.useLoaderData();
  const [icons, setIcons] = useState<string[]>([]);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setShown(PAGE_SIZE);
    void fetchCategoryIcons(category.slug).then((ids) => {
      if (alive) setIcons(ids);
    });
    return () => {
      alive = false;
    };
  }, [category.slug]);

  const visible = useMemo(() => icons.slice(0, shown), [icons, shown]);

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
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

        <div className="mt-6">
          <IconifyGrid icons={visible} onIconClick={setActiveIcon} />
        </div>

        {shown < Math.min(icons.length, MAX_SHOWN) && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShown((s) => Math.min(s + PAGE_SIZE, MAX_SHOWN))}
              className="focus-ring rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-medium hover:border-primary/40"
            >
              Load more ({(icons.length - shown).toLocaleString("en-US")} remaining)
            </button>
          </div>
        )}

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
      </div>

      {activeIcon && <IconifyDetail iconId={activeIcon} onClose={() => setActiveIcon(null)} />}
    </PageShell>
  );
}

export default Page;
