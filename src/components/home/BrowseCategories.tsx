// Homepage "Browse icons" section with three tabs, mirroring how visitors
// actually look for icons: by category, by icon type, or by curated style.
// Every card links to a real category page, icon set or search on IconVault.
// v2 (Sameer 2026-10-23): card-grid view instead of a text list, pill tabs,
// staggered fade-up animation on tab switch and hover icon motion - same
// theme, more premium feel.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LayoutGrid } from "lucide-react";
import ReliableIcon from "@/components/ReliableIcon";
import { Reveal } from "@/components/Reveal";
import {
  fetchCategories,
  fetchCollections,
  parseIconId,
  type IconCategory,
  type IconifyCollection,
} from "@/lib/iconify";
import { cn } from "@/lib/utils";

type TabId = "categories" | "types" | "curated";

interface CategoryCard {
  label: string;
  desc: string;
  slug?: string;
  sampleSet: string;
  fallbackNote?: string;
  setLink?: string;
}

const CATEGORY_CARDS: CategoryCard[] = [
  { label: "UI & Interface", desc: "General sets for apps and web", slug: "essential-ui-icons", sampleSet: "lucide" },
  { label: "Brands & Logos", desc: "Company logos and social icons", slug: "brand-logos", sampleSet: "logos" },
  { label: "World Flags", desc: "Country flags in SVG format", slug: "flags", sampleSet: "flag" },
  { label: "Emoji", desc: "Expressive emoji collections", slug: "emoji-and-smileys", sampleSet: "twemoji" },
  { label: "Dev & Code", desc: "Dev tools and file types", slug: "development", sampleSet: "devicon" },
  { label: "Animated", desc: "Spinners and loaders", slug: "animations", sampleSet: "svg-spinners" },
  { label: "Weather", desc: "Sun, rain and forecast", slug: "weather", sampleSet: "meteocons" },
  { label: "Gaming", desc: "RPG items and game symbols", slug: "gaming", sampleSet: "game-icons" },
  { label: "Color Icons", desc: "Full-color and multi-tone sets", slug: "color", sampleSet: "flat-color-icons" },
  { label: "Crypto", desc: "Cryptocurrency and Web3 icons", sampleSet: "token-branded", setLink: "token-branded", fallbackNote: "Token Branded set" },
  { label: "E-Commerce", desc: "Cart, payment, shopping", slug: "e-commerce-and-shopping", sampleSet: "solar" },
  { label: "Medical", desc: "Healthcare symbols", slug: "health-and-medical", sampleSet: "healthicons" },
];

interface TypeCard {
  label: string;
  desc: string;
  term: string;
  icons: string[];
}

const TYPE_CARDS: TypeCard[] = [
  { label: "Arrow icons", desc: "Right, up and curved arrows", term: "arrow", icons: ["arrow-right", "arrow-up", "corner-up-right", "arrow-down", "arrow-left", "move-diagonal"] },
  { label: "Home icons", desc: "Houses, buildings and doors", term: "home", icons: ["home", "building-2", "door-open", "building", "landmark", "warehouse"] },
  { label: "Search icons", desc: "Magnifiers and zoom controls", term: "search", icons: ["search", "zoom-in", "zoom-out", "search-check", "scan-search", "file-search"] },
  { label: "Settings icons", desc: "Gears, sliders and tools", term: "settings", icons: ["settings", "sliders-horizontal", "wrench", "hammer", "cog", "settings-2"] },
  { label: "User icons", desc: "People, profiles and accounts", term: "user", icons: ["user", "user-plus", "users", "user-check", "users-round", "circle-user-round"] },
  { label: "Menu icons", desc: "Navigation and layout menus", term: "menu", icons: ["menu", "align-justify", "layout-grid", "layout-list", "panel-left", "grip"] },
  { label: "Heart icons", desc: "Likes, health and favourites", term: "heart", icons: ["heart", "heart-pulse", "sparkles", "heart-handshake", "heart-crack", "hand-heart"] },
  { label: "Star icons", desc: "Ratings, awards and favourites", term: "star", icons: ["star", "award", "sparkles", "trophy", "medal", "crown"] },
  { label: "Download icons", desc: "Save, export and cloud downloads", term: "download", icons: ["download", "cloud-download", "arrow-down-to-line", "upload", "cloud-upload", "folder-down"] },
  { label: "Checkmark icons", desc: "Ticks, done and verified states", term: "check", icons: ["check", "check-check", "badge-check", "circle-check", "square-check-big", "list-checks"] },
  { label: "Close icons", desc: "Dismiss, delete and clear", term: "close", icons: ["x", "delete", "eraser", "circle-x", "trash-2", "ban"] },
  { label: "Edit icons", desc: "Pencils, pens and highlighters", term: "edit", icons: ["pencil", "pen-line", "highlighter", "pen-tool", "paintbrush", "type"] },
];

