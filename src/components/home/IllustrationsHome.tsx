// Homepage illustrations section (Sameer 2026-10-23): sits directly below
// the "Browse icons" section. Shows the live illustration count and a few
// sample scenes, recoloured to the site's verdigris so they sit inside the
// existing theme, with a straight path into the /illustrations gallery.
// Samples rotate every hour (v52): a seeded round-robin over a pool of the
// smallest SVG files per pack, so every visit mixes all five packs and
// returning visitors keep seeing fresh scenes. SSR renders the original 8
// Flowbite samples; the hour's picks swap in after mount. The section
// skips off-screen rendering (cv-auto) until scrolled near, and each
// SVG still fetches only near the viewport (IllustrationArt).
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Image } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import IllustrationArt from "@/components/IllustrationArt";
import {
  ILLUSTRATION_PACKS,
  ILLUSTRATIONS,
  getIllustration,
  type IllustrationEntry,
} from "@/lib/illustrations-data";
import {
  HOME_ILLUSTRATION_POOL,
  type HomeIllustrationPick,
} from "@/lib/illustrations-home-pool";
import { useHourlyMixedSamples } from "@/lib/use-hourly-samples";

// Original samples (SSR defaults, unchanged since v19): the first paint
// looks exactly like it always did; rotation only swaps in after mount.
const SAMPLES: Array<{ slug: string; title: string }> = [
  { slug: "woman-rocket-flying", title: "Woman Rocket Flying" },
  { slug: "balloon-package-flying", title: "Balloon Package Flying" },
  { slug: "group-brainstorming", title: "Group Brainstorming" },
  { slug: "couple-dancing-music", title: "Couple Dancing Music" },
  { slug: "woman-laptop-chatting", title: "Woman Laptop Chatting" },
  { slug: "man-working-programs", title: "Man Working Programs" },
  { slug: "woman-shopping-online", title: "Woman Shopping Online" },
  { slug: "people-connecting", title: "People Connecting" },
];

const DEFAULT_PICKS: HomeIllustrationPick[] = SAMPLES.map((s) => ({
  pack: "flowbite",
  slug: s.slug,
}));

const GROUPS: Array<readonly HomeIllustrationPick[]> = ILLUSTRATION_PACKS.map((p) =>
  HOME_ILLUSTRATION_POOL.filter((x) => x.pack === p.id),
);

const BRAND_COLOR = "#0d7a68";

export const IllustrationsHome = () => {
  const picks = useHourlyMixedSamples(DEFAULT_PICKS, GROUPS, 8);
  const samples = useMemo(
    () =>
      picks
        .map((p) => getIllustration(p.pack, p.slug))
        .filter((e): e is IllustrationEntry => e !== undefined),
    [picks],
  );
  return (
    <section className="cv-auto mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow flex items-center justify-center gap-2">
            <Image className="h-3.5 w-3.5" /> Free illustrations
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Illustrations that <span className="text-gradient">match your brand</span>
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {ILLUSTRATIONS.length} free SVG illustrations for websites and apps. Recolor them to
            your brand, pick a size, and download as SVG or PNG - free for personal and
            commercial use.
          </p>
          <Link
            to="/illustrations"
            search={{ open: undefined }}
            className="group mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            Browse all {ILLUSTRATIONS.length} illustrations
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {samples.map((entry, i) => (
          <Reveal key={`${entry.pack}:${entry.slug}`} delay={Math.min(i * 60, 240)} className="h-full">
            <Link
              to="/illustrations"
              search={{ open: `${entry.pack}:${entry.slug}` }}
              className="surface-card lift-hover group block h-full p-4"
              aria-label={`Open ${entry.title} in the illustration editor`}
            >
              <span className="relative block h-44 overflow-hidden rounded-xl bg-[image:var(--gradient-hero)] ring-1 ring-inset ring-border/50">
                <IllustrationArt
                  entry={entry}
                  color={BRAND_COLOR}
                  className="absolute inset-0 p-4 transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </span>
              <span className="mt-3 flex items-center justify-between gap-2">
                <span className="truncate font-display text-[0.95rem] font-semibold tracking-tight">
                  {entry.title}
                </span>
                <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                  SVG
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default IllustrationsHome;
