// /tools/twitter-card-preview - Preview X (Twitter) cards and copy the meta
// tags. 100% client-side, nothing leaves the browser.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AtSign, Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/twitter-card-preview")({
  head: () => {
    const seo = getToolSeoMeta("twitter-card-preview");
    const canonical = "https://iconvault.site/tools/twitter-card-preview";
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
  component: TwitterCardTool,
});

type CardType = "summary" | "summary_large_image";

const LIMITS = { title: 70, description: 200 };

function Counter({ value, limit, label }: { value: string; limit: number; label: string }) {
  const over = value.length > limit;
  return (
    <p className={cn("text-xs", over ? "font-bold text-red-500" : "text-muted-foreground")}>
      {value.length} / {limit} characters{over ? ` - ${label} is over the recommended limit` : ""}
    </p>
  );
}

function TwitterCardTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("twitter-card-preview", isPro);
  const seo = getToolSeo("twitter-card-preview");

  const [cardType, setCardType] = useState<CardType>("summary_large_image");
  const [title, setTitle] = useState("My brilliant article");
  const [description, setDescription] = useState("A short summary of what this page is about.");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [handle, setHandle] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const metaTags = useMemo(() => {
    const lines = [
      `<meta name="twitter:card" content="${cardType}" />`,
      `<meta name="twitter:title" content="${title.trim()}" />`,
      `<meta name="twitter:description" content="${description.trim()}" />`,
    ];
    if (imageUrl.trim()) lines.push(`<meta name="twitter:image" content="${imageUrl.trim()}" />`);
    if (handle.trim()) lines.push(`<meta name="twitter:site" content="@${handle.trim().replace(/^@/, "")}" />`);
    return lines.join("\n");
  }, [cardType, title, description, imageUrl, handle]);

  const pickFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setImagePreview(URL.createObjectURL(f));
    toast.info("Preview only - for the live card, host the image and paste its URL above.");
  };

  const copy = async () => {
    if (!metaTags || !trial.canUse) return;
    try {
      await navigator.clipboard.writeText(metaTags);
      trial.recordUse();
      setCopied(true);
      toast.success("Meta tags copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard blocked by the browser - select the text manually.");
    }
  };

  const shownImage = imagePreview || imageUrl;

  return (
    <ToolPageShell toolId="twitter-card-preview" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="X Card Preview" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Share2 className="h-5 w-5 text-primary" /> Card details
          </h2>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Card type</p>
            <div className="flex gap-2">
              {(["summary", "summary_large_image"] as CardType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCardType(t)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    cardType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t === "summary" ? "Summary" : "Large image"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <Counter value={title} limit={LIMITS.title} label="Title" />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <Counter value={description} limit={LIMITS.description} label="Description" />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Image URL (absolute https URL)</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/card-image.jpg"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <div className="mt-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                Or upload an image for preview
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Site handle (optional)</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourhandle"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={() => void copy()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy meta tags"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-bold">Live X preview</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            {cardType === "summary_large_image" ? (
              <>
                {shownImage ? (
                  <img src={shownImage} alt="Card preview" className="aspect-[2/1] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[2/1] items-center justify-center bg-muted/50 text-xs text-muted-foreground">
                    1200 x 628 recommended for large images
                  </div>
                )}
                <div className="p-4">
                  <p className="truncate text-sm font-bold">{title || "Card title"}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description || "Card description"}</p>
                  {imageUrl.trim() && (
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {new URL(imageUrl.trim()).hostname || ""}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex gap-3 p-4">
                {shownImage ? (
                  <img src={shownImage} alt="Card preview" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-[10px] text-muted-foreground">
                    144 x 144+
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{title || "Card title"}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description || "Card description"}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 rounded-xl bg-muted/50 p-3">
            <p className="mb-1 text-xs font-bold text-muted-foreground">META TAGS</p>
            <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">{metaTags}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
