// /tools/open-graph-generator - Open Graph + Twitter card tag generator with a
// live Facebook-style link preview. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Image as ImageIcon, Share2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/open-graph-generator")({
  head: () => {
    const seo = getToolSeoMeta("open-graph-generator");
    const canonical = "https://iconvault.site/tools/open-graph-generator";
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
  component: OpenGraphGeneratorTool,
});

type OgType = "website" | "article";
type TwitterCard = "summary" | "summary_large_image";

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

interface OgFields {
  title: string;
  description: string;
  image: string;
  url: string;
  type: OgType;
  siteName: string;
  imageWidth: string;
  imageHeight: string;
  twitterCard: TwitterCard;
}

function buildOgTags(f: OgFields): string {
  const L: string[] = [];
  const t = f.title.trim();
  const d = f.description.trim();
  const img = f.image.trim();
  const u = f.url.trim();
  if (t) {
    L.push(`<meta property="og:title" content="${escAttr(t)}">`);
    L.push(`<meta name="twitter:title" content="${escAttr(t)}">`);
  }
  if (d) {
    L.push(`<meta property="og:description" content="${escAttr(d)}">`);
    L.push(`<meta name="twitter:description" content="${escAttr(d)}">`);
  }
  if (img) {
    L.push(`<meta property="og:image" content="${escAttr(img)}">`);
    L.push(`<meta name="twitter:image" content="${escAttr(img)}">`);
  }
  if (u) L.push(`<meta property="og:url" content="${escAttr(u)}">`);
  L.push(`<meta property="og:type" content="${f.type}">`);
  const sn = f.siteName.trim();
  if (sn) L.push(`<meta property="og:site_name" content="${escAttr(sn)}">`);
  const w = f.imageWidth.trim();
  if (w) L.push(`<meta property="og:image:width" content="${escAttr(w)}">`);
  const h = f.imageHeight.trim();
  if (h) L.push(`<meta property="og:image:height" content="${escAttr(h)}">`);
  L.push(`<meta name="twitter:card" content="${f.twitterCard}">`);
  return L.join("\n");
}

function OpenGraphGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("open-graph-generator", isPro);
  const seo = getToolSeo("open-graph-generator");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<OgType>("website");
  const [siteName, setSiteName] = useState("");
  const [imageWidth, setImageWidth] = useState("1200");
  const [imageHeight, setImageHeight] = useState("630");
  const [twitterCard, setTwitterCard] = useState<TwitterCard>("summary_large_image");

  const output = buildOgTags({
    title, description, image, url, type, siteName, imageWidth, imageHeight, twitterCard,
  });

  const generate = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    toast.success("Open Graph tags generated - copy them from the preview");
  };

  const copy = () => {
    if (!output) {
      toast.error("Nothing to copy yet - fill in at least one field");
      return;
    }
    navigator.clipboard
      .writeText(output)
      .then(() => toast.success("Open Graph tags copied"))
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="open-graph-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Open Graph Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className={labelCls} htmlFor="og-title">og:title</label>
            <input id="og-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The title shown when shared" />
          </div>
          <div>
            <label className={labelCls} htmlFor="og-desc">og:description</label>
            <textarea id="og-desc" className={`${inputCls} min-h-[76px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One or two sentences about the page" />
          </div>
          <div>
            <label className={labelCls} htmlFor="og-image">og:image URL</label>
            <input id="og-image" className={inputCls} value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://example.com/share-image.png" inputMode="url" />
          </div>
          <div>
            <label className={labelCls} htmlFor="og-url">og:url</label>
            <input id="og-url" className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/page" inputMode="url" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="og-type">og:type</label>
              <select id="og-type" className={inputCls} value={type} onChange={(e) => setType(e.target.value as OgType)}>
                <option value="website">website</option>
                <option value="article">article</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="og-sitename">Site name</label>
              <input id="og-sitename" className={inputCls} value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="IconVault" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls} htmlFor="og-w">Image width</label>
              <input id="og-w" className={inputCls} value={imageWidth} onChange={(e) => setImageWidth(e.target.value.replace(/[^0-9]/g, ""))} placeholder="1200" inputMode="numeric" />
            </div>
            <div>
              <label className={labelCls} htmlFor="og-h">Image height</label>
              <input id="og-h" className={inputCls} value={imageHeight} onChange={(e) => setImageHeight(e.target.value.replace(/[^0-9]/g, ""))} placeholder="630" inputMode="numeric" />
            </div>
            <div>
              <label className={labelCls} htmlFor="og-tw">Twitter card</label>
              <select id="og-tw" className={inputCls} value={twitterCard} onChange={(e) => setTwitterCard(e.target.value as TwitterCard)}>
                <option value="summary">summary</option>
                <option value="summary_large_image">summary_large_image</option>
              </select>
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Wand2 className="h-4 w-4" /> Generate OG tags
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Generated tags</p>
              <button
                type="button" onClick={copy}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
            <textarea
              readOnly value={output} spellCheck={false}
              className="min-h-[220px] w-full resize-y rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed outline-none"
              placeholder="Your Open Graph tags appear here as you type"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Share2 className="h-4 w-4 text-primary" /> Link preview (Facebook style)</p>
            <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-border bg-background">
              {image.trim() ? (
                <img src={image.trim()} alt="Link preview" className="aspect-[1.91/1] w-full object-cover" />
              ) : (
                <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-muted/60 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="border-t border-border bg-muted/40 p-3">
                <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                  {siteName.trim() || "example.com"}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold">{title.trim() || "Your link title"}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {description.trim() || "Your link description appears here."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
