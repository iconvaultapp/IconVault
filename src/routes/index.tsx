import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  Calculator,
  Check,
  ClipboardList,
  Code2,
  Copy,
  Download,
  Eraser,
  EyeOff,
  Film,
  Fingerprint,
  Gamepad2,
  Globe,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Lock,
  Mail,
  Minimize2,
  MousePointerClick,
  Package,
  Palette,
  PenTool,
  Pipette,
  QrCode,
  Search,
  Shapes,
  Shield,
  Sparkles,
  TrendingUp,
  Type,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SearchBar from "@/components/SearchBar";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";
import { Reveal } from "@/components/Reveal";
import { getIconSvgUrl } from "@/lib/iconify";
import { TOOL_COUNT, TOOL_CATEGORY_META, FEATURED_TOOLS, type FeaturedToolMeta } from "@/lib/tool-catalog-meta";
import { supabase } from "@/integrations/supabase/client";
import AgentStrip from "@/components/home/AgentStrip";
import PopularLibraries from "@/components/home/PopularLibraries";
import BrowseCategories from "@/components/home/BrowseCategories";
import StyleChips from "@/components/home/StyleChips";
import MarqueeBand from "@/components/home/MarqueeBand";
import BlogTeaser from "@/components/home/BlogTeaser";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IconVault - 421,020 open-source icons + 579 free online tools" },
      {
        name: "description",
        content:
          "Search, recolour and export icons from 150+ open-source sets, plus 579 free online tools for devs and designers. Copy React, Vue, HTML or SVG in one click, build collections and ship faster.",
      },
      { property: "og:title", content: "IconVault - 421,020 icons and 579 free tools, one search box" },
      {
        property: "og:description",
        content:
          "One search box for every open-source icon set and hundreds of free online tools. Preview, recolour and export in the format your codebase already speaks.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/" },
      { property: "og:image", content: "https://iconvault.site/og-image.png?v=2" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IconVault - 421,020 icons and 579 free tools, one search box" },
      {
        name: "twitter:description",
        content:
          "One search box for every open-source icon set and hundreds of free online tools. Preview, recolour and export in the format your codebase already speaks.",
      },
      { name: "twitter:image", content: "https://iconvault.site/og-image.png?v=2" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/" }],
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
    title: "Search or describe",
    desc: "Type a name, or let AI search interpret 'something that means secure checkout'.",
  },
  {
    step: "02",
    icon: Palette,
    title: "Tune size and colour",
    desc: "Preview at 16 to 64px against light or dark, and dial in your exact brand hex.",
  },
  {
    step: "03",
    icon: Download,
    title: "Copy or export",
    desc: "Grab a framework snippet, download SVG/PNG, or push the set to your design tokens.",
  },
];

const STATS = [
  { value: "421,020", label: "Icons indexed", icon: Shapes },
  { value: "239", label: "Icon sets", icon: Layers },
  { value: "579", label: "Free online tools", icon: Wrench },
  { value: "17", label: "Tool categories", icon: LayoutGrid },
];

/** Homepage tool discovery: chips, featured cards, trial line. */
/* FEATURED_TOOLS comes from the lightweight tool-catalog-meta (not the full catalog). */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  image: ImageIcon,
  svg: Shapes,
  brand: QrCode,
  style: Palette,
  seo: TrendingUp,
  text: Type,
  dev: Code2,
  gif: Film,
  privacy: EyeOff,
  exam: ClipboardList,
  security: Lock,
  calculators: Calculator,
  learn: GraduationCap,
  generators: Sparkles,
  design: PenTool,
  network: Globe,
  fun: Gamepad2,
};

const FEATURED_ICONS: Record<string, LucideIcon> = {
  qr: QrCode,
  minimize: Minimize2,
  lock: Lock,
  braces: Braces,
  eraser: Eraser,
  text: Type,
  pipette: Pipette,
  fingerprint: Fingerprint,
};

