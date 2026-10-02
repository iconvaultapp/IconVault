// /tools/font-preview - Type tester for a curated list of ~200 popular
// Google Fonts (popular picks, not the full catalog), with compare mode.
// Fonts load from the Google Fonts CDN as you browse. 100% in-browser.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Copy, Check, Columns2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/font-preview")({
  head: () => {
    const seo = getToolSeoMeta("font-preview");
    const canonical = "https://iconvault.site/tools/font-preview";
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.metaDescription },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: seo.title },
        { name: "twitter:description", content: seo.metaDescription },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: FontPreviewTool,
});

// Curated popular picks - NOT the full Google Fonts catalog (~1800+ families).
const FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway", "Nunito", "Nunito Sans",
  "Work Sans", "DM Sans", "Manrope", "Outfit", "Plus Jakarta Sans", "Urbanist", "Mulish", "Karla", "Jost",
  "Cabin", "Rubik", "Quicksand", "Comfortaa", "Varela Round", "Oswald", "Barlow", "Barlow Condensed",
  "Archivo", "Asap", "Assistant", "Atkinson Hyperlegible", "Be Vietnam Pro", "Bricolage Grotesque",
  "Chivo", "Dosis", "Exo 2", "Figtree", "Fira Sans", "Heebo", "IBM Plex Sans", "Instrument Sans",
  "Kumbh Sans", "League Spartan", "Lexend", "Libre Franklin", "Maven Pro", "Mukta", "Noto Sans",
  "Overpass", "PT Sans", "Public Sans", "Red Hat Display", "Red Hat Text", "Sora", "Tajawal",
  "Titillium Web", "Ubuntu", "Varela", "Yanone Kaffeesatz", "Hanken Grotesk", "Figtree", "Space Grotesk",
  "Sora", "Schibsted Grotesk", "Golos Text", "Onest", "Wix Madefor Text", "Albert Sans", "Anybody",
  "Bricolage Grotesque", "Familjen Grotesk",
  "Gochi Hand", "Host Grotesk", "Inclusive Sans", "Instrument Serif", "Geist",
  "Playfair Display", "Lora", "Merriweather", "PT Serif", "Cormorant Garamond", "Libre Baskerville",
  "EB Garamond", "Crimson Pro", "Fraunces", "DM Serif Display", "Source Serif 4", "Noto Serif",
  "Vollkorn", "Bitter", "Domine", "Alegreya", "Cardo", "Cinzel", "Italiana", "Marcellus",
  "Old Standard TT", "Spectral", "Tinos", "Zilla Slab", "Slabo 27px", "Roboto Slab", "Arvo",
  "Josefin Slab", "Patua One", "Alfa Slab One", "Rozha One", "Yeseva One", "Gloock", "Instrument Serif",
  "Bodoni Moda", "Cormorant", "Marcellus", "Cormorant Upright", "Elsie", "Gilda Display",
  "Bebas Neue", "Anton", "Archivo Black", "Abril Fatface", "Lobster", "Pacifico", "Righteous",
  "Bungee", "Russo One", "Chakra Petch", "Orbitron", "Audiowide", "Permanent Marker", "Satisfy",
  "Caveat", "Dancing Script", "Great Vibes", "Shadows Into Light", "Indie Flower", "Kalam",
  "Amatic SC", "Josefin Sans", "Kaushan Script", "Luckiest Guy", "Fredoka", "Baloo 2", "Titan One",
  "Monoton", "Black Ops One", "Bangers", "Chewy", "Ultra", "Zilla Slab Highlight", "Six Caps",
  "Staatliches", "Teko", "Saira Condensed", "Pathway Gothic One", "Fjalla One", "Francois One",
  "Passion One", "Paytone One", "Racing Sans One", "Rammetto One", "Changa One", "Lilita One",
  "Bowlby One", "Bowlby One SC", "Alfa Slab One", "Bree Serif", "Vast Shadow",
  "Roboto Mono", "IBM Plex Mono", "JetBrains Mono", "Source Code Pro", "Fira Code", "Space Mono",
  "Inconsolata", "DM Mono", "Ubuntu Mono", "Anonymous Pro", "Courier Prime", "Cutive Mono",
  "Major Mono Display", "Nanum Gothic Coding", "Oxygen Mono", "PT Mono", "Share Tech Mono",
  "Victor Mono", "Red Hat Mono", "Geist Mono", "Spline Sans Mono",
];

