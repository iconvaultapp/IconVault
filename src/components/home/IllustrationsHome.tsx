// Homepage illustrations section (Sameer 2026-10-23): sits directly below
// the "Browse icons" section. Shows the live illustration count and a few
// sample scenes, recoloured to the site's verdigris so they sit inside the
// existing theme, with a straight path into the /illustrations gallery.
import { Link } from "@tanstack/react-router";
import { ArrowRight, Image } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import IllustrationArt from "@/components/IllustrationArt";
import { ILLUSTRATIONS, getIllustration } from "@/lib/illustrations-data";

const SAMPLES: Array<{ slug: string; title: string }> = [
  { slug: "woman-rocket-flying", title: "Woman Rocket Flying" },
  { slug: "balloon-package-flying", title: "Balloon Package Flying" },
  { slug: "group-brainstorming", title: "Group Brainstorming" },
  { slug: "couple-dancing-music", title: "Couple Dancing Music" },
];

const BRAND_COLOR = "#0d7a68";

export const IllustrationsHome = () => (
  <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-2">
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
        </div>
        <Link
          to="/illustrations"
          className="group inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Browse all {ILLUSTRATIONS.length} illustrations
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Reveal>

    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {SAMPLES.map((s, i) => (
        <Reveal key={s.slug} delay={Math.min(i * 60, 240)} className="h-full">
          <Link
            to="/illustrations"
            className="surface-card lift-hover group block h-full p-4"
            aria-label={`Browse illustrations - ${s.title}`}
          >
            <span className="grid h-44 place-items-center overflow-hidden rounded-xl bg-[image:var(--gradient-hero)] px-4 ring-1 ring-inset ring-border/50">
              <IllustrationArt
                entry={getIllustration("flowbite", s.slug)}
                color={BRAND_COLOR}
                className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
              />
            </span>
            <span className="mt-3 flex items-center justify-between gap-2">
              <span className="truncate font-display text-[0.95rem] font-semibold tracking-tight">
                {s.title}
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

export default IllustrationsHome;
