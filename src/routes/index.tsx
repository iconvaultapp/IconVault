import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Code2,
  Copy,
  Download,
  Heart,
  Layers,
  LayoutGrid,
  Mail,
  MousePointerClick,
  Package,
  Palette,
  Rocket,
  Search,
  Shapes,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SearchBar from "@/components/SearchBar";
import { Reveal } from "@/components/Reveal";
import { getIconSvgUrl } from "@/lib/iconify";
import { TOOL_COUNT } from "@/lib/tool-catalog-meta";
import AgentStrip from "@/components/home/AgentStrip";
import PopularLibraries from "@/components/home/PopularLibraries";
import BrowseCategories from "@/components/home/BrowseCategories";
import IllustrationsHome from "@/components/home/IllustrationsHome";
// Lazy: BlogTeaser pulls in every post's full text for its cards. Keeping
// it out of the homepage's entry chunk is a major first-load saving; the
// section sits deep below the fold, so it streams in right after paint.
const BlogTeaser = lazy(() => import("@/components/home/BlogTeaser"));
// PERF-M3: every section below IllustrationsHome is lazy too - they used
// to ship in the homepage entry chunk even though nobody sees them before
// scrolling. (ToolsTeaser / CodeShowcaseCard / WaitlistForm were extracted
// from this file into components/home/ for the same reason.)
const StyleChips = lazy(() => import("@/components/home/StyleChips"));
const ToolsTeaser = lazy(() => import("@/components/home/ToolsTeaser"));
const MarqueeBand = lazy(() => import("@/components/home/MarqueeBand"));
const CodeShowcaseCard = lazy(() => import("@/components/home/CodeShowcaseCard"));
const WaitlistForm = lazy(() => import("@/components/home/WaitlistForm"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IconVault - 421,020 open-source icons + 578 free online tools" },
      {
        name: "description",
        content:
          "Search, recolour and export icons from 239 open-source sets, plus 578 free online tools for devs and designers. Copy React, Vue, HTML or SVG in one click, build collections and ship faster.",
      },
      { property: "og:title", content: "IconVault - 421,020 icons and 578 free tools, one search box" },
      {
        property: "og:description",
        content:
          "One search box for every open-source icon set and hundreds of free online tools. Preview, recolour and export in the format your codebase already speaks.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/" },
      { property: "og:image", content: "https://iconvault.site/og-image.jpg?v=3" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IconVault - 421,020 icons and 578 free tools, one search box" },
      {
        name: "twitter:description",
        content:
          "One search box for every open-source icon set and hundreds of free online tools. Preview, recolour and export in the format your codebase already speaks.",
      },
      { name: "twitter:image", content: "https://iconvault.site/og-image.jpg?v=3" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "IconVault",
          url: "https://iconvault.site/",
          logo: "https://iconvault.site/og-image.jpg?v=3",
          description:
            "IconVault is a free search index of 421,020 open-source SVG icons from 239 sets, plus 578 free online tools for developers and designers.",
          sameAs: ["https://github.com/iconvaultapp/IconVault"],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "IconVault",
          url: "https://iconvault.site/",
        }),
      },
    ],
  }),
  component: Landing,
});

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

const FEATURES = [
  {
    icon: Search,
    title: "421,020 icons, one index",
    desc: "Search across 150+ open-source sets at once, or narrow to a single family when consistency matters.",
  },
  {
    icon: Code2,
    title: "Copy as component",
    desc: "React, Vue, HTML, CSS or raw SVG - already sized and coloured the way you previewed it.",
  },
  {
    icon: Download,
    title: "Bulk export",
    desc: "Multi-select an entire screen's worth of icons and pull them down as SVG or PNG in one pass.",
  },
  {
    icon: Heart,
    title: "Favourites that sync",
    desc: "Star icons locally, then sign in and everything follows you across devices automatically.",
  },
  {
    icon: Package,
    title: "Named collections",
    desc: "Group icons per project or per feature, share the set with your team and keep naming consistent.",
  },
  {
    icon: Shield,
    title: "Licence-clear, always",
    desc: "Every icon carries its original open-source licence and author credit, so shipping stays safe.",
  },
];

