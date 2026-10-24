// Homepage "Free online tools" teaser (extracted from src/routes/index.tsx,
// v26 PERF-M3): lazy-loaded so it stays out of the homepage entry chunk.
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  Calculator,
  ClipboardList,
  Code2,
  Eraser,
  EyeOff,
  Film,
  Fingerprint,
  Gamepad2,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  Lock,
  Minimize2,
  Palette,
  PenTool,
  Pipette,
  QrCode,
  Search,
  Shapes,
  Sparkles,
  TrendingUp,
  Type,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { TOOL_COUNT, TOOL_CATEGORY_META, FEATURED_TOOLS, type FeaturedToolMeta } from "@/lib/tool-catalog-meta";

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

export default ToolsTeaser;
