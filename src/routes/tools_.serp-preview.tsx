// /tools/serp-preview - Google search result preview with pixel-width
// checks for title and description. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/serp-preview";
import toolSeoMeta from "@/lib/tool-seo-meta-data/serp-preview";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/serp-preview")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/serp-preview";
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
  component: SerpPreviewTool,
});

const TITLE_FONT = "20px Arial";
const DESC_FONT = "14px Arial";
const TITLE_MAX_PX = 580;
const DESC_MAX_PX = 990;

let canvasCtx: CanvasRenderingContext2D | null = null;

/** Measure text width in pixels with a canvas 2d context (SSR-safe). */
function measurePx(text: string, font: string): number {
  if (typeof document === "undefined") return 0;
  if (!canvasCtx) {
    canvasCtx = document.createElement("canvas").getContext("2d");
  }
  if (!canvasCtx) return 0;
  canvasCtx.font = font;
  return Math.round(canvasCtx.measureText(text).width);
}

function SerpCard({ title, url, description, mobile }: { title: string; url: string; description: string; mobile: boolean }) {
  const displayUrl = (url.trim() || "example.com")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  return (
    <div
      className="rounded-xl border border-border bg-white p-5 shadow-sm"
      style={{ fontFamily: "Arial, sans-serif", maxWidth: mobile ? 380 : 640 }}
    >
      <p className="text-xs text-[#202124]">
        <span className="mr-1.5 inline-block h-6 w-6 rounded-full bg-slate-200 align-middle text-center text-[10px] leading-6 text-slate-500">
          {displayUrl.charAt(0).toUpperCase()}
        </span>
        {displayUrl}
      </p>
      <p
        className="mt-1 cursor-pointer truncate font-normal text-[#1a0dab] hover:underline"
        style={{ fontSize: mobile ? 18 : 20, lineHeight: 1.3 }}
      >
        {title.trim() || "Your page title appears here"}
      </p>
      <p
        className="mt-1 text-[#4d5156]"
        style={{
          fontSize: 14,
          lineHeight: 1.58,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {description.trim() || "Your meta description appears here. Keep it under 160 characters so Google shows the full snippet."}
      </p>
    </div>
  );
}

function SerpPreviewTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("serp-preview", isPro);
  const seo = toolSeo;

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const titlePx = measurePx(title || " ", TITLE_FONT);
  const descPx = measurePx(description || " ", DESC_FONT);
  const titleTooLong = title.trim().length > 0 && titlePx > TITLE_MAX_PX;
  const descTooLong = description.trim().length > 0 && descPx > DESC_MAX_PX;

  const saveCheck = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    toast.success("SERP check saved");
  };

  return (
    <ToolPageShell toolId="serp-preview" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SERP Preview" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="serp-title" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Page title
            </label>
            <input
              id="serp-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Free Keyword Density Checker - IconVault"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">
              {titlePx} px {titleTooLong && <span className="font-sans font-semibold text-amber-600">- too long, Google may truncate (max {TITLE_MAX_PX}px)</span>}
            </p>
          </div>
          <div>
            <label htmlFor="serp-url" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Display URL
            </label>
            <input
              id="serp-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="iconvault.site/tools/keyword-density"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label htmlFor="serp-desc" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Meta description
            </label>
            <textarea
              id="serp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short summary of the page..."
              rows={4}
              className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">
              {descPx} px {descTooLong && <span className="font-sans font-semibold text-amber-600">- too long, Google may truncate (max {DESC_MAX_PX}px)</span>}
            </p>
          </div>
          <ActionButton disabled={!trial.canUse} onClick={saveCheck}>
            <Save className="h-4 w-4" /> Save check
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free checks left - typing and previews are unlimited.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Monitor className="h-4 w-4 text-muted-foreground" /> Desktop
            </p>
            <SerpCard title={title} url={url} description={description} mobile={false} />
          </div>
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Smartphone className="h-4 w-4 text-muted-foreground" /> Mobile
            </p>
            <SerpCard title={title} url={url} description={description} mobile={true} />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