const SERIF = new Set([
  "Playfair Display", "Lora", "Merriweather", "PT Serif", "Cormorant Garamond", "Libre Baskerville",
  "EB Garamond", "Crimson Pro", "Fraunces", "DM Serif Display", "Source Serif 4", "Noto Serif",
  "Vollkorn", "Bitter", "Domine", "Alegreya", "Cardo", "Cinzel", "Italiana", "Marcellus",
  "Old Standard TT", "Spectral", "Tinos", "Zilla Slab", "Slabo 27px", "Roboto Slab", "Arvo",
  "Josefin Slab", "Patua One", "Alfa Slab One", "Rozha One", "Yeseva One", "Gloock", "Instrument Serif",
  "Bodoni Moda", "Cormorant", "Cormorant Upright", "Elsie", "Gilda Display", "Bree Serif",
]);

const MONO = new Set([
  "Roboto Mono", "IBM Plex Mono", "JetBrains Mono", "Source Code Pro", "Fira Code", "Space Mono",
  "Inconsolata", "DM Mono", "Ubuntu Mono", "Anonymous Pro", "Courier Prime", "Cutive Mono",
  "Major Mono Display", "Nanum Gothic Coding", "Oxygen Mono", "PT Mono", "Share Tech Mono",
  "Victor Mono", "Red Hat Mono", "Geist Mono", "Spline Sans Mono",
]);

const fallbackFor = (f: string) => (SERIF.has(f) ? "serif" : MONO.has(f) ? "monospace" : "sans-serif");
const familyCss = (f: string) => `font-family: '${f}', ${fallbackFor(f)};`;

const PAGE = 24;

function FontPreviewTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("font-preview", isPro);
  const seo = getToolSeo("font-preview");

  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog");
  const [size, setSize] = useState(28);
  const [weight, setWeight] = useState(400);
  const [copied, setCopied] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [pick, setPick] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...new Set(FONTS)];
    return q ? list.filter((f) => f.toLowerCase().includes(q)) : list;
  }, [query]);

  const visible = useMemo(() => filtered.slice(0, shown), [filtered, shown]);

  // Load only the visible fonts so the page stays fast.
  useEffect(() => {
    const id = "iv-font-preview-link";
    document.getElementById(id)?.remove();
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?" +
      visible.map((f) => `family=${f.replace(/ /g, "+")}`).join("&") +
      "&display=swap";
    document.head.appendChild(link);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [visible]);

  useEffect(() => setShown(PAGE), [query]);

  const copyFamily = async (f: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(familyCss(f));
      trial.recordUse();
      setCopied(f);
      toast.success(`Copied ${f}`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const onCardClick = (f: string) => {
    if (compare) {
      setPick((p) => {
        if (p.includes(f)) return p.filter((x) => x !== f);
        const next = [...p, f];
        return next.slice(-2);
      });
    } else {
      void copyFamily(f);
    }
  };

  return (
    <ToolPageShell toolId="font-preview" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Font Preview" left={trial.left} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_160px_160px]">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Test text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Size</label>
              <span className="text-xs font-mono text-muted-foreground">{size}px</span>
            </div>
            <input type="range" min={12} max={96} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-2 w-full accent-primary" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Weight</label>
              <span className="text-xs font-mono text-muted-foreground">{weight}</span>
            </div>
            <input type="range" min={100} max={900} step={100} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="mt-2 w-full accent-primary" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
            <input type="checkbox" checked={compare} onChange={(e) => { setCompare(e.target.checked); setPick([]); }} className="h-4 w-4 accent-primary" />
            <Columns2 className="h-4 w-4" /> Compare mode
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          A curated list of {new Set(FONTS).size} popular Google Fonts, not the full catalog of 1800+ families.
          {compare ? " In compare mode, click two fonts to view them side by side." : " Click any card to copy its font-family CSS."}
        </p>
      </div>

      {compare && pick.length > 0 && (
        <div className="mb-6 rounded-2xl border border-primary/40 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Side by side comparison</p>
            <button type="button" onClick={() => setPick([])} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pick.map((f) => (
              <div key={f} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold">{f}</p>
                  <button
                    type="button"
                    onClick={() => void copyFamily(f)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:border-primary/40"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
                <p className="break-words leading-snug" style={{ fontFamily: `'${f}'`, fontSize: Math.min(size + 8, 96), fontWeight: weight }}>
                  {text || "Aa"}
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{familyCss(f)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onCardClick(f)}
            className={cn(
              "rounded-2xl border bg-card p-5 text-left transition",
              pick.includes(f) ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">{f}</p>
              {copied === f ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="break-words leading-snug" style={{ fontFamily: `'${f}'`, fontSize: size, fontWeight: weight }}>
              {text || "Aa"}
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">{familyCss(f)}</p>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">No fonts match "{query}". Try another search.</p>
      )}

      {shown < filtered.length && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setShown((s) => s + PAGE)}
            className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-bold hover:border-primary/40"
          >
            Load more ({filtered.length - shown} remaining)
          </button>
        </div>
      )}

      {!isPro && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - fonts stream from Google Fonts as you browse.
        </p>
      )}
    </ToolPageShell>
  );
}
