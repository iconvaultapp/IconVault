// Homepage "Browse icons" section with three tabs, mirroring how visitors
// actually look for icons: by category, by icon type, or by curated style.
// Every card links to a real category page, icon set or search on IconVault.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import ReliableIcon from "@/components/ReliableIcon";
import { Reveal } from "@/components/Reveal";
import {
  fetchCategories,
  fetchCollections,
  parseIconId,
  type IconCategory,
  type IconifyCollection,
} from "@/lib/iconify";

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
  { label: "Arrow icons", desc: "Right, up and curved arrows", term: "arrow", icons: ["arrow-right", "arrow-up", "corner-up-right"] },
  { label: "Home icons", desc: "Houses, buildings and doors", term: "home", icons: ["home", "building-2", "door-open"] },
  { label: "Search icons", desc: "Magnifiers and zoom controls", term: "search", icons: ["search", "zoom-in", "zoom-out"] },
  { label: "Settings icons", desc: "Gears, sliders and tools", term: "settings", icons: ["settings", "sliders-horizontal", "wrench"] },
  { label: "User icons", desc: "People, profiles and accounts", term: "user", icons: ["user", "user-plus", "users"] },
  { label: "Menu icons", desc: "Navigation and layout menus", term: "menu", icons: ["menu", "align-justify", "layout-grid"] },
  { label: "Heart icons", desc: "Likes, health and favourites", term: "heart", icons: ["heart", "heart-pulse", "sparkles"] },
  { label: "Star icons", desc: "Ratings, awards and favourites", term: "star", icons: ["star", "award", "sparkles"] },
  { label: "Download icons", desc: "Save, export and cloud downloads", term: "download", icons: ["download", "cloud-download", "arrow-down-to-line"] },
  { label: "Checkmark icons", desc: "Ticks, done and verified states", term: "check", icons: ["check", "check-check", "badge-check"] },
  { label: "Close icons", desc: "Dismiss, delete and clear", term: "close", icons: ["x", "delete", "eraser"] },
  { label: "Edit icons", desc: "Pencils, pens and highlighters", term: "edit", icons: ["pencil", "pen-line", "highlighter"] },
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

function SampleIcons({
  collections,
  prefix,
  count = 3,
}: {
  collections: Record<string, IconifyCollection>;
  prefix: string;
  count?: number;
}) {
  const samples = (collections[prefix]?.samples ?? []).slice(0, count);
  if (samples.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-2.5" aria-hidden>
      {samples.map((sample) => {
        const parsed = sample.includes(":") ? parseIconId(sample) : { prefix, name: sample };
        return (
          <ReliableIcon key={sample} prefix={parsed.prefix} name={parsed.name} alt="" width={19} height={19} className="opacity-75" />
        );
      })}
    </span>
  );
}

const cardClass =
  "focus-ring group flex items-start justify-between gap-3 border-b border-border py-4 text-left transition-colors";

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
    <section className="border-t border-border bg-surface-2/50">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Browse icons</h2>
          <p className="mt-2 text-muted-foreground">By category, by icon type, or a curated collection.</p>
        </Reveal>

        <div className="mt-7 flex gap-7 border-b border-border" role="tablist" aria-label="Browse icons by">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`focus-ring -mb-px border-b-2 pb-3 text-[15px] transition-colors ${
                tab === t.id
                  ? "border-foreground font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "categories" && (
          <>
            <div className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORY_CARDS.map((card) => {
                const count = card.slug ? countBySlug.get(card.slug) : undefined;
                const inner = (
                  <>
                    <span className="min-w-0">
                      <span className="block font-display text-base font-semibold transition-colors group-hover:text-primary">
                        {card.label}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">{card.desc}</span>
                      <span className="mt-1 block text-xs font-semibold text-primary">
                        {count !== undefined ? `${count.toLocaleString("en-US")} icons` : (card.fallbackNote ?? "")}
                      </span>
                    </span>
                    <SampleIcons collections={collections} prefix={card.sampleSet} />
                  </>
                );
                return card.slug ? (
                  <Link key={card.label} to="/categories/$slug" params={{ slug: card.slug }} className={cardClass}>
                    {inner}
                  </Link>
                ) : (
                  <Link key={card.label} to="/app" search={{ set: card.setLink as string }} className={cardClass}>
                    {inner}
                  </Link>
                );
              })}
            </div>
            <Link to="/categories" className="focus-ring group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              {categories.length > 0 ? `All ${categories.length} categories` : "All categories"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </>
        )}

        {tab === "types" && (
          <>
            <div className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {TYPE_CARDS.map((card) => (
                <Link key={card.label} to="/app" search={{ q: card.term }} className={cardClass}>
                  <span className="min-w-0">
                    <span className="block font-display text-base font-semibold transition-colors group-hover:text-primary">
                      {card.label}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">{card.desc}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5" aria-hidden>
                    {card.icons.map((name) => (
                      <ReliableIcon key={name} prefix="lucide" name={name} alt="" width={19} height={19} className="opacity-75" />
                    ))}
                  </span>
                </Link>
              ))}
            </div>
            <Link to="/app" className="focus-ring group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Browse all icons
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </>
        )}

        {tab === "curated" && (
          <>
            <div className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {CURATED_CARDS.map((card) => {
                const inner = (
                  <>
                    <span className="min-w-0">
                      <span className="block font-display text-base font-semibold transition-colors group-hover:text-primary">
                        {card.label}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">{card.desc}</span>
                    </span>
                    <SampleIcons collections={collections} prefix={card.sampleSet} />
                  </>
                );
                return card.set ? (
                  <Link key={card.label} to="/app" search={{ set: card.set }} className={cardClass}>
                    {inner}
                  </Link>
                ) : (
                  <Link key={card.label} to="/app" search={{ q: card.term as string }} className={cardClass}>
                    {inner}
                  </Link>
                );
              })}
            </div>
            <Link to="/collections" className="focus-ring group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              All collections
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
