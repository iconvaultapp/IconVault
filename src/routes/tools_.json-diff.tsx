// /tools/json-diff - Semantic JSON diff with color-coded added (green),
// removed (red) and changed (amber) keys. Side-by-side or unified view, plus
// diff stats. 100% client-side, runs in your browser, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Copy, GitCompareArrows, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/json-diff";
import toolSeoMeta from "@/lib/tool-seo-meta-data/json-diff";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-diff")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/json-diff";
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
  component: JsonDiffTool,
});

type DiffKind = "added" | "removed" | "changed";

interface DiffEntry {
  path: string;
  kind: DiffKind;
  oldText: string;
  newText: string;
}

function fmt(v: unknown): string {
  const s = JSON.stringify(v);
  if (s === undefined) return "undefined";
  return s.length > 140 ? `${s.slice(0, 140)}...` : s;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function collectDiff(a: unknown, b: unknown, path: string, out: DiffEntry[]) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const p = `${path}[${i}]`;
      if (i >= a.length) out.push({ path: p, kind: "added", oldText: "", newText: fmt(b[i]) });
      else if (i >= b.length) out.push({ path: p, kind: "removed", oldText: fmt(a[i]), newText: "" });
      else collectDiff(a[i], b[i], p, out);
    }
    return;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    for (const k of Object.keys(a)) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in b)) out.push({ path: p, kind: "removed", oldText: fmt(a[k]), newText: "" });
      else collectDiff(a[k], b[k], p, out);
    }
    for (const k of Object.keys(b)) {
      if (!(k in a)) {
        const p = path ? `${path}.${k}` : k;
        out.push({ path: p, kind: "added", oldText: "", newText: fmt(b[k]) });
      }
    }
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    out.push({ path: path || "$", kind: "changed", oldText: fmt(a), newText: fmt(b) });
  }
}

const KIND_STYLE: Record<DiffKind, string> = {
  added: "border-green-500/40 bg-green-500/10",
  removed: "border-red-500/40 bg-red-500/10",
  changed: "border-amber-500/40 bg-amber-500/10",
};

const KIND_TEXT: Record<DiffKind, string> = {
  added: "text-green-600 dark:text-green-400",
  removed: "text-red-600 dark:text-red-400",
  changed: "text-amber-600 dark:text-amber-400",
};

const SAMPLE_A = `{
  "name": "IconVault",
  "version": 1,
  "tags": ["icons", "tools"],
  "meta": { "author": "Sameer", "license": "MIT" },
  "deprecated": true
}`;

const SAMPLE_B = `{
  "name": "IconVault",
  "version": 2,
  "tags": ["icons", "tools", "new"],
  "meta": { "author": "Sameer", "license": "Apache-2.0" },
  "stable": true
}`;

function JsonDiffTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-diff", isPro);
  const seo = toolSeo;

  const [aText, setAText] = useState("");
  const [bText, setBText] = useState("");
  const [errors, setErrors] = useState<{ a?: string; b?: string }>({});
  const [entries, setEntries] = useState<DiffEntry[] | null>(null);
  const [mode, setMode] = useState<"unified" | "side">("unified");
  const [busy, setBusy] = useState(false);

  const compare = () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    const errs: { a?: string; b?: string } = {};
    let pa: unknown;
    let pb: unknown;
    try {
      pa = JSON.parse(aText);
    } catch (e) {
      errs.a = `JSON A is invalid: ${e instanceof Error ? e.message : "parse error"}`;
    }
    try {
      pb = JSON.parse(bText);
    } catch (e) {
      errs.b = `JSON B is invalid: ${e instanceof Error ? e.message : "parse error"}`;
    }
    setErrors(errs);
    if (errs.a || errs.b) {
      setEntries(null);
      setBusy(false);
      return;
    }
    const out: DiffEntry[] = [];
    collectDiff(pa, pb, "", out);
    setEntries(out);
    trial.recordUse();
    setBusy(false);
    toast.success(out.length === 0 ? "Documents are identical" : `Found ${out.length} difference${out.length === 1 ? "" : "s"}`);
  };

  const swap = () => {
    setAText(bText);
    setBText(aText);
    setEntries(null);
    setErrors({});
  };

  const clear = () => {
    setAText("");
    setBText("");
    setEntries(null);
    setErrors({});
  };

  const copyResult = async () => {
    if (!entries) return;
    const lines = entries.map((e) => {
      if (e.kind === "added") return `+ ${e.path}: ${e.newText}`;
      if (e.kind === "removed") return `- ${e.path}: ${e.oldText}`;
      return `~ ${e.path}: ${e.oldText} -> ${e.newText}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Diff copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const added = entries?.filter((e) => e.kind === "added").length ?? 0;
  const removed = entries?.filter((e) => e.kind === "removed").length ?? 0;
  const changed = entries?.filter((e) => e.kind === "changed").length ?? 0;

  const paneClass =
    "h-64 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary";

  return (
    <ToolPageShell toolId="json-diff" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON Diff" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">JSON A (original)</span>
          <textarea
            value={aText}
            onChange={(e) => setAText(e.target.value)}
            placeholder='Paste the original JSON here...'
            spellCheck={false}
            className={cn(paneClass, errors.a && "border-red-500")}
          />
          {errors.a && <p className="mt-2 text-sm font-medium text-red-500">{errors.a}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">JSON B (modified)</span>
          <textarea
            value={bText}
            onChange={(e) => setBText(e.target.value)}
            placeholder="Paste the modified JSON here..."
            spellCheck={false}
            className={cn(paneClass, errors.b && "border-red-500")}
          />
          {errors.b && <p className="mt-2 text-sm font-medium text-red-500">{errors.b}</p>}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ActionButton busy={busy} disabled={!trial.canUse || !aText.trim() || !bText.trim()} onClick={compare}>
          <GitCompareArrows className="h-4 w-4" /> {busy ? "Comparing..." : "Compare"}
        </ActionButton>
        <button
          type="button"
          onClick={swap}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <ArrowLeftRight className="h-4 w-4" /> Swap
        </button>
        <button
          type="button"
          onClick={() => { setAText(SAMPLE_A); setBText(SAMPLE_B); setEntries(null); setErrors({}); }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          Load sample
        </button>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <Trash2 className="h-4 w-4" /> Clear
        </button>
        {entries && (
          <div className="ml-auto flex items-center gap-2">
            {(["unified", "side"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                  mode === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {m === "unified" ? "Unified" : "Side by side"}
              </button>
            ))}
          </div>
        )}
      </div>
      {!isPro && (
        <p className="mt-3 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free comparisons left. Runs in your browser, nothing is uploaded.
        </p>
      )}

      {entries && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold">Diff stats</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> {added} added
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {removed} removed
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {changed} changed
            </span>
            <button
              type="button"
              onClick={copyResult}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Copy className="h-4 w-4" /> Copy diff
            </button>
          </div>

          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground">
              Both documents are identical. No differences found.
            </p>
          ) : mode === "unified" ? (
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div key={i} className={cn("rounded-xl border p-3", KIND_STYLE[e.kind])}>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-mono text-xs font-bold uppercase", KIND_TEXT[e.kind])}>
                      {e.kind === "added" ? "+" : e.kind === "removed" ? "-" : "~"} {e.kind}
                    </span>
                    <span className="font-mono text-[13px] font-bold">{e.path}</span>
                  </div>
                  {e.kind !== "added" && (
                    <p className="mt-1 break-all font-mono text-xs text-red-600/90 dark:text-red-400/90">- {e.oldText}</p>
                  )}
                  {e.kind !== "removed" && (
                    <p className="mt-1 break-all font-mono text-xs text-green-600/90 dark:text-green-400/90">+ {e.newText}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="p-2 font-bold">Path</th>
                    <th className="p-2 font-bold">JSON A</th>
                    <th className="p-2 font-bold">JSON B</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i} className="border-b border-border/60 align-top last:border-0">
                      <td className="p-2 font-mono text-[13px] font-bold">{e.path}</td>
                      <td className={cn("break-all p-2 font-mono text-xs", e.kind !== "added" && "bg-red-500/10 text-red-600 dark:text-red-400")}>
                        {e.oldText || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className={cn("break-all p-2 font-mono text-xs", e.kind !== "removed" && "bg-green-500/10 text-green-600 dark:text-green-400")}>
                        {e.newText || <span className="text-muted-foreground">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ToolPageShell>
  );
}