const STEPS = [
  {
    step: "01",
    icon: Search,
    kind: "icons" as const,
    title: "Search or describe",
    desc: "Type a name, or let AI search interpret 'something that means secure checkout'.",
  },
  {
    step: "02",
    icon: Palette,
    kind: "colors" as const,
    title: "Tune size and colour",
    desc: "Preview at 16 to 64px against light or dark, and dial in your exact brand hex.",
  },
  {
    step: "03",
    icon: Download,
    kind: "formats" as const,
    title: "Copy or export",
    desc: "Grab a framework snippet, download SVG/PNG, or push the set to your design tokens.",
  },
];

const STATS = [
  { value: "421,020", label: "Icons indexed", sub: "every style, one search", icon: Shapes },
  { value: "239", label: "Icon sets", sub: "all open-source, licence-clear", icon: Layers },
  { value: "578", label: "Free online tools", sub: "5 free uses a day, no account", icon: Wrench },
  { value: "17", label: "Tool categories", sub: "dev, design, SEO, fun & more", icon: LayoutGrid },
];

/** Mini visual strip at the bottom of each "How it works" step card:
    real icons for search, brand colours for tuning, format pills for export. */
function StepVisual({ kind }: { kind: "icons" | "colors" | "formats" }) {
  if (kind === "icons") {
    return (
      <span className="mt-5 flex items-center gap-2">
        {["lucide:home", "lucide:heart", "lucide:user", "lucide:settings"].map((id) => {
          const [prefix, name] = id.split(":");
          return (
            <span key={id} className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 ring-1 ring-inset ring-border/60">
              <img
                src={getIconSvgUrl(prefix ?? "", name ?? "", { width: 18, height: 18, color: "#0F766E" })}
                alt=""
                className="h-[18px] w-[18px]"
                loading="lazy"
                decoding="async"
              />
            </span>
          );
        })}
        <span className="rounded-full bg-primary-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">
          421k+ results
        </span>
      </span>
    );
  }
  if (kind === "colors") {
    return (
      <span className="mt-5 flex items-center gap-2">
        {["#0F766E", "#F97316", "#2563EB", "#DB2777", "#111827"].map((c) => (
          <span
            key={c}
            style={{ backgroundColor: c }}
            className="h-6 w-6 rounded-full ring-2 ring-surface ring-offset-1 ring-offset-border/40 transition-transform duration-300 hover:scale-125"
          />
        ))}
        <span className="ml-1 rounded-full bg-primary-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">
          16-64px
        </span>
      </span>
    );
  }
  return (
    <span className="mt-5 flex flex-wrap items-center gap-1.5">
      {["SVG", "PNG", "JSX", "Vue", "CSS"].map((f) => (
        <span key={f} className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
          {f}
        </span>
      ))}
    </span>
  );
}

