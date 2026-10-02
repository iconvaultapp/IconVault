import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  Check,
  Code2,
  Download,
  Eraser,
  Fingerprint,
  Heart,
  Layers,
  Lock,
  Minimize2,
  Package,
  Pipette,
  QrCode,
  Search,
  Shield,
  Sparkles,
  Terminal,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SearchBar from "@/components/SearchBar";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";
import { Reveal } from "@/components/Reveal";
import { getIconSvgUrl } from "@/lib/iconify";
import { LIVE_TOOLS, TOOL_CATEGORIES, type ToolDef } from "@/lib/tool-catalog";
import { supabase } from "@/integrations/supabase/client";

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
      { property: "og:image", content: "https://iconvault.site/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IconVault - 421,020 icons and 579 free tools, one search box" },
      {
        name: "twitter:description",
        content:
          "One search box for every open-source icon set and hundreds of free online tools. Preview, recolour and export in the format your codebase already speaks.",
      },
      { name: "twitter:image", content: "https://iconvault.site/og-image.png" },
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

const MARQUEE_SETS = [
  "Lucide",
  "Material Symbols",
  "Phosphor",
  "Tabler",
  "Remix Icon",
  "Solar",
  "Heroicons",
  "Carbon",
  "Bootstrap",
  "Feather",
  "Iconoir",
  "Simple Icons",
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
    title: "Search or describe",
    desc: "Type a name, or let AI search interpret 'something that means secure checkout'.",
  },
  {
    step: "02",
    title: "Tune size and colour",
    desc: "Preview at 16 to 64px against light or dark, and dial in your exact brand hex.",
  },
  {
    step: "03",
    title: "Copy or export",
    desc: "Grab a framework snippet, download SVG/PNG, or push the set to your design tokens.",
  },
];

const STATS = [
  { value: "421,020", label: "Icons indexed" },
  { value: "239", label: "Icon sets" },
  { value: "579", label: "Free online tools" },
  { value: "17", label: "Tool categories" },
];

/** Homepage tool discovery: chips, featured cards, trial line. */
const FEATURED_TOOL_IDS = [
  "qr-generator",
  "image-compressor",
  "password-generator",
  "json-formatter",
  "background-remover",
  "word-counter",
  "color-converter",
  "uuid-generator",
];

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

  const featured = FEATURED_TOOL_IDS.map((id) => LIVE_TOOLS.find((t) => t.id === id)).filter(
    (t): t is ToolDef => Boolean(t),
  );

  return (
    <section className="border-b border-border bg-surface-2/60">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Free online tools</p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            Icons are only half the story
          </h2>
          <p className="mt-4 text-muted-foreground">
            {LIVE_TOOLS.length} free tools for developers, designers and creators. 5 free uses each,
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
          <div className="mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
            {TOOL_CATEGORIES.map((c) => {
              const n = LIVE_TOOLS.filter((t) => t.category === c.id).length;
              if (n === 0) return null;
              return (
                <Link
                  key={c.id}
                  to="/tools"
                  search={{ category: c.id }}
                  className="focus-ring flex items-center justify-center rounded-full border border-border bg-surface px-2 py-2 text-center text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-soft sm:px-4"
                >
                  {c.label}
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {n}
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
            {LIVE_TOOLS.length} free tools, 5 free uses each, no account needed
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
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2 sm:flex-row">
      <HoneypotField onFill={setTrap} />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@studio.com"
        aria-label="Email address"
        className="focus-ring h-14 min-w-0 flex-1 rounded-full border border-border bg-surface px-6 text-base outline-none placeholder:text-muted-foreground sm:h-12 sm:px-5"
      />
      <button
        type="submit"
        disabled={loading}
        className="focus-ring h-14 shrink-0 rounded-full bg-ink px-8 text-base font-semibold text-background transition-transform hover:scale-[1.03] disabled:opacity-50 sm:h-12 sm:px-6 sm:text-sm sm:font-medium"
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
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 text-center sm:pt-28 lg:px-8">
            <Reveal>
              <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-primary sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[11px] sm:tracking-widest">
                <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> 421,020 icons · {LIVE_TOOLS.length} free tools ·
                one search
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mx-auto mt-7 max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                Every open-source icon,
                <br className="hidden sm:block" /> indexed so you can{" "}
                <span className="text-gradient inline-grid align-bottom text-left">
                  {words.map((word, i) => (
                    <span
                      key={word}
                      aria-hidden={i !== rotating}
                      className={`col-start-1 row-start-1 ${i !== rotating ? "invisible" : ""}`}
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
                snippet your framework wants. Need more? {LIVE_TOOLS.length} free online tools, from
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

        {/* Free tools teaser */}
        <ToolsTeaser />

        {/* Marquee */}
        <section className="overflow-hidden border-y border-border bg-surface-2 py-5">
          <div className="flex w-max animate-marquee gap-10 pr-10">
            {[...MARQUEE_SETS, ...MARQUEE_SETS].map((s, i) => (
              <span key={`${s}-${i}`} className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 70} className="surface-card lift-hover px-5 py-7 text-center">
                <p className="font-display text-3xl font-semibold text-primary sm:text-4xl">{s.value}</p>
                <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Why teams switch</p>
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
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110">
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
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8">
            <Reveal>
              <p className="eyebrow">Developer experience</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                The snippet is already correct when you paste it
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Size, colour and import path are baked into whatever you copy. Pull icons from the CLI,
                the VS Code extension, or the REST API when you'd rather not leave your editor at all.
              </p>
              <ul className="mt-6 grid gap-3">
                {[
                  { icon: Terminal, text: "CLI: iconvault add lucide:rocket" },
                  { icon: Code2, text: "REST API with per-project keys" },
                  { icon: Layers, text: "Figma plugin drops icons into frames" },
                ].map((row) => (
                  <li key={row.text} className="flex items-center gap-3 text-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <row.icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-muted-foreground">{row.text}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/api-access"
                className="focus-ring mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-accent"
              >
                Read the API docs <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>

            <Reveal delay={120}>
              <div className="surface-card overflow-hidden">
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
                  <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">CheckoutButton.tsx</span>
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
                  {CODE_SAMPLE}
                </pre>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <Reveal className="text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Idea to icon in three moves
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delay={i * 90} className="surface-card lift-hover relative overflow-hidden p-7">
                <span className="font-display text-5xl font-semibold text-primary/15">{s.step}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-y border-border bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">From the workflow</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Quietly saving product teams an afternoon a week
              </h2>
            </Reveal>
            <Reveal className="mt-10">
              <TestimonialCarousel />
            </Reveal>
          </div>
        </section>

        {/* Waitlist + CTA */}
        <section className="mx-auto max-w-3xl px-5 py-20 text-center lg:px-8">
          <Reveal>
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

        <section className="mx-auto max-w-6xl px-5 pb-24 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-3xl border border-border bg-ink px-6 py-16 text-center">
            <span className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <span className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
            <h2 className="relative font-display text-3xl font-semibold tracking-tight text-background sm:text-4xl">
              Icons and tools, ready when you are
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm text-background/70">
              Free to search, free to export, {LIVE_TOOLS.length} free tools with 5 uses each. Sign
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
