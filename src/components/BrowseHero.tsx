// Hero section for the browse page - extracted from the old homepage.
// Keeps the teal theme. The search bar feeds directly into the browse
// query; CTAs link to tools and AI search.

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Crown } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { Reveal } from "@/components/Reveal";
import { getIconSvgUrl } from "@/lib/iconify";
import { TOOL_COUNT } from "@/lib/tool-catalog-meta";
import { usePlan, LIFETIME_PRICE } from "@/hooks/usePlan";

const HERO_ICONS = [
  "lucide:sparkles",
  "lucide:rocket",
  "ph:heart-duotone",
  "tabler:brand-figma",
  "solar:cart-large-2-bold-duotone",
  "mdi:github",
  "carbon:api",
  "ri:vuejs-line",
  "lucide:layers",
  "ph:paint-brush-duotone",
  "tabler:command",
  "solar:bolt-bold-duotone",
];

const ROTATING_WORDS = ["ship faster", "stay consistent", "skip the licence maze", "delete your SVG folder"];


interface BrowseHeroProps {
  onSearch: (q: string) => void;
}

/** Slim lifetime offer banner - sits at the top of the hero, above the stats badge. */
function LifetimeOfferBanner() {
  const { isPro } = usePlan();
  if (isPro) return null;
  return (
    <Reveal>
      <Link
        to="/pro"
        aria-label="Get IconVault lifetime access"
        className="focus-ring mx-auto mb-5 flex max-w-3xl items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 transition-colors hover:bg-primary/15 sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Crown className="h-5 w-5" />
          </span>
          <span className="min-w-0 text-left">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-foreground">
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                First 100 only
              </span>
              <span className="font-semibold">
                IconVault Lifetime, <span className="font-bold text-primary">${LIFETIME_PRICE}</span> once, no subscription
              </span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              Unlimited tools & downloads · 50,000 API calls/mo · 500 custom uploads
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <span className="hidden sm:inline">Get lifetime access</span>
          <span className="sm:hidden">Get</span>
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </Reveal>
  );
}

export default function BrowseHero({ onSearch }: BrowseHeroProps) {
  const [query, setQuery] = useState("");
  const [rotating, setRotating] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setRotating((v) => (v + 1) % ROTATING_WORDS.length), 2600);
    return () => clearInterval(id);
  }, []);

  const submit = (q: string) => {
    onSearch(q);
    document.getElementById("browse-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-2 text-center sm:pt-4 lg:px-8">
        {/* Lifetime offer - above the stats badge, inside the hero */}
        <LifetimeOfferBanner />
        <Reveal>
          <span className="inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-primary/25 bg-primary-soft px-3 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-primary sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[11px] sm:tracking-widest">
            <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> 421,020 icons · {TOOL_COUNT} free tools · one search
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="font-balloon mx-auto mt-7 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Every open-source icon,
            <br className="hidden sm:block" /> indexed so you can{" "}
            <span className="text-gradient inline-grid justify-center align-baseline">
              {ROTATING_WORDS.map((word, i) => (
                <span
                  key={word}
                  aria-hidden={i !== rotating}
                  className={`col-start-1 row-start-1 text-center ${i !== rotating ? "invisible" : ""}`}
                >
                  {word}
                </span>
              ))}
            </span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-4xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            IconVault searches 421,020 icons from Lucide, Phosphor, Material Symbols, Tabler and
            150 other families. Preview at real size, recolour to your brand, then copy the exact
            snippet your framework wants. Need more? {TOOL_COUNT} free online tools, from
            QR codes to background removers, run right in your browser.
          </p>
        </Reveal>

        <div className="relative z-30">
          <Reveal delay={220}>
            {/* Search bar on all screen sizes - mobile, tablet, and desktop */}
            <div className="mx-auto mt-7 max-w-2xl sm:mt-9">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={submit}
                size="lg"
                suggestions={["arrow", "heart", "home", "user", "settings", "calendar"]}
              />
            </div>
          </Reveal>
        </div>

        <Reveal delay={280}>
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Link
              to="/tools"
              className="focus-ring group inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.03] sm:w-auto"
            >
              Explore free tools
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="grid grid-cols-2 gap-3 sm:contents">
              <a
                href="#browse-results"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary sm:px-6"
              >
                Browse the vault
              </a>
              <Link
                to="/ai-search"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary sm:px-6"
              >
                <Sparkles className="h-4 w-4 shrink-0" /> Try AI search
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal delay={340}>
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-12">
            {HERO_ICONS.map((id, i) => {
              const [prefix, name] = id.split(":");
              return (
                <span
                  key={id}
                  style={{ animationDelay: `${i * 220}ms` }}
                  className="animate-float grid aspect-square place-items-center rounded-2xl border border-border bg-surface shadow-soft transition-transform duration-300 hover:-translate-y-1.5 hover:border-primary/40"
                >
                  <img
                    src={getIconSvgUrl(prefix ?? "", name ?? "", { width: 20, height: 20, color: "#0F766E" })}
                    alt=""
                    aria-hidden
                    className="h-5 w-5"
                    loading={i < 6 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={i < 6 ? "high" : "auto"}
                  />
                </span>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