interface CuratedCard {
  label: string;
  desc: string;
  set?: string;
  term?: string;
  sampleSet: string;
}

const CURATED_CARDS: CuratedCard[] = [
  { label: "Line Art", desc: "Outline icons for clean UIs", set: "lucide", sampleSet: "lucide" },
  { label: "Material Design", desc: "Google Material sets", set: "material-symbols", sampleSet: "material-symbols" },
  { label: "Monochrome", desc: "Single-color glyph sets", set: "simple-icons", sampleSet: "simple-icons" },
  { label: "Duotone", desc: "Two-tone icon styles", set: "ph", sampleSet: "ph" },
  { label: "Gradient", desc: "Icons with color gradients", set: "fluent-color", sampleSet: "fluent-color" },
  { label: "Pixel Art", desc: "Retro 8-bit style icons", set: "pixelarticons", sampleSet: "pixelarticons" },
  { label: "Loading Spinners", desc: "Animated loaders", set: "svg-spinners", sampleSet: "svg-spinners" },
  { label: "Dark Mode", desc: "Icons that read on dark UIs", set: "arcticons", sampleSet: "arcticons" },
  { label: "Astro", desc: "Packs that suit Astro sites", term: "astro", sampleSet: "logos" },
  { label: "Next.js", desc: "Packs for Next.js and React", set: "devicon", sampleSet: "devicon" },
  { label: "Vue", desc: "Packs for Vue apps", term: "vue", sampleSet: "logos" },
  { label: "Figma", desc: "Packs for design files", term: "figma", sampleSet: "logos" },
];

function SampleStrip({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-[image:var(--gradient-hero)] px-4 py-3.5 ring-1 ring-inset ring-border/60">
      {children}
    </div>
  );
}

function CollectionSamples({
  collections,
  prefix,
  count = 6,
}: {
  collections: Record<string, IconifyCollection>;
  prefix: string;
  count?: number;
}) {
  const samples = (collections[prefix]?.samples ?? []).slice(0, count);
  return (
    <>
      {samples.map((sample, i) => {
        const parsed = sample.includes(":") ? parseIconId(sample) : { prefix, name: sample };
        return (
          <span
            key={sample}
            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-125"
            style={{ transitionDelay: `${i * 40}ms` }}
          >
            <ReliableIcon prefix={parsed.prefix} name={parsed.name} alt="" width={24} height={24} className="opacity-80 group-hover:opacity-100" />
          </span>
        );
      })}
    </>
  );
}

function BrowseCard({
  index,
  title,
  desc,
  footer,
  children,
}: {
  index: number;
  title: string;
  desc: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className="animate-fade-up flex h-full flex-col p-5"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      <SampleStrip>{children}</SampleStrip>
      <span className="mt-4 block font-display text-[1.15rem] font-semibold tracking-tight transition-colors group-hover:text-primary">
        {title}
      </span>
      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{desc}</span>
      <span className="mt-auto flex items-center justify-between gap-3 pt-5">
        {footer}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </span>
    </span>
  );
}

const cardLinkClass = "surface-card lift-hover focus-ring group block h-full overflow-hidden text-left";

