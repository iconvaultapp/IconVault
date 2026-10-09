// Hero section for the browse (/) and tools (/tools) pages.
// Warm ivory canvas, burgundy headline accents, floating icon chips behind.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import FloatingIcons from "./FloatingIcons";
import { cn } from "@/lib/utils";

interface HeroProps {
  variant: "icons" | "tools";
  onSearch: (q: string) => void;
}

const COPY = {
  icons: {
    badge: "421,020 icons · 579 free tools · one search",
    titleA: "Every open-source icon,",
    titleB: "indexed so you can",
    titleAccent: "stay consistent",
    sub: "IconVault searches 421,020 icons from Lucide, Phosphor, Material Symbols, Tabler and 150 other families. Preview at real size, recolour to your brand, then copy the exact snippet your framework wants. Need more? 579 free online tools, from QR codes to background removers, run right in your browser.",
    placeholder: "Search 421,020 icons – try 'shopping cart'",
  },
  tools: {
    badge: "579 free tools · no signup · runs in your browser",
    titleA: "Icons are only",
    titleB: "half the story.",
    titleAccent: "Meet the toolbox.",
    sub: "579 free online tools that run entirely in your browser — convert, compress, generate and create without uploading a thing. No signup, no paywalls on the basics. Pick a category below or search for exactly what you need.",
    placeholder: "Search 579 tools – try 'qr generator'",
  },
} as const;

export default function BrowseHero({ variant, onSearch }: HeroProps) {
  const c = COPY[variant];
  const [value, setValue] = useState("");

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch(value);
  };

  return (
    <section className="relative overflow-hidden">
      <FloatingIcons />
      {/* soft burgundy + teal glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="relative mx-auto max-w-4xl px-5 pb-10 pt-14 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {c.badge}
        </span>

        <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
          {c.titleA}
          <br />
          {c.titleB}{" "}
          <span className="text-primary">{c.titleAccent}</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {c.sub}
        </p>

        <form onSubmit={submit} className="mx-auto mt-8 max-w-xl">
          <div className="focus-ring flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-1.5 shadow-soft transition-shadow focus-within:shadow-lift">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={c.placeholder}
              aria-label="Search"
              className="h-11 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="hidden shrink-0 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
              ⌘K
            </kbd>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {variant === "icons" ? (
            <>
              <Link
                to="/tools"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-90"
              >
                Explore free tools <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() =>
                  document.getElementById("browse-results")?.scrollIntoView({ behavior: "smooth" })
                }
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Browse the vault
              </button>
              <Link
                to="/ai-search"
                className={cn(
                  "focus-ring inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-6 py-3 text-sm font-semibold text-primary transition hover:brightness-95",
                )}
              >
                <Sparkles className="h-4 w-4" /> Try AI search
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/app"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition hover:opacity-90"
              >
                Browse 421,020 icons <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() =>
                  document.getElementById("tools-grid")?.scrollIntoView({ behavior: "smooth" })
                }
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Explore the toolbox
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
