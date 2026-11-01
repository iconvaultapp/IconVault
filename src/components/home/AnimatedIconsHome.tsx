// Homepage "Animated icons" showcase strip (v59, lazy-loaded below the
// fold, directly after the "New in v56" section).
//
// REAL previews, not a link card: AnimatedPreview renders live SMIL,
// CSS and iframe spinners for 8 curated entries. The mix (4 Meteocons
// SMIL <img>s, 2 Whirl/SpinKit CSS loaders, 2 Epic iframe spinners) keeps
// the strip light — NOT all 20 Epic iframes, NOT the full 625 list —
// and every slug below is verified against src/lib/animated-icons-data.ts.
// Previews are 80px: slightly larger than the 76px gallery treatment
// (detail pages use 160px, which is the ceiling reference, not the
// target). interactive={false} makes each preview click-through so the
// whole card <Link> navigates to the animation's detail route.
//
// Counts come only from the data file (ANIMATED_TOTAL = 625). This file
// imports AnimatedPreview from src/components/ and ANIMATED_ICONS from
// src/lib/ — NEVER a route file (no route-to-route imports). The
// homepage already pays for the animated-icons data file via V56Home's
// ANIMATED_TOTAL import, so this strip adds no new data-file cost.
// Caveat: cv-auto (applied by the caller) does not prevent mounting or
// fetching — CSS previews fetch on mount and lazy iframes defer only
// until near the viewport — but 8 samples is acceptable for one strip.

import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { AnimatedPreview } from "@/components/AnimatedPreview";
import { ANIMATED_ICONS, ANIMATED_TOTAL } from "@/lib/animated-icons-data";

// Curated slugs, verified present in ANIMATED_ICONS (checked 2026-11-01).
const STRIP_SLUGS = [
  "meteocons-fill-clear-day",
  "meteocons-fill-clear-night",
  "meteocons-fill-cloudy",
  "meteocons-fill-drizzle",
  "whirl-arc",
  "spinkit-chase",
  "epic-spinners-atom",
  "epic-spinners-fulfilling-bouncing-circle",
];

const STRIP_ITEMS = STRIP_SLUGS.map((slug) => ANIMATED_ICONS.find((a) => a.slug === slug)).filter(
  (a): a is NonNullable<typeof a> => a !== undefined,
);

export default function AnimatedIconsHome() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Animated icons
          </span>
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Icons that move, live in your browser
        </h2>
        <p className="mt-4 text-muted-foreground">
          {ANIMATED_TOTAL} free MIT-licensed animated icons — weather, loaders and spinners that
          preview live right here. Click any one for its detail page and download.
        </p>
      </Reveal>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STRIP_ITEMS.map((a) => (
          <Link
            key={a.slug}
            to="/animated-icons/$slug"
            params={{ slug: a.slug }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center hover:border-primary"
          >
            <AnimatedPreview item={a} size={80} interactive={false} />
            <span className="text-xs font-medium leading-tight">{a.title}</span>
            <span className="text-[11px] text-muted-foreground">
              {a.packName} · {a.format}
              {!a.animated && " · static SVG"}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/animated-icons"
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
        >
          Browse all {ANIMATED_TOTAL} animated icons <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