function ToolsTeaser() {
  const navigate = useNavigate();
  const [toolQuery, setToolQuery] = useState("");

  const goToolsSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/tools", search: { q: toolQuery.trim() } });
  };

  const featured: FeaturedToolMeta[] = FEATURED_TOOLS;

  return (
    <section className="border-b border-border bg-surface-2/60">
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow"><span className="inline-flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-primary" /> Free online tools</span></p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            Icons are only half the story
          </h2>
          <p className="mt-4 text-muted-foreground">
            {TOOL_COUNT} free tools for developers, designers and creators. 5 free uses each per day,
            no account needed.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <form
            onSubmit={goToolsSearch}
            className="mx-auto mt-7 flex h-16 max-w-xl items-center gap-2 rounded-2xl bg-surface p-2 pl-6 shadow-soft ring-1 ring-ink/10"
          >
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={toolQuery}
              onChange={(e) => setToolQuery(e.target.value)}
              placeholder="Search tools: qr, compress, json, password…"
              aria-label="Search free tools"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="focus-ring shrink-0 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:px-6"
            >
              Search tools
            </button>
          </form>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
            {TOOL_CATEGORY_META.filter(({ count }) => count > 0)
              .map(({ id, label, count }, vi) => {
                const CatIcon = CATEGORY_ICONS[id] ?? Wrench;
                return (
                <Link
                  key={id}
                  to="/tools"
                  search={{ category: id }}
                  className={`focus-ring flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-2 py-2 text-center text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-soft sm:px-4 ${vi >= 8 ? "hidden sm:flex" : ""}`}
                >
                  <CatIcon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  {label}
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {count}
                  </span>
                </Link>
                );
              })}
          </div>
        </Reveal>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((t, i) => {
            const Icon = FEATURED_ICONS[t.icon] ?? Sparkles;
            return (
              <Reveal key={t.id} delay={i * 60}>
                <Link
                  to={t.path ?? "/tools"}
                  className="surface-card lift-hover focus-ring group flex h-full items-start gap-3.5 p-5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-display text-[15px] font-semibold">
                      {t.name}
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                      {t.tagline}
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120} className="mt-8 text-center">
          <Link
            to="/tools"
            className="focus-ring group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
          >
            Explore free tools
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            {TOOL_COUNT} free tools, 5 free uses each per day, no account needed
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const CODE_SAMPLE = `import { Icon } from '@iconify/react';

export function CheckoutButton() {
  return (
    <button className="btn-primary">
      <Icon icon="solar:cart-large-2-bold-duotone"
            width="20" color="#0F766E" />
      Secure checkout
    </button>
  );
}`;

/** Premium code window for the developer-experience section: gradient
    hairline, glow, floating emoji chips and a working copy button
    (Sameer 2026-10-23). */
function CodeShowcaseCard() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE_SAMPLE);
      setCopied(true);
      toast.success("Snippet copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed - select the code manually");
    }
  };

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-[image:var(--gradient-hero)] opacity-70 blur-2xl"
        aria-hidden
      />
      <span
        className="animate-float absolute -left-3 -top-4 z-10 grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface text-lg shadow-soft sm:-left-5"
        aria-hidden
      >
        ✨
      </span>
      <span
        className="animate-float absolute -bottom-4 -right-3 z-10 grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface text-lg shadow-soft [animation-delay:900ms] sm:-right-5"
        aria-hidden
      >
        🚀
      </span>
      <div className="surface-card relative overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)]" aria-hidden />
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
            <span aria-hidden>📄 </span>CheckoutButton.tsx
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
              TSX
            </span>
            <button
              type="button"
              onClick={copy}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-primary/40 hover:text-primary"
              aria-label="Copy code snippet"
            >
              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
          {CODE_SAMPLE}
        </pre>
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <span aria-hidden>✅</span> Size, colour &amp; import path baked in - paste it and it
          just works.
        </div>
      </div>
    </div>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [trap, setTrap] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotSubmission(trap)) {
      // Bot filled the honeypot: silently discard, pretend success.
      setDone(true);
      setEmail("");
      toast.success("You're on the list");
      return;
    }
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({ email: email.trim() });
    setLoading(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "You're already on the list" : "Something went wrong, try again",
      );
      return;
    }
    setDone(true);
    setEmail("");
    toast.success("You're on the list");
  };

  if (done) {
    return (
      <div className="surface-card flex items-center justify-center gap-2 px-6 py-5 text-sm text-primary">
        <Check className="h-4 w-4" /> You're on the list - we'll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex w-full flex-col gap-2.5 sm:flex-row">
      <HoneypotField onFill={setTrap} />
      <input
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@studio.com"
        aria-label="Email address"
        className="focus-ring h-14 w-full min-w-0 flex-1 rounded-full border border-border bg-surface px-6 text-base outline-none placeholder:text-muted-foreground sm:h-12 sm:px-5"
      />
      <button
        type="submit"
        disabled={loading}
        className="focus-ring h-14 w-full shrink-0 rounded-full bg-ink px-8 text-base font-semibold text-background transition-transform hover:scale-[1.03] disabled:opacity-50 sm:h-12 sm:w-auto sm:px-6 sm:text-sm sm:font-medium"
      >
        {loading ? "Adding…" : "Join the list"}
      </button>
    </form>
  );
}

