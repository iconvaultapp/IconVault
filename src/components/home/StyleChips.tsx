// Homepage "Collection styles" chip cloud (Sameer 2026-10-23, inspired by a
// reference he shared): one pill per visual style, each pill showing a
// DIFFERENT real sample icon from the set that best represents the style.
// Every chip lands straight on that icon set in the vault - no dead links.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shapes } from "lucide-react";
import ReliableIcon from "@/components/ReliableIcon";
import { Reveal } from "@/components/Reveal";
import { fetchCollections, parseIconId, type IconifyCollection } from "@/lib/iconify";

const STYLES: { label: string; set: string }[] = [
  { label: "Monocolor", set: "simple-icons" },
  { label: "Multicolor", set: "flat-color-icons" },
  { label: "Outlined", set: "lucide" },
  { label: "Filled", set: "mdi" },
  { label: "Glyph", set: "glyphs" },
  { label: "Interface", set: "tabler" },
  { label: "Duotone", set: "ph" },
  { label: "Flat", set: "fluent-color" },
  { label: "Bordered", set: "bx" },
  { label: "Line", set: "iconoir" },
  { label: "Bold", set: "solar" },
  { label: "Thin", set: "circum" },
  { label: "Basic", set: "carbon" },
  { label: "Sharp", set: "material-symbols" },
  { label: "Rounded", set: "heroicons" },
  { label: "Circular", set: "arcticons" },
  { label: "Emoji", set: "twemoji" },
  { label: "Logo", set: "logos" },
  { label: "Pixel", set: "pixelarticons" },
  { label: "Stylized", set: "game-icons" },
  { label: "Animated", set: "svg-spinners" },
  { label: "Flags", set: "flag" },
  { label: "Weather", set: "meteocons" },
  { label: "Dev & Code", set: "devicon" },
  { label: "Crypto", set: "token-branded" },
  { label: "Color", set: "noto" },
];

export default function StyleChips() {
  const [collections, setCollections] = useState<Record<string, IconifyCollection>>({});

  useEffect(() => {
    let alive = true;
    void fetchCollections().then((c) => {
      if (alive) setCollections(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="relative overflow-hidden">
      <span
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1440px] px-5 py-20 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow"><span className="inline-flex items-center gap-1.5"><Shapes className="h-3.5 w-3.5 text-primary" /> Collection styles</span></p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Pick a <span className="text-gradient">style</span>, land on the set
            </h2>
            <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">
              Every style in the vault, one tap away - each chip opens the icon set that wears
              it best.
            </p>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {STYLES.map((style, i) => {
              const collection = collections[style.set];
              const samples = collection?.samples ?? [];
              const sample = samples.length > 0 ? samples[i % samples.length] : undefined;
              const parsed = sample
                ? sample.includes(":")
                  ? parseIconId(sample)
                  : { prefix: style.set, name: sample }
                : null;
              return (
                <Link
                  key={style.label}
                  to="/app"
                  search={{ set: style.set }}
                  className="surface-card lift-hover focus-ring group inline-flex items-center gap-2.5 rounded-full py-2.5 pl-3.5 pr-4 text-sm font-semibold"
                  aria-label={`Browse ${style.label} icons (${collection?.name ?? style.set})`}
                >
                  {parsed && (
                    <span className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-125">
                      <ReliableIcon
                        prefix={parsed.prefix}
                        name={parsed.name}
                        alt=""
                        width={20}
                        height={20}
                        className="opacity-85 group-hover:opacity-100"
                      />
                    </span>
                  )}
                  {style.label}
                </Link>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
