// /tools/meta-generator - SEO meta tag generator. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Tags, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/meta-generator")({
  head: () => {
    const seo = getToolSeoMeta("meta-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MetaGeneratorTool,
});

type RobotsValue = "index, follow" | "noindex, follow" | "index, nofollow" | "noindex, nofollow";
type OgType = "website" | "article";
type TwitterCard = "summary" | "summary_large_image";

const ROBOTS_OPTIONS: RobotsValue[] = ["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface MetaFields {
  title: string;
  description: string;
  keywords: string;
  author: string;
  canonical: string;
  robots: RobotsValue;
  themeColor: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: OgType;
  twitterCard: TwitterCard;
}

function buildMeta(f: MetaFields): string {
  const L: string[] = [];
  const t = f.title.trim();
  if (t) L.push(`<title>${escAttr(t)}</title>`);
  const d = f.description.trim();
  if (d) L.push(`<meta name="description" content="${escAttr(d)}">`);
  const k = f.keywords.trim();
  if (k) L.push(`<meta name="keywords" content="${escAttr(k)}">`);
  const a = f.author.trim();
  if (a) L.push(`<meta name="author" content="${escAttr(a)}">`);
  L.push(`<meta name="robots" content="${f.robots}">`);
  const c = f.canonical.trim();
  if (c) L.push(`<link rel="canonical" href="${escAttr(c)}">`);
  if (f.themeColor) L.push(`<meta name="theme-color" content="${f.themeColor}">`);
  const ot = f.ogTitle.trim() || t;
  if (ot) L.push(`<meta property="og:title" content="${escAttr(ot)}">`);
  const od = f.ogDescription.trim() || d;
  if (od) L.push(`<meta property="og:description" content="${escAttr(od)}">`);
  const oi = f.ogImage.trim();
  if (oi) L.push(`<meta property="og:image" content="${escAttr(oi)}">`);
  const ou = f.ogUrl.trim() || c;
  if (ou) L.push(`<meta property="og:url" content="${escAttr(ou)}">`);
  L.push(`<meta property="og:type" content="${f.ogType}">`);
  L.push(`<meta name="twitter:card" content="${f.twitterCard}">`);
  return L.join("\n");
}

function MetaGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("meta-generator", isPro);
  const seo = getToolSeo("meta-generator");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [author, setAuthor] = useState("");
  const [canonical, setCanonical] = useState("");
  const [robots, setRobots] = useState<RobotsValue>("index, follow");
  const [themeColor, setThemeColor] = useState("#0d9488");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [ogUrl, setOgUrl] = useState("");
  const [ogType, setOgType] = useState<OgType>("website");
  const [twitterCard, setTwitterCard] = useState<TwitterCard>("summary_large_image");

  const output = buildMeta({
    title, description, keywords, author, canonical, robots, themeColor,
    ogTitle, ogDescription, ogImage, ogUrl, ogType, twitterCard,
  });

  const titleLong = title.length > 60;
  const descLong = description.length > 160;

  const generate = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    toast.success("Meta tags generated - copy them from the preview");
  };

  const copy = () => {
    if (!output) {
      toast.error("Nothing to copy yet - fill in at least one field");
      return;
    }
    navigator.clipboard
      .writeText(output)
      .then(() => toast.success("Meta tags copied"))
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="meta-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Meta Tag Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className={labelCls} htmlFor="mg-title">Page title</label>
            <input id="mg-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My awesome page" />
            <p className={`mt-1 text-xs ${titleLong ? "font-semibold text-amber-600" : "text-muted-foreground"}`}>
              {title.length} / 60 characters{titleLong ? " - too long, Google may truncate it" : ""}
            </p>
          </div>

          <div>
            <label className={labelCls} htmlFor="mg-desc">Meta description</label>
            <textarea id="mg-desc" className={`${inputCls} min-h-[76px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short summary shown in search results" />
            <p className={`mt-1 text-xs ${descLong ? "font-semibold text-amber-600" : "text-muted-foreground"}`}>
              {description.length} / 160 characters{descLong ? " - too long, Google may truncate it" : ""}
            </p>
          </div>

          <div>
            <label className={labelCls} htmlFor="mg-keywords">Keywords (comma separated)</label>
            <input id="mg-keywords" className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="icons, svg, free download" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="mg-author">Author</label>
              <input id="mg-author" className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="IconVault" />
            </div>
            <div>
              <label className={labelCls} htmlFor="mg-robots">Robots</label>
              <select id="mg-robots" className={inputCls} value={robots} onChange={(e) => setRobots(e.target.value as RobotsValue)}>
                {ROBOTS_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="mg-canonical">Canonical URL</label>
            <input id="mg-canonical" className={inputCls} value={canonical} onChange={(e) => setCanonical(e.target.value)} placeholder="https://example.com/page" inputMode="url" />
          </div>

          <div>
            <span className={labelCls}>Theme color</span>
            <div className="flex items-center gap-3">
              <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-background p-1" aria-label="Theme color" />
              <span className="font-mono text-sm text-muted-foreground">{themeColor}</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Tags className="h-4 w-4 text-primary" /> Open Graph</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls} htmlFor="mg-ogt">og:title (falls back to page title)</label>
                <input id="mg-ogt" className={inputCls} value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} placeholder="Leave blank to reuse page title" />
              </div>
              <div>
                <label className={labelCls} htmlFor="mg-ogd">og:description (falls back to meta description)</label>
                <input id="mg-ogd" className={inputCls} value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} placeholder="Leave blank to reuse meta description" />
              </div>
              <div>
                <label className={labelCls} htmlFor="mg-ogi">og:image URL</label>
                <input id="mg-ogi" className={inputCls} value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://example.com/og-image.png" inputMode="url" />
              </div>
              <div>
                <label className={labelCls} htmlFor="mg-ogu">og:url (falls back to canonical)</label>
                <input id="mg-ogu" className={inputCls} value={ogUrl} onChange={(e) => setOgUrl(e.target.value)} placeholder="https://example.com/page" inputMode="url" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="mg-ogtype">og:type</label>
                  <select id="mg-ogtype" className={inputCls} value={ogType} onChange={(e) => setOgType(e.target.value as OgType)}>
                    <option value="website">website</option>
                    <option value="article">article</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="mg-tw">Twitter card</label>
                  <select id="mg-tw" className={inputCls} value={twitterCard} onChange={(e) => setTwitterCard(e.target.value as TwitterCard)}>
                    <option value="summary">summary</option>
                    <option value="summary_large_image">summary_large_image</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Wand2 className="h-4 w-4" /> Generate meta tags
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Generated HTML - paste inside your {"<head>"}</p>
            <button
              type="button" onClick={copy}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          <textarea
            readOnly value={output} spellCheck={false}
            className="min-h-[420px] w-full flex-1 resize-y rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed outline-none"
            placeholder="Your meta tags appear here as you type"
          />
        </div>
      </div>
    </ToolPageShell>
  );
}
