// /tools/css-logical-properties - Convert physical CSS properties
// (margin-left, border-top, ...) to logical properties (margin-inline-start,
// border-block-start, ...), with an RTL preview. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Languages } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-logical-properties")({
  head: () => {
    const seo = getToolSeoMeta("css-logical-properties");
    const canonical = "https://iconvault.site/tools/css-logical-properties";
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
  component: LogicalPropertiesTool,
});

const DEFAULT_INPUT = `.card {
  margin-left: 16px;
  margin-top: 8px;
  padding-right: 24px;
  padding-bottom: 12px;
  border-left: 2px solid #0ea5e9;
  border-top-width: 4px;
  border-top-right-radius: 8px;
  text-align: right;
  float: left;
  left: 0;
  top: 10px;
}`;

/** Physical -> logical property mapping. */
const PROP_MAP: Record<string, string> = {
  "margin-left": "margin-inline-start",
  "margin-right": "margin-inline-end",
  "margin-top": "margin-block-start",
  "margin-bottom": "margin-block-end",
  "padding-left": "padding-inline-start",
  "padding-right": "padding-inline-end",
  "padding-top": "padding-block-start",
  "padding-bottom": "padding-block-end",
  "border-left": "border-inline-start",
  "border-right": "border-inline-end",
  "border-top": "border-block-start",
  "border-bottom": "border-block-end",
  "border-left-width": "border-inline-start-width",
  "border-right-width": "border-inline-end-width",
  "border-top-width": "border-block-start-width",
  "border-bottom-width": "border-block-end-width",
  "border-left-style": "border-inline-start-style",
  "border-right-style": "border-inline-end-style",
  "border-top-style": "border-block-start-style",
  "border-bottom-style": "border-block-end-style",
  "border-left-color": "border-inline-start-color",
  "border-right-color": "border-inline-end-color",
  "border-top-color": "border-block-start-color",
  "border-bottom-color": "border-block-end-color",
  "border-top-left-radius": "border-start-start-radius",
  "border-top-right-radius": "border-start-end-radius",
  "border-bottom-left-radius": "border-end-start-radius",
  "border-bottom-right-radius": "border-end-end-radius",
  "left": "inset-inline-start",
  "right": "inset-inline-end",
  "top": "inset-block-start",
  "bottom": "inset-block-end",
  "min-width": "min-inline-size",
  "max-width": "max-inline-size",
  "min-height": "min-block-size",
  "max-height": "max-block-size",
  "width": "inline-size",
  "height": "block-size",
};

function convertToLogical(css: string): { css: string; converted: number; skipped: number } {
  let converted = 0;
  let skipped = 0;
  const out = css.replace(/([a-zA-Z-]+)(\s*:\s*)([^;{}]+)/g, (match, propRaw: string, colon: string, valueRaw: string) => {
    const prop = propRaw.toLowerCase();
    const value = valueRaw.trim();
    if (PROP_MAP[prop]) {
      converted++;
      return `${PROP_MAP[prop]}${colon}${valueRaw}`;
    }
    if (prop === "text-align" && (value === "left" || value === "right")) {
      converted++;
      return `text-align${colon}${value === "left" ? "start" : "end"}`;
    }
    if (prop === "float" && (value === "left" || value === "right")) {
      converted++;
      return `float${colon}${value === "left" ? "inline-start" : "inline-end"}`;
    }
    if (prop === "clear" && (value === "left" || value === "right")) {
      converted++;
      return `clear${colon}${value === "left" ? "inline-start" : "inline-end"}`;
    }
    skipped++;
    return match;
  });
  return { css: out, converted, skipped };
}

const PREVIEW_HTML = `<div class="preview-box">
  <span class="badge">New</span>
  <h4>Logical properties demo</h4>
  <p>This card uses logical properties, so its borders, padding and alignment flip correctly in RTL.</p>
</div>`;

const PREVIEW_CSS = `.preview-box {
  border-inline-start: 4px solid #0ea5e9;
  padding-inline-start: 16px;
  padding-block: 12px;
  text-align: start;
  background: #f8fafc;
  border-radius: 8px;
}
.preview-box h4 { margin: 0 0 4px; font-size: 15px; color: #0f172a; }
.preview-box p { margin: 0; font-size: 13px; color: #475569; }
.badge {
  float: inline-start;
  margin-inline-end: 8px;
  background: #0ea5e9;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}`;

function LogicalPropertiesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-logical-properties", isPro);
  const seo = getToolSeo("css-logical-properties");

  const [input, setInput] = useState(DEFAULT_INPUT);
  const [dir, setDir] = useState<"ltr" | "rtl">("rtl");

  const result = useMemo(() => convertToLogical(input), [input]);

  const previewSrc = useMemo(
    () => `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:16px;}</style><style>${PREVIEW_CSS}</style></head><body>${PREVIEW_HTML}</body></html>`,
    [dir],
  );

  const copy = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(result.css);
      trial.recordUse();
      toast.success("Logical CSS copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="css-logical-properties" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Logical Properties" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Physical CSS</p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={12}
              spellCheck={false}
              placeholder=".card {\n  margin-left: 16px;\n  ..."
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </div>

          {result.converted > 0 && (
            <p className="text-xs font-medium text-primary">
              Converted {result.converted} propert{result.converted === 1 ? "y" : "ies"}
              {result.skipped > 0 ? ` - ${result.skipped} left unchanged` : ""}.
            </p>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Logical CSS</p>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
              >
                <ClipboardCopy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-xl bg-muted/40 p-3 font-mono text-xs leading-relaxed">{result.css || "/* nothing to convert yet */"}</pre>
          </div>

          <p className="text-xs text-muted-foreground">
            Honest note: this covers the common properties - margin/padding, border sides, border-radius corners, text-align, float, clear, inset, and size. Shorthand and uncommon properties are left unchanged.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-medium text-foreground/80">
              <Languages className="h-4 w-4" /> RTL preview with logical properties
            </p>
            <div className="flex gap-2">
              {(["ltr", "rtl"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDir(d)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-mono text-xs font-bold uppercase transition",
                    dir === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <iframe
            key={dir}
            title="RTL preview"
            sandbox="allow-same-origin"
            srcDoc={previewSrc}
            className="min-h-[300px] w-full rounded-xl border border-border bg-white"
          />
          <p className="text-xs text-muted-foreground">
            Toggle the direction and watch the accent border, badge, and text alignment flip automatically - no extra CSS needed. That is what logical properties buy you.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
