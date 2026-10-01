// /tools/svg-optimizer - shrink SVG markup: strip comments, collapse
// whitespace, round long decimals. Before/after bytes with % saved.
// 100% in-browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Check, Download, Zap } from "lucide-react";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/svg-optimizer")({
  head: () => {
    const seo = getToolSeoMeta("svg-optimizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SvgOptimizerTool,
});

const bytes = (s: string) => new TextEncoder().encode(s).length;

interface OptOpts {
  precision: number;
  stripMeta: boolean; // remove <metadata>, <title>, <desc>
  stripEmpty: boolean; // remove empty containers & display:none
  stripIds: boolean; // remove unreferenced id attributes
  stripData: boolean; // remove data-* attributes
}

/** Collect every "#id" reference from attribute values (url(#x), href="#x", …). */
function referencedIds(root: Element): Set<string> {
  const refs = new Set<string>();
  const all = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of all) {
    for (const attr of Array.from(el.attributes)) {
      const v = attr.value;
      const m = v.match(/#([A-Za-z_][\w:.-]*)/g);
      if (m) for (const r of m) refs.add(r.slice(1));
    }
  }
  return refs;
}

const USELESS_ATTRS = new Set([
  "version", "xml:space", "enable-background", "xmlns:xlink", "xlink:actuate",
  "xlink:show", "xlink:type", "xml:base",
]);

/** Round every decimal in a string to `precision` places. */
function roundDecimals(s: string, precision: number): string {
  const f = Math.pow(10, precision);
  return s.replace(/-?\d*\.\d+/g, (m) => {
    const r = Math.round(Number(m) * f) / f;
    return String(Object.is(r, -0) ? 0 : r);
  });
}

/** Real DOM-based optimization - SVGOMG-lite, 100% in-browser. */
function optimizeSvg(svg: string, o: OptOpts): { out: string; removed: number } {
  let removed = 0;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const parserErr = doc.querySelector("parsererror");
  if (parserErr) throw new Error("That doesn't look like valid SVG markup.");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") throw new Error("Root element must be <svg>.");

  // 1. Strip comments everywhere.
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  for (const c of comments) {
    c.parentNode?.removeChild(c);
    removed++;
  }

  // 2. Remove metadata-ish elements.
  if (o.stripMeta) {
    for (const tag of ["metadata", "title", "desc"]) {
      for (const el of Array.from(root.getElementsByTagName(tag))) {
        el.parentNode?.removeChild(el);
        removed++;
      }
    }
  }

  const refs = referencedIds(root);
  const els = [root, ...Array.from(root.querySelectorAll("*"))];

  for (const el of els) {
    if (!el.parentNode) continue;
    const tag = el.tagName.toLowerCase();

    // 3. Drop empty non-root containers (g, defs, symbol…) with no children/attrs.
    if (o.stripEmpty && el !== root && el.children.length === 0 && !el.textContent?.trim()) {
      if (["g", "defs", "symbol", "mask", "clippath", "pattern"].includes(tag)) {
        el.parentNode.removeChild(el);
        removed++;
        continue;
      }
    }

    // 4. Drop hidden elements.
    if (o.stripEmpty && el.getAttribute("display") === "none") {
      el.parentNode.removeChild(el);
      removed++;
      continue;
    }

    // 5. Attribute cleanup.
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value;
      if (USELESS_ATTRS.has(name) || (name === "xmlns" && el !== root)) {
        el.removeAttribute(attr.name); removed++; continue;
      }
      if (o.stripData && name.startsWith("data-")) {
        el.removeAttribute(attr.name); removed++; continue;
      }
      if (o.stripIds && name === "id" && !refs.has(val)) {
        el.removeAttribute(attr.name); removed++; continue;
      }
      // Default presentation values that change nothing.
      if (
        (name === "fill" && val.toLowerCase() === "black" && tag !== "svg") ||
        (name === "stroke" && val.toLowerCase() === "none")
      ) {
        el.removeAttribute(attr.name); removed++; continue;
      }
    }

    // 6. Round decimals in path data + numeric attrs.
    const d = el.getAttribute("d");
    if (d && /\d\.\d{3,}/.test(d)) {
      el.setAttribute("d", roundDecimals(d, o.precision).replace(/\s*,\s*/g, " ").replace(/\s{2,}/g, " ").trim());
    }
    for (const a of ["x", "y", "width", "height", "cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2", "stroke-width", "opacity", "font-size"]) {
      const v = el.getAttribute(a);
      if (v && /\d*\.\d{3,}/.test(v)) el.setAttribute(a, roundDecimals(v, o.precision));
    }
    // Collapse transform whitespace.
    const tr = el.getAttribute("transform");
    if (tr) {
      const clean = roundDecimals(tr, o.precision).replace(/\s*,\s*/g, ",").replace(/\s{2,}/g, " ").trim();
      if (clean !== tr) el.setAttribute("transform", clean);
    }
  }

  let out = new XMLSerializer().serializeToString(doc);
  out = out
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*\/>/g, "/>")
    .trim();
  return { out, removed };
}

function SvgOptimizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("svg-optimizer", isPro);
  const seo = getToolSeo("svg-optimizer");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [before, setBefore] = useState(0);
  const [removed, setRemoved] = useState(0);
  const [copied, setCopied] = useState(false);
  const [precision, setPrecision] = useState(2);
  const [stripMeta, setStripMeta] = useState(true);
  const [stripEmpty, setStripEmpty] = useState(true);
  const [stripIds, setStripIds] = useState(true);
  const [stripData, setStripData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const opts: OptOpts = { precision, stripMeta, stripEmpty, stripIds, stripData };

  const optimize = () => {
    if (!input.trim()) {
      toast.error("Paste an SVG first.");
      return;
    }
    if (!trial.canUse) return;
    setError(null);
    try {
      const { out, removed: n } = optimizeSvg(input, opts);
      setOutput(out);
      setBefore(bytes(input));
      setRemoved(n);
      if (bytes(out) >= bytes(input)) toast.success("Already optimal - nothing to shrink.");
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not optimize that SVG.");
    }
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

  const after = output ? bytes(output) : 0;
  const pct = before > 0 ? Math.round(((before - after) / before) * 100) : 0;

  return (
    <ToolPageShell toolId="svg-optimizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SVG Optimizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Original SVG</span>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setOutput(null); }}
              placeholder="<svg …> paste your SVG markup here…"
              spellCheck={false}
              className="h-64 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
            />
          </label>
          <div className="flex items-center gap-4">
            <ActionButton disabled={!input.trim() || !trial.canUse} onClick={optimize}>
              <Zap className="h-4 w-4" /> Optimize SVG
            </ActionButton>
            {before > 0 && (
              <span className="text-sm text-muted-foreground">Original: <b className="text-foreground">{before.toLocaleString()} B</b></span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              ["stripMeta", stripMeta, setStripMeta, "Remove metadata, title & desc"],
              ["stripEmpty", stripEmpty, setStripEmpty, "Remove empty groups & hidden els"],
              ["stripIds", stripIds, setStripIds, "Remove unused IDs"],
              ["stripData", stripData, setStripData, "Strip data-* attributes"],
            ] as const).map(([key, val, set, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-[13px] font-medium transition hover:border-primary/40">
                <input type="checkbox" checked={val} onChange={() => set(!val)} className="h-4 w-4 shrink-0 accent-primary" />
                {label}
              </label>
            ))}
          </div>
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">Decimal precision</span>
              <span className="tabular-nums text-muted-foreground">{precision} {precision === 1 ? "place" : "places"}</span>
            </div>
            <input type="range" min={0} max={4} value={precision} onChange={(e) => setPrecision(Number(e.target.value))} className="w-full accent-primary" />
          </label>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free optimizations left - your SVG never leaves this page.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {output === null ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Zap className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Optimized SVG appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Watch the byte count drop - then copy or download the leaner file.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3">
                <p className="text-sm">
                  <b className="text-foreground">{before.toLocaleString()} B</b>
                  <span className="text-muted-foreground"> → </span>
                  <b className="text-emerald-600 dark:text-emerald-400">{after.toLocaleString()} B</b>
                </p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  −{pct}%
                </p>
              </div>
              {removed > 0 && (
                <p className="text-xs text-muted-foreground">
                  Removed <b className="text-foreground">{removed}</b> comments, elements & useless attributes.
                </p>
              )}
              <textarea
                value={output}
                readOnly
                spellCheck={false}
                className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy SVG"}
                </button>
                <button
                  type="button"
                  onClick={() => downloadBlob(new Blob([output], { type: "image/svg+xml" }), "optimized.svg")}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold transition hover:border-primary/50"
                >
                  <Download className="h-4 w-4" /> Download .svg
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