function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement | null>(null);
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const onHeroMove = (e: React.MouseEvent) => {
    const glow = glowRef.current;
    const hero = heroRef.current;
    if (!glow || !hero) return;
    const r = hero.getBoundingClientRect();
    glow.style.background = `radial-gradient(560px circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)`;
  };
  const [query, setQuery] = useState("");
  const [rotating, setRotating] = useState(0);
  const words = ["ship faster", "stay consistent", "skip the licence maze", "delete your SVG folder"];

  useEffect(() => {
    const id = setInterval(() => setRotating((v) => (v + 1) % words.length), 2600);
    return () => clearInterval(id);
  }, [words.length]);

  const goSearch = (q: string) => {
    void navigate({ to: "/app", search: (q ? { q } : {}) as { q?: string } });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        {/* Hero pulled up under the floating pill (Sameer 2026-10-24): the
            -mt-24 lifts the hero background to the very top of the screen so
            no page-background strip shows behind the pill. pt-32 (not the
            full pt-44 compensation) is deliberate: it leaves only ~32px
            between the pill and the badge, the tight gap Sameer asked for
            2026-10-24 (was ~80px mobile / ~112px desktop). */}
        <section ref={heroRef} onMouseMove={onHeroMove} className="hero-glow relative -mt-24 overflow-hidden">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
          <span ref={glowRef} className="pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-[1440px] px-5 pb-20 pt-32 text-center lg:px-8">
            <Reveal>
              <span className="inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-primary/25 bg-primary-soft px-3 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-primary sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[11px] sm:tracking-widest">
                <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> 421,020 icons · {TOOL_COUNT} free tools · one search
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mx-auto mt-7 max-w-4xl font-display text-3xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                Every open-source icon,
                <br className="hidden sm:block" /> indexed so you can{" "}
                <span className="text-gradient inline-grid justify-center align-baseline">
                  {words.map((word, i) => (
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
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                IconVault searches 421,020 icons from Lucide, Phosphor, Material Symbols, Tabler and
                150 other families. Preview at real size, recolour to your brand, then copy the exact
                snippet your framework wants. Need more? {TOOL_COUNT} free online tools, from
                QR codes to background removers, run right in your browser.
              </p>
            </Reveal>

            <div className="relative z-30">
              <Reveal delay={220}>
                <div className="mx-auto mt-9 max-w-2xl">
                  <SearchBar
                    value={query}
                    onChange={setQuery}
                    onSubmit={goSearch}
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
                  className="btn-sheen focus-ring group inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.03] sm:w-auto"
                >
                  Explore free tools
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <Link
                    to="/app"
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary sm:px-6"
                  >
                    Browse the vault
                  </Link>
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
                      className="animate-float grid aspect-square place-items-center rounded-2xl border border-border bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:rotate-6 hover:scale-105 hover:border-primary/40 hover:shadow-lift"
                    >
                      <img
                        src={getIconSvgUrl(prefix ?? "", name ?? "", { width: 20, height: 20, color: "#0F766E" })}
                        alt=""
                        aria-hidden
                        className="h-5 w-5"
                        loading="eager"
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

        {/* Agent / CLI strip (added 2026-10-22) */}
        <AgentStrip />

        {/* Popular libraries (added 2026-10-22) */}
        <PopularLibraries />

        {/* Browse icons by category / type / curated collection (added 2026-10-22) */}
        <BrowseCategories />

        {/* Free illustrations showcase (Sameer 2026-10-23) */}
        <IllustrationsHome />

        {/* Collection styles chip cloud (added 2026-10-23) */}
        <Suspense fallback={null}>
          <div className="cv-auto">
            <StyleChips />
          </div>
        </Suspense>

        {/* Free tools teaser */}
        <Suspense fallback={null}>
          <div className="cv-auto">
            <ToolsTeaser />
          </div>
        </Suspense>

        {/* Marquee - premium pill band with real set icons (2026-10-23) */}
        <Suspense fallback={null}>
          <div className="cv-auto">
            <MarqueeBand />
          </div>
        </Suspense>

        {/* Stats */}
        <section className="cv-auto mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 70} className="surface-card lift-hover group relative overflow-hidden px-5 py-9 text-center">
                <span className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)] opacity-60" aria-hidden />
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-[1.15rem] bg-[image:var(--gradient-primary)] text-white shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <s.icon className="h-8 w-8" />
                </span>
                <p className="mt-4 font-display text-4xl font-semibold text-primary sm:text-5xl">{s.value}</p>
                <p className="mt-2 text-sm font-medium text-foreground/80">{s.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="cv-auto mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow"><span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Why teams switch</span></p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for the ten seconds between "we need an icon" and "it's in the PR"
            </h2>
            <p className="mt-4 text-muted-foreground">
              No downloads folder archaeology, no mismatched stroke widths, no licence guesswork.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60} className="surface-card lift-hover group relative overflow-hidden p-6">
                <span className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)] opacity-50 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                <f.icon
                  className="pointer-events-none absolute -bottom-7 -right-7 h-28 w-28 rotate-12 text-primary/[0.05] transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:text-primary/[0.09]"
                  aria-hidden
                />
                <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <f.icon className="h-7 w-7" />
                </span>
                <h3 className="relative mt-5 font-display text-lg font-semibold transition-colors group-hover:text-primary">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Code showcase */}
        <section className="cv-auto border-y border-border bg-surface-2">
          <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8">
            <Reveal>
              <p className="eyebrow"><span className="inline-flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5 text-primary" /> Developer experience</span></p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                The snippet is already <span className="text-gradient">correct</span> when you paste
                it
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Size, colour and import path are baked into whatever you copy. Pull icons from the CLI,
                the VS Code extension, or the REST API when you'd rather not leave your editor at all.
              </p>
              <ul className="mt-7 grid gap-3">
                {[
                  { emoji: "💻", title: "CLI", sub: "iconvault add lucide:rocket", mono: true },
                  { emoji: "🔌", title: "REST API", sub: "with per-project keys", mono: false },
                  { emoji: "🎨", title: "Figma plugin", sub: "drops icons straight into frames", mono: false },
                ].map((row) => (
                  <li key={row.title} className="surface-card lift-hover flex items-center gap-3.5 p-3.5">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-xl ring-1 ring-inset ring-border/60"
                      aria-hidden
                    >
                      {row.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[15px] font-semibold">{row.title}</span>
                      <span
                        className={`block truncate text-[13px] text-muted-foreground ${row.mono ? "font-mono" : ""}`}
                      >
                        {row.sub}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/api-access"
                className="focus-ring mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-accent"
              >
                <span aria-hidden>📚</span> Read the API docs <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>

            <Reveal delay={120}>
              <Suspense fallback={null}>
                <CodeShowcaseCard />
              </Suspense>
            </Reveal>
          </div>
        </section>

        {/* Steps */}
        <section className="cv-auto relative mx-auto max-w-[1440px] overflow-hidden px-5 py-20 lg:px-8">
          <Shapes
            className="animate-float-slow pointer-events-none absolute -right-4 top-8 hidden h-36 w-36 rotate-12 text-primary/[0.05] lg:block"
            aria-hidden
          />
          <Rocket
            className="animate-float-slow pointer-events-none absolute -left-3 bottom-8 hidden h-28 w-28 -rotate-12 text-primary/[0.04] [animation-delay:1400ms] lg:block"
            aria-hidden
          />
          <Reveal className="text-center">
            <p className="eyebrow"><span className="inline-flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5 text-primary" /> How it works</span></p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Idea to icon in three moves
            </h2>
          </Reveal>
          <div className="relative mt-12">
            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.step} delay={i * 90} className="surface-card lift-hover group relative overflow-hidden p-7">
                  <span className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)] opacity-50 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                  <span className="flex items-start justify-between">
                    <span className="font-display text-5xl font-semibold text-primary/15 transition-colors duration-300 group-hover:text-primary/30">{s.step}</span>
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                      <s.icon className="h-7 w-7" />
                    </span>
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  <StepVisual kind={s.kind} />
                </Reveal>
              ))}
            </div>
            {[0, 1].map((n) => (
              <span
                key={n}
                style={{ left: n === 0 ? "33.333%" : "66.666%", animationDelay: `${n * 900}ms` }}
                className="animate-float pointer-events-none absolute top-1/2 z-10 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-background shadow-lift md:grid"
                aria-hidden
              >
                <ArrowRight className="h-4 w-4" />
              </span>
            ))}
          </div>
        </section>

        {/* From the blog - moved below "Idea to icon in three moves" (Sameer 2026-10-23) */}
        <Suspense
          fallback={
            <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8" aria-hidden>
              <div className="h-44 animate-pulse rounded-3xl bg-muted/50" />
            </div>
          }
        >
          <div className="cv-auto">
            <BlogTeaser />
          </div>
        </Suspense>

        {/* Testimonials hidden on the homepage at all resolutions (Sameer 2026-10-23). */}

        {/* Waitlist + CTA */}
        <section className="cv-auto mx-auto max-w-[1440px] px-5 py-20 text-center lg:px-8">
          <Reveal className="surface-card relative overflow-hidden px-6 py-12 sm:px-12">
            <span className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)] opacity-60" aria-hidden />
            <span
              className="animate-float pointer-events-none absolute left-6 top-6 hidden h-10 w-10 place-items-center rounded-xl bg-surface-2 ring-1 ring-inset ring-border/60 sm:grid"
              aria-hidden
            >
              <img src={getIconSvgUrl("lucide", "bell", { width: 18, height: 18, color: "#0F766E" })} alt="" className="h-[18px] w-[18px]" loading="lazy" decoding="async" />
            </span>
            <span
              className="animate-float pointer-events-none absolute bottom-6 right-6 hidden h-10 w-10 place-items-center rounded-xl bg-surface-2 ring-1 ring-inset ring-border/60 [animation-delay:1100ms] sm:grid"
              aria-hidden
            >
              <img src={getIconSvgUrl("lucide", "sparkles", { width: 18, height: 18, color: "#0F766E" })} alt="" className="h-[18px] w-[18px]" loading="lazy" decoding="async" />
            </span>
            <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/25">
              <Mail className="h-7 w-7" />
            </span>
            <p className="eyebrow">Stay in the loop</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              New sets, new tooling, once a month
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              No noise - just newly indexed icon families and the occasional workflow trick.
            </p>
            <div className="relative mx-auto mt-7 max-w-xl">
              <Suspense fallback={null}>
                <WaitlistForm />
              </Suspense>
            </div>
          </Reveal>
        </section>

        <section className="cv-auto mx-auto max-w-[1440px] px-5 pb-24 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-3xl border border-border bg-ink px-6 py-16 text-center">
            <span className="animate-float-slow pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <span className="animate-float-slow pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl [animation-delay:1600ms]" />
            {[
              { id: "lucide:rocket", cls: "left-[7%] top-10", delay: "0ms" },
              { id: "lucide:palette", cls: "right-[8%] top-12", delay: "500ms" },
              { id: "lucide:heart", cls: "bottom-10 left-[11%]", delay: "1000ms" },
              { id: "lucide:zap", cls: "bottom-12 right-[12%]", delay: "1500ms" },
              { id: "lucide:star", cls: "left-[16%] top-14", delay: "800ms" },
              { id: "lucide:shapes", cls: "right-[17%] bottom-14", delay: "2000ms" },
            ].map((t) => {
              const [prefix, name] = t.id.split(":");
              return (
                <span
                  key={t.id}
                  style={{ animationDelay: t.delay }}
                  className={`animate-float pointer-events-none absolute ${t.cls} hidden h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-lift backdrop-blur-sm md:grid`}
                  aria-hidden
                >
                  <img
                    src={getIconSvgUrl(prefix ?? "", name ?? "", { width: 24, height: 24, color: "#FFFFFF" })}
                    alt=""
                    className="h-6 w-6 opacity-90"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              );
            })}
            <span className="relative mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-lift backdrop-blur-sm">
              <img
                src={getIconSvgUrl("lucide", "rocket", { width: 26, height: 26, color: "#FFFFFF" })}
                alt=""
                className="h-[26px] w-[26px]"
                loading="lazy"
                decoding="async"
              />
            </span>
            <h2 className="relative font-display text-3xl font-semibold tracking-tight text-background sm:text-4xl">
              Icons and tools, <span className="text-gradient-animated">ready when you are</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm text-background/70">
              Free to search, free to export, {TOOL_COUNT} free tools with 5 uses each. Sign
              in only when you want favourites and collections to follow you.
            </p>
            <Link
              to="/tools"
              className="btn-sheen focus-ring relative mt-8 inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-transform hover:scale-[1.03]"
            >
              Explore free tools <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
