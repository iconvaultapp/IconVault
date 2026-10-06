// /tools/svg-to-jsx - convert SVG markup to JSX, TSX, Vue or Svelte:
// kebab-case attributes → camelCase, tags self-closed. 100% in-browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Check, Braces } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/svg-to-jsx";
import toolSeoMeta from "@/lib/tool-seo-meta-data/svg-to-jsx";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/svg-to-jsx")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/svg-to-jsx";
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
  component: SvgToJsxTool,
});

type Tab = "jsx" | "tsx" | "vue" | "svelte";

const ATTR_MAP: Record<string, string> = {
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-opacity": "strokeOpacity",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-miterlimit": "strokeMiterlimit",
  "fill-rule": "fillRule",
  "fill-opacity": "fillOpacity",
  "clip-rule": "clipRule",
  "clip-path": "clipPath",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "text-anchor": "textAnchor",
  "font-size": "fontSize",
  "font-family": "fontFamily",
  "font-weight": "fontWeight",
  "letter-spacing": "letterSpacing",
  class: "className",
  "xlink:href": "xlinkHref",
};

const VOID_TAGS = "path|circle|rect|ellipse|line|polyline|polygon|stop|use";

function selfClose(svg: string): string {
  let out = svg.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").trim();
  out = out.replace(
    new RegExp(`<(${VOID_TAGS})([^>]*?)></\\1>`, "g"),
    "<$1$2/>",
  );
  out = out.replace(
    new RegExp(`<(${VOID_TAGS})([^>]*?[^>/\\s])>`, "g"),
    "<$1$2/>",
  );
  out = out.replace(new RegExp(`<(${VOID_TAGS})>`, "g"), "<$1/>");
  return out;
}

function toJsx(svg: string): string {
  const cleaned = selfClose(svg);
  return cleaned.replace(/<[^>]+>/g, (tag) =>
    tag.replace(/([\w:-]+)=/g, (_m, name: string) => `${ATTR_MAP[name] ?? name}=`),
  );
}

interface JsxOptions {
  tsTypes: boolean;
  iconMode: boolean;
  spreadProps: boolean;
  componentName: string;
}

function sanitizeComponentName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "MyIcon";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Strip width/height from the root <svg> and replace with 1em sizing. */
function applyIconMode(svg: string): string {
  return svg.replace(/<svg([^>]*)>/, (_m, attrs: string) => {
    const a = String(attrs).replace(/\s(width|height)="[^"]*"/g, "");
    return `<svg${a} width="1em" height="1em">`;
  });
}

function buildOutput(input: string, tab: Tab, opts: JsxOptions): string {
  const sized = (s: string) => (opts.iconMode ? applyIconMode(s) : s);
  if (tab === "vue") return `<template>\n${sized(selfClose(input))}\n</template>`;
  if (tab === "svelte") return sized(selfClose(input));
  const jsx = toJsx(input);
  if (tab === "jsx") return sized(jsx);
  const svgRoot = opts.spreadProps ? sized(jsx).replace(/^<svg/, "<svg {...props}") : sized(jsx);
  const body = svgRoot
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n");
  const name = sanitizeComponentName(opts.componentName);
  const typed = opts.tsTypes;
  const importLine = typed ? `import type { SVGProps } from "react";\n\n` : "";
  const sig = typed ? "({ ...props }: SVGProps<SVGSVGElement>)" : "({ ...props })";
  return `${importLine}export default function ${name}${sig} {\n  return (\n${body}\n  );\n}`;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "jsx", label: "JSX" },
  { id: "tsx", label: "TSX" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
];

function SvgToJsxTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("svg-to-jsx", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [tab, setTab] = useState<Tab>("jsx");
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [opts, setOpts] = useState<JsxOptions>({
    tsTypes: true,
    iconMode: false,
    spreadProps: true,
    componentName: "MyIcon",
  });

  const convert = () => {
    if (!input.trim()) {
      toast.error("Paste an SVG first.");
      return;
    }
    if (!/<svg[\s>]/i.test(input)) {
      toast.error("That doesn't look like SVG markup - it should contain an <svg> tag.");
      return;
    }
    if (!trial.canUse) return;
    setOutput(buildOutput(input, tab, opts));
    trial.recordUse();
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    if (input.trim()) setOutput(buildOutput(input, t, opts));
  };

  const setOpt = <K extends keyof JsxOptions,>(key: K, value: JsxOptions[K]) => {
    const next = { ...opts, [key]: value };
    setOpts(next);
    if (output !== null && input.trim()) setOutput(buildOutput(input, tab, next));
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  };

  return (
    <ToolPageShell toolId="svg-to-jsx" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SVG to JSX Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">SVG markup</span>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setOutput(null); }}
              placeholder="<svg …> paste your SVG markup here…"
              spellCheck={false}
              className="h-64 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
            />
          </label>
          <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Component name</span>
              <input
                value={opts.componentName}
                onChange={(e) => setOpt("componentName", e.target.value)}
                placeholder="MyIcon"
                disabled={tab !== "tsx"}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-40"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={opts.tsTypes}
                onChange={(e) => setOpt("tsTypes", e.target.checked)}
                disabled={tab !== "tsx"}
                className="h-4 w-4 accent-primary disabled:opacity-40"
              />
              <span className={cn(tab !== "tsx" && "opacity-40")}>TypeScript types</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={opts.spreadProps}
                onChange={(e) => setOpt("spreadProps", e.target.checked)}
                disabled={tab !== "tsx"}
                className="h-4 w-4 accent-primary disabled:opacity-40"
              />
              <span className={cn(tab !== "tsx" && "opacity-40")}>
                Spread props <code className="rounded bg-muted px-1 font-mono text-xs">{"{...props}"}</code>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={opts.iconMode}
                onChange={(e) => setOpt("iconMode", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span>Icon mode (1em sizing)</span>
            </label>
          </div>
          <div className="flex items-center gap-4">
            <ActionButton disabled={!input.trim() || !trial.canUse} onClick={convert}>
              <Braces className="h-4 w-4" /> Convert
            </ActionButton>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTab(t.id)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-bold transition",
                  tab === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {output === null ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <Braces className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your component code appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Attributes are auto-mapped to camelCase and tags self-closed - ready to paste into your project.
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={output}
                readOnly
                spellCheck={false}
                className="h-64 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none"
              />
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : `Copy ${tab.toUpperCase()}`}
              </button>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
