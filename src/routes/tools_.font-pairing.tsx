// /tools/font-pairing - Curated heading + body font pairings with live
// preview, editable sample text, and copyable Google Fonts snippet.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/font-pairing")({
  head: () => {
    const seo = getToolSeoMeta("font-pairing");
    const canonical = "https://iconvault.site/tools/font-pairing";
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
  component: FontPairingTool,
});

interface Pairing {
  name: string;
  heading: string;
  body: string;
  vibe: string;
}

const PAIRINGS: Pairing[] = [
  { name: "Editorial", heading: "Playfair Display", body: "Inter", vibe: "Blogs, magazines, portfolios" },
  { name: "Modern Serif", heading: "DM Serif Display", body: "DM Sans", vibe: "Startups, landing pages" },
  { name: "Friendly", heading: "Poppins", body: "Inter", vibe: "SaaS, apps, dashboards" },
  { name: "Corporate", heading: "Montserrat", body: "Open Sans", vibe: "Business, agencies" },
  { name: "Bold Condensed", heading: "Oswald", body: "Lato", vibe: "Sports, news, headlines" },
  { name: "Elegant", heading: "Raleway", body: "Nunito Sans", vibe: "Weddings, wellness, cafes" },
  { name: "Poster", heading: "Bebas Neue", body: "Work Sans", vibe: "Posters, banners, ads" },
  { name: "Artsy", heading: "Fraunces", body: "Karla", vibe: "Design studios, craft brands" },
  { name: "Classic Reading", heading: "Lora", body: "Source Sans 3", vibe: "News, long-form content" },
  { name: "Luxury", heading: "Cormorant Garamond", body: "Jost", vibe: "Fashion, hotels, jewelry" },
  { name: "Techy", heading: "Space Grotesk", body: "IBM Plex Sans", vibe: "Dev tools, docs, fintech" },
  { name: "Bookish", heading: "Libre Baskerville", body: "Mulish", vibe: "Publishing, education" },
];

const SERIF_HEADINGS = new Set(["Playfair Display", "DM Serif Display", "Fraunces", "Lora", "Cormorant Garamond", "Libre Baskerville"]);

function fontsHref(): string {
  const fams = [...new Set(PAIRINGS.flatMap((p) => [p.heading, p.body]))]
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:ital,wght@0,400..900;1,400..700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
}

function FontPairingTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("font-pairing", isPro);
  const seo = getToolSeo("font-pairing");

  const [active, setActive] = useState(0);
  const [headingText, setHeadingText] = useState("Design that speaks clearly");
  const [bodyText, setBodyText] = useState(
    "Good typography is invisible. A well chosen pairing guides the eye from headline to paragraph without friction, giving your words rhythm, hierarchy, and trust.",
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontsHref();
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const p = PAIRINGS[active]!;

  const snippet = useMemo(() => {
    const headingFallback = SERIF_HEADINGS.has(p.heading) ? "serif" : "sans-serif";
    return (
      `<!-- Google Fonts -->\n` +
      `<link rel="preconnect" href="https://fonts.googleapis.com">\n` +
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n` +
      `<link href="https://fonts.googleapis.com/css2?family=${p.heading.replace(/ /g, "+")}:ital,wght@0,400..900;1,400..700&family=${p.body.replace(/ /g, "+")}:ital,wght@0,400..900;1,400..700&display=swap" rel="stylesheet">\n\n` +
      `/* CSS */\n` +
      `.font-heading {\n  font-family: '${p.heading}', ${headingFallback};\n}\n\n` +
      `.font-body {\n  font-family: '${p.body}', sans-serif;\n}`
    );
  }, [p]);

  const copySnippet = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(snippet);
      trial.recordUse();
      setCopied(true);
      toast.success("Snippet copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="font-pairing" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Font Pairing" left={trial.left} />

      <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">Heading sample</label>
          <input
            type="text"
            value={headingText}
            onChange={(e) => setHeadingText(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">Body sample</label>
          <input
            type="text"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {PAIRINGS.map((pair, i) => (
            <button
              key={pair.name}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "rounded-2xl border bg-card p-5 text-left transition",
                active === i ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
              )}
            >
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{pair.name}</p>
              <p className="mb-2 text-2xl font-bold leading-tight" style={{ fontFamily: `'${pair.heading}'` }}>
                {headingText || "Aa"}
              </p>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground line-clamp-3" style={{ fontFamily: `'${pair.body}'` }}>
                {bodyText}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">
                  {pair.heading} / {pair.body}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground/70">{pair.vibe}</p>
            </button>
          ))}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-4 lg:self-start">
          <div>
            <p className="text-[13px] font-medium text-foreground/80">Selected pairing</p>
            <p className="mt-1 text-lg font-bold" style={{ fontFamily: `'${p.heading}'` }}>
              {p.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {p.heading} + {p.body}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">HTML + CSS snippet</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copySnippet}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy snippet"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - fonts load from Google Fonts CDN.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