function Landing() {
  const navigate = useNavigate();
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
        <section className="hero-glow relative overflow-hidden">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-[1440px] px-5 pb-20 pt-20 text-center sm:pt-28 lg:px-8">
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
                  className="focus-ring group inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.03] sm:w-auto"
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
                      className="animate-float grid aspect-square place-items-center rounded-2xl border border-border bg-surface shadow-soft transition-transform duration-300 hover:-translate-y-1.5 hover:border-primary/40"
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

        {/* Collection styles chip cloud (added 2026-10-23) */}
        <StyleChips />

        {/* Free tools teaser */}
        <ToolsTeaser />

        {/* Marquee - premium pill band with real set icons (2026-10-23) */}
        <MarqueeBand />

        {/* From the blog (added 2026-10-22) */}
        <BlogTeaser />

        {/* Stats */}
        <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 70} className="surface-card lift-hover px-5 py-7 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary ring-1 ring-inset ring-border/60">
                  <s.icon className="h-5 w-5" />
                </span>
                <p className="mt-3.5 font-display text-3xl font-semibold text-primary sm:text-4xl">{s.value}</p>
                <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
          <Reveal className="max-w-2xl">
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
              <Reveal key={f.title} delay={i * 60} className="surface-card lift-hover group p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary ring-1 ring-inset ring-border/60 transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Code showcase */}
        <section className="border-y border-border bg-surface-2">
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
              <CodeShowcaseCard />
            </Reveal>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-8">
          <Reveal className="text-center">
            <p className="eyebrow"><span className="inline-flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5 text-primary" /> How it works</span></p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Idea to icon in three moves
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delay={i * 90} className="surface-card lift-hover group relative overflow-hidden p-7">
                <span className="flex items-start justify-between">
                  <span className="font-display text-5xl font-semibold text-primary/15">{s.step}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary ring-1 ring-inset ring-border/60 transition-transform duration-300 group-hover:scale-110">
                    <s.icon className="h-5 w-5" />
                  </span>
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Testimonials hidden on the homepage at all resolutions (Sameer 2026-10-23). */}

        {/* Waitlist + CTA */}
        <section className="mx-auto max-w-3xl px-5 py-20 text-center lg:px-8">
          <Reveal>
            <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[image:var(--gradient-hero)] text-primary shadow-soft ring-1 ring-inset ring-border/60">
              <Mail className="h-5 w-5" />
            </span>
            <p className="eyebrow">Stay in the loop</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              New sets, new tooling, once a month
            </h2>
            <p className="mt-4 text-muted-foreground">
              No noise - just newly indexed icon families and the occasional workflow trick.
            </p>
            <div className="mx-auto mt-7 max-w-md">
              <WaitlistForm />
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-3xl border border-border bg-ink px-6 py-16 text-center">
            <span className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <span className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
            {[
              { id: "lucide:rocket", cls: "left-[7%] top-10", delay: "0ms" },
              { id: "lucide:palette", cls: "right-[8%] top-12", delay: "500ms" },
              { id: "lucide:heart", cls: "bottom-10 left-[11%]", delay: "1000ms" },
              { id: "lucide:zap", cls: "bottom-12 right-[12%]", delay: "1500ms" },
            ].map((t) => {
              const [prefix, name] = t.id.split(":");
              return (
                <span
                  key={t.id}
                  style={{ animationDelay: t.delay }}
                  className={`animate-float pointer-events-none absolute ${t.cls} hidden h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm md:grid`}
                  aria-hidden
                >
                  <img
                    src={getIconSvgUrl(prefix ?? "", name ?? "", { width: 22, height: 22, color: "#FFFFFF" })}
                    alt=""
                    className="h-[22px] w-[22px] opacity-90"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              );
            })}
            <h2 className="relative font-display text-3xl font-semibold tracking-tight text-background sm:text-4xl">
              Icons and tools, ready when you are
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm text-background/70">
              Free to search, free to export, {TOOL_COUNT} free tools with 5 uses each. Sign
              in only when you want favourites and collections to follow you.
            </p>
            <Link
              to="/tools"
              className="focus-ring relative mt-8 inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-transform hover:scale-[1.03]"
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
