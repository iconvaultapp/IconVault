// Homepage "New in v56" section (v56, lazy-loaded below the fold).
// Cards and links for /templates, /animated-icons, /customizer, /showcase,
// the original collections, /wallpapers (including 3D-look designs),
// /mockups and /animated-backgrounds, following the IllustrationsHome
// pattern: a centred header, a surface-card grid, no images at all, only
// Lucide icons and CSS gradients, so nothing heavy sits above the fold
// and nothing here costs a render-blocking download.
//
// HONEST COUNTS ONLY: a count is shown only when it comes from a verified
// data file. Templates (34) and animated icons (625) come from the v55
// data files; original collections come from ORIGINAL_COLLECTIONS below
// (AI Tools 20, Diwali 20, Desi UI 20, total 60). There is NO Holi
// collection in the v55 data, so none is claimed here. Wallpaper and
// mockup counts come from the v56 data files (see the dependency note at
// the bottom); when those files report zero items, no count is shown
// rather than an invented one. The showcase card links to /showcase, whose
// empty state is honest by design, so no entries are faked here either.
//
// Pro note, kept narrow on purpose: Pro $19 is mentioned only for premium
// templates and animations bundles. Customizer, showcase browsing,
// original collections browsing and basic wallpaper downloads are free.

import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Image as ImageIcon,
  LayoutTemplate,
  MonitorSmartphone,
  Palette,
  Sparkles,
  Users,
  Wand2,
  Waves,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import GsapMotion from "@/components/GsapMotion";
import { TEMPLATES_TOTAL, TEMPLATES_PREMIUM } from "@/lib/templates-data";
import { ANIMATED_TOTAL } from "@/lib/animated-icons-data";
import { ORIGINAL_COLLECTIONS, ORIGINAL_TOTAL } from "@/lib/original-icons-data";
// v56 data-file dependency: these modules are owned by the wallpapers and
// mockups teams and must export array data by the final build. The counts
// below resolve defensively (any of the plausible export names, array
// only), so an unexpected export shape shows no count instead of a wrong
// one. See the final v56 report for the contract names.
import * as wallpapersMod from "@/lib/wallpapers-data";
import * as mockupsMod from "@/lib/mockups-data";

function arrayFrom(mod: unknown, keys: string[]): unknown[] {
  if (!mod || typeof mod !== "object") return [];
  const record = mod as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

const WALLPAPER_COUNT = arrayFrom(wallpapersMod, ["WALLPAPERS"]).length;
const MOCKUP_COUNT = arrayFrom(mockupsMod, ["MOCKUP_FRAMES", "FRAMES", "MOCKUPS"]).length;

const FREE_TEMPLATE_COUNT = TEMPLATES_TOTAL - TEMPLATES_PREMIUM;

interface V56Card {
  icon: typeof LayoutTemplate;
  title: string;
  badge: string;
  desc: string;
  to: string;
}

const CARDS: V56Card[] = [
  {
    icon: LayoutTemplate,
    title: "Website templates",
    badge: `${TEMPLATES_TOTAL} templates`,
    desc: `Free MIT-licensed templates for agencies, portfolios, shops and dashboards. ${FREE_TEMPLATE_COUNT} free downloads, ${TEMPLATES_PREMIUM} curated Pro picks.`,
    to: "/templates",
  },
  {
    icon: Sparkles,
    title: "Animated icons",
    badge: `${ANIMATED_TOTAL} icons`,
    desc: "Weather, loaders and spinners that move. Preview free, copy the code free.",
    to: "/animated-icons",
  },
  {
    icon: Wand2,
    title: "Icon customizer",
    badge: "Free",
    desc: "Recolor, resize and share any icon with a link that restores your exact settings.",
    to: "/customizer",
  },
  {
    icon: Users,
    title: "Community showcase",
    badge: "Approved entries only",
    desc: "Real projects built with IconVault icons. The gallery starts empty on purpose: nothing here is invented.",
    to: "/showcase",
  },
  {
    icon: ImageIcon,
    title: "Wallpapers",
    badge: WALLPAPER_COUNT > 0 ? `${WALLPAPER_COUNT} wallpapers` : "Free basic downloads",
    desc: "Desktop and mobile wallpapers, including 3D-look designs.",
    to: "/wallpapers",
  },
  {
    icon: MonitorSmartphone,
    title: "Mockups",
    badge: MOCKUP_COUNT > 0 ? `${MOCKUP_COUNT} frames` : "Free",
    desc: "Device frames for screenshots and presentations. Drop in a screenshot, export a polished mockup.",
    to: "/mockups",
  },
  {
    icon: Waves,
    title: "Animated backgrounds",
    badge: "Live demo",
    desc: "Waves, birds and fog, rendered live with Vanta. A demo only, never a site background.",
    to: "/animated-backgrounds",
  },
];

export const V56Home = () => {
  return (
    <section className="cv-auto mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow flex items-center justify-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> New in v56
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            More than icons: templates, wallpapers and more
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Free to browse, with downloads behind a free account, like the rest of the site.
            Pro $19 covers premium templates and animations bundles only.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <GsapMotion key={card.to} className="h-full">
            <Link
              to={card.to}
              className="surface-card lift-hover group flex h-full flex-col p-6"
              aria-label={`Open ${card.title}`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <card.icon className="h-7 w-7" />
              </span>
              <span className="mt-5 flex items-center justify-between gap-2">
                <span className="font-display text-lg font-semibold">{card.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </span>
              <span className="mt-1.5 w-fit rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary">
                {card.badge}
              </span>
              <span className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.desc}</span>
            </Link>
          </GsapMotion>
        ))}

        {/* Original collections card: counts computed from the data file,
            one link per real collection. Diwali only: v55 has no Holi icons. */}
        <GsapMotion className="h-full">
          <div className="surface-card lift-hover group flex h-full flex-col p-6">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
              <Palette className="h-7 w-7" />
            </span>
            <span className="mt-5 flex items-center justify-between gap-2">
              <Link
                to="/original"
                className="font-display text-lg font-semibold hover:text-primary"
              >
                Original collections
              </Link>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </span>
            <span className="mt-1.5 w-fit rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary">
              {ORIGINAL_TOTAL} original icons
            </span>
            <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Hand drawn for IconVault, free to browse and download.
            </span>
            <span className="mt-4 flex flex-wrap gap-2">
              {ORIGINAL_COLLECTIONS.map((collection) => (
                <Link
                  key={collection.slug}
                  to="/original/$collection"
                  params={{ collection: collection.slug }}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {collection.title} ({collection.icons.length})
                </Link>
              ))}
            </span>
          </div>
        </GsapMotion>
      </div>
    </section>
  );
};

export default V56Home;
