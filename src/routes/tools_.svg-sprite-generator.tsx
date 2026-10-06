// /tools/svg-sprite-generator - combine multiple SVGs into one sprite.svg
// of <symbol> entries, plus a copy-ready <use> snippet. 100% in-browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Check, Download, Layers, Plus, X } from "lucide-react";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/svg-sprite-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/svg-sprite-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/svg-sprite-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/svg-sprite-generator";
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
  component: SvgSpriteTool,
});

interface Entry {
  uid: number;
  name: string;
  svg: string;
}

let uidCounter = 1;
const blankEntry = (): Entry => ({ uid: uidCounter++, name: "", svg: "" });

function sanitizeId(name: string, fallback: string): string {
  const id = name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  return id || fallback;
}

/** Replace fill/stroke values with currentColor, preserving "none". */
function applyCurrentColor(inner: string): string {
  const attrs = inner.replace(
    /\b(fill|stroke)\s*=\s*(["'])(.*?)\2/g,
    (_m, prop: string, quote: string, value: string) =>
      value.trim().toLowerCase() === "none"
        ? `${prop}=${quote}${value}${quote}`
        : `${prop}=${quote}currentColor${quote}`,
  );
  return attrs.replace(
    /style\s*=\s*(["'])([\s\S]*?)\1/g,
    (_m, quote: string, style: string) => {
      const fixed = style.replace(
        /\b(fill|stroke)\s*:\s*([^;]+)/g,
        (_sm, prop: string, value: string) =>
          value.trim().toLowerCase() === "none" ? `${prop}:${value}` : `${prop}:currentColor`,
      );
      return `style=${quote}${fixed}${quote}`;
    },
  );
}

function extractSymbol(entry: Entry, index: number, currentColor: boolean): { id: string; symbol: string } | null {
  const svg = entry.svg.trim();
  if (!svg) return null;
  const vb = svg.match(/viewBox\s*=\s*(["'])(.*?)\1/);
  const inner = svg.match(/<svg[^>]*>([\s\S]*)<\/svg\s*>/i);
  const innerSvg = inner?.[1];
  if (!vb || innerSvg === undefined) return null;
  const id = sanitizeId(entry.name, `icon-${index + 1}`);
  const content = innerSvg.trim();
  return { id, symbol: `<symbol id="${id}" viewBox="${vb[2]}">${currentColor ? applyCurrentColor(content) : content}</symbol>` };
}

function SvgSpriteTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("svg-sprite-generator", isPro);
  const seo = toolSeo;

  const [entries, setEntries] = useState<Entry[]>([blankEntry(), blankEntry()]);
  const [sprite, setSprite] = useState<string | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [copiedSprite, setCopiedSprite] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [useCurrentColor, setUseCurrentColor] = useState(false);

  const update = (uid: number, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((e) => (e.uid === uid ? { ...e, ...patch } : e)));

  const remove = (uid: number) =>
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.uid !== uid) : prev));

  const makeSprite = (currentColor: boolean) => {
    const symbols: string[] = [];
    const usedIds: string[] = [];
    entries.forEach((entry, i) => {
      const parsed = extractSymbol(entry, i, currentColor);
      if (parsed) {
        symbols.push(`  ${parsed.symbol}`);
        usedIds.push(parsed.id);
      }
    });
    if (!symbols.length) return null;
    return {
      sprite: `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join("\n")}\n</svg>`,
      ids: usedIds,
    };
  };

  const generate = () => {
    if (!trial.canUse) return;
    const result = makeSprite(useCurrentColor);
    if (!result) {
      toast.error("Add at least one valid SVG (with a viewBox) first.");
      return;
    }
    const missing = entries.filter((e) => e.svg.trim() && !extractSymbol(e, 0, useCurrentColor)).length;
    if (missing > 0) {
      toast.error(`${missing} entr${missing === 1 ? "y was" : "ies were"} skipped - each SVG needs a viewBox attribute.`);
      return;
    }
    setSprite(result.sprite);
    setIds(result.ids);
    trial.recordUse();
  };

  const toggleCurrentColor = (v: boolean) => {
    setUseCurrentColor(v);
    // Rebuild an existing sprite instantly without spending another trial use.
    if (sprite !== null) {
      const result = makeSprite(v);
      if (result) {
        setSprite(result.sprite);
        setIds(result.ids);
      }
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSprite(true);
      setTimeout(() => setCopiedSprite(false), 1500);
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  };

  const copyUsage = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`<svg><use href="#${id}"/></svg>`);
      setCopiedId(id);
      toast.success("Usage snippet copied.");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  };

  return (
    <ToolPageShell toolId="svg-sprite-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SVG Sprite Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-4">
            {entries.map((e, i) => (
              <div key={e.uid} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={e.name}
                    onChange={(ev) => update(e.uid, { name: ev.target.value })}
                    placeholder={`Icon name (e.g. icon-${i + 1})`}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => remove(e.uid)}
                    aria-label="Remove entry"
                    disabled={entries.length <= 1}
                    className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-400 hover:text-red-500 disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={e.svg}
                  onChange={(ev) => update(e.uid, { svg: ev.target.value })}
                  placeholder="<svg viewBox=…>…</svg> - paste one SVG here"
                  spellCheck={false}
                  className="h-24 w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setEntries((p) => [...p, blankEntry()])}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add another SVG
          </button>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-background/50 p-3 text-sm">
            <input
              type="checkbox"
              checked={useCurrentColor}
              onChange={(e) => toggleCurrentColor(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              <span className="font-semibold">Convert colors to currentColor</span>
              <br />
              <span className="text-muted-foreground">
                fill and stroke values become currentColor so icons inherit text color. fill="none" is preserved.
              </span>
            </span>
          </label>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Layers className="h-4 w-4" /> Generate sprite
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free sprites left - your SVGs never leave this page.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {sprite === null ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Layers className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your sprite.svg appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Each SVG becomes a <code className="rounded bg-muted px-1">&lt;symbol&gt;</code> you can reference anywhere with{" "}
                <code className="rounded bg-muted px-1">&lt;use&gt;</code>.
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={sprite}
                readOnly
                spellCheck={false}
                className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => downloadBlob(new Blob([sprite], { type: "image/svg+xml" }), "sprite.svg")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" /> Download sprite.svg
                </button>
                <button
                  type="button"
                  onClick={() => copyText(sprite)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold transition hover:border-primary/50"
                >
                  {copiedSprite ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedSprite ? "Copied!" : "Copy sprite"}
                </button>
              </div>
              <div>
                <span className="text-[13px] font-medium text-foreground/80">Symbols in this sprite</span>
                <div className="mt-2 space-y-2">
                  {ids.map((id) => (
                    <div key={id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2">
                      <code className="truncate font-mono text-xs">#{id}</code>
                      <button
                        type="button"
                        onClick={() => copyUsage(id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:border-primary/50"
                      >
                        {copiedId === id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === id ? "Copied!" : "Copy usage"}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Include the sprite once per page, then reference any symbol with{" "}
                  <code className="rounded bg-muted px-1">&lt;use href="#id"&gt;</code>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