export default function BrowseCategories() {
  const [tab, setTab] = useState<TabId>("categories");
  const [categories, setCategories] = useState<IconCategory[]>([]);
  const [collections, setCollections] = useState<Record<string, IconifyCollection>>({});

  useEffect(() => {
    let alive = true;
    void fetchCategories().then((c) => alive && setCategories(c));
    void fetchCollections().then((c) => alive && setCollections(c));
    return () => {
      alive = false;
    };
  }, []);

  const countBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) map.set(c.slug, c.count);
    return map;
  }, [categories]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "categories", label: "Categories" },
    { id: "types", label: "Icon types" },
    { id: "curated", label: "Curated collections" },
  ];

  return (
    <section className="relative overflow-hidden border-t border-border bg-surface-2/50">
      <span className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-[1440px] px-5 py-20 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow"><span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5 text-primary" /> Find your icons</span></p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Browse <span className="text-gradient">icons</span>
            </h2>
            <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">
              By category, by icon type, or a curated collection - every path lands on real icons.
            </p>
          </div>
          <div className="mt-7 flex justify-center">
            <div className="inline-flex rounded-full bg-muted p-1 shadow-inner" role="tablist" aria-label="Browse icons by">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "focus-ring rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 sm:px-5",
                    tab === t.id
                      ? "bg-ink text-background shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div key={tab} className="mt-9">
          {tab === "categories" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORY_CARDS.map((card, i) => {
                  const count = card.slug ? countBySlug.get(card.slug) : undefined;
                  const footer = (
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                      {count !== undefined ? `${count.toLocaleString("en-US")} icons` : (card.fallbackNote ?? "Browse set")}
                    </span>
                  );
                  const inner = (
                    <BrowseCard index={i} title={card.label} desc={card.desc} footer={footer}>
                      <CollectionSamples collections={collections} prefix={card.sampleSet} />
                    </BrowseCard>
                  );
                  return card.slug ? (
                    <Link key={card.label} to="/categories/$slug" params={{ slug: card.slug }} className={cardLinkClass}>
                      {inner}
                    </Link>
                  ) : (
                    <Link key={card.label} to="/app" search={{ set: card.setLink as string }} className={cardLinkClass}>
                      {inner}
                    </Link>
                  );
                })}
              </div>
              <div className="flex justify-center">
                <Link to="/categories" className="focus-ring group mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {categories.length > 0 ? `All ${categories.length} categories` : "All categories"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </>
          )}

          {tab === "types" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TYPE_CARDS.map((card, i) => (
                  <Link key={card.label} to="/app" search={{ q: card.term }} className={cardLinkClass}>
                    <BrowseCard
                      index={i}
                      title={card.label}
                      desc={card.desc}
                      footer={<span className="text-xs font-medium text-muted-foreground">Search: “{card.term}”</span>}
                    >
                      {card.icons.map((name, j) => (
                        <span
                          key={name}
                          className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-125"
                          style={{ transitionDelay: `${j * 40}ms` }}
                        >
                          <ReliableIcon prefix="lucide" name={name} alt="" width={24} height={24} className="opacity-80 group-hover:opacity-100" />
                        </span>
                      ))}
                    </BrowseCard>
                  </Link>
                ))}
              </div>
              <div className="flex justify-center">
                <Link to="/app" className="focus-ring group mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Browse all icons
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </>
          )}

          {tab === "curated" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CURATED_CARDS.map((card, i) => {
                  const footer = (
                    <span className="text-xs font-medium text-muted-foreground">
                      {card.set ? "Icon set" : "Search collection"}
                    </span>
                  );
                  const inner = (
                    <BrowseCard index={i} title={card.label} desc={card.desc} footer={footer}>
                      <CollectionSamples collections={collections} prefix={card.sampleSet} />
                    </BrowseCard>
                  );
                  return card.set ? (
                    <Link key={card.label} to="/app" search={{ set: card.set }} className={cardLinkClass}>
                      {inner}
                    </Link>
                  ) : (
                    <Link key={card.label} to="/app" search={{ q: card.term as string }} className={cardLinkClass}>
                      {inner}
                    </Link>
                  );
                })}
              </div>
              <div className="flex justify-center">
                <Link to="/libraries" className="focus-ring group mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  All libraries
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
