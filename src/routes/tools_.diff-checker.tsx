// /tools/diff-checker - compare two texts line by line with a simple LCS
// diff. 100% client-side; your text never leaves the browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/diff-checker")({
  head: () => {
    const seo = getToolSeoMeta("diff-checker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: DiffCheckerTool,
});

interface CharSpan {
  text: string;
  changed: boolean;
}

interface DiffLine {
  kind: "same" | "add" | "del";
  text: string;
  /** Char-level spans for changed lines (paired del/add). */
  spans?: CharSpan[];
}

/** Char-level LCS between two short strings; marks differing spans. */
function charSpans(oldS: string, newS: string): { del: CharSpan[]; add: CharSpan[] } {
  const n = oldS.length;
  const m = newS.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = oldS.charAt(i) === newS.charAt(j) ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const del: CharSpan[] = [];
  const add: CharSpan[] = [];
  let i = 0;
  let j = 0;
  const push = (arr: CharSpan[], text: string, changed: boolean) => {
    if (!text) return;
    const last = arr[arr.length - 1];
    if (last && last.changed === changed) last.text += text;
    else arr.push({ text, changed });
  };
  while (i < n && j < m) {
    const oc = oldS.charAt(i);
    const nc = newS.charAt(j);
    if (oc === nc) {
      push(del, oc, false);
      push(add, nc, false);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      push(del, oc, true);
      i++;
    } else {
      push(add, nc, true);
      j++;
    }
  }
  while (i < n) push(del, oldS.charAt(i++), true);
  while (j < m) push(add, newS.charAt(j++), true);
  return { del, add };
}

/** Pair adjacent del/add lines and attach char-level spans (guarded to short lines). */
function enrichCharDiff(lines: DiffLine[]): DiffLine[] {
  const out = [...lines];
  for (let k = 0; k < out.length - 1; k++) {
    const d = out[k];
    const a = out[k + 1];
    if (d && a && d.kind === "del" && a.kind === "add" && d.text.length < 500 && a.text.length < 500) {
      const { del, add } = charSpans(d.text, a.text);
      out[k] = { ...d, spans: del };
      out[k + 1] = { ...a, spans: add };
      k++;
    }
  }
  return out;
}

/** One input line: `key` is what gets compared, `text` is what gets displayed. */
interface LineIn {
  key: string;
  text: string;
}

/** LCS diff over lines. Guarded against pathological input sizes. */
function diffLines(a: LineIn[], b: LineIn[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = dp[i]!;
      const nextRow = dp[i + 1]!;
      row[j] = a[i]!.key === b[j]!.key ? nextRow[j + 1]! + 1 : Math.max(nextRow[j]!, row[j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const ax = a[i]!;
    const bx = b[j]!;
    if (ax.key === bx.key) {
      out.push({ kind: "same", text: ax.text });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ kind: "del", text: ax.text });
      i++;
    } else {
      out.push({ kind: "add", text: bx.text });
      j++;
    }
  }
  while (i < n) out.push({ kind: "del", text: a[i++]!.text });
  while (j < m) out.push({ kind: "add", text: b[j++]!.text });
  return out;
}

/** Single diff row shared by unified + split views (char-level spans kept). */
function DiffLineRow({ d, num }: { d: DiffLine; num?: number }) {
  return (
    <div
      className={cn(
        "flex gap-3 whitespace-pre-wrap px-4 py-1",
        d.kind === "del" && "bg-red-500/10 text-red-700 dark:text-red-400",
        d.kind === "add" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        d.kind === "same" && "text-muted-foreground",
      )}
    >
      {num !== undefined && (
        <span className="w-10 shrink-0 select-none text-right tabular-nums opacity-50">{num}</span>
      )}
      <span className="w-4 shrink-0 select-none font-bold">
        {d.kind === "del" ? "−" : d.kind === "add" ? "+" : " "}
      </span>
      <span className="break-all">
        {d.spans ? (
          d.spans.map((s, si) =>
            s.changed ? (
              <mark
                key={si}
                className={cn(
                  "rounded px-0.5",
                  d.kind === "del"
                    ? "bg-red-500/40 text-inherit"
                    : "bg-emerald-500/40 text-inherit",
                )}
              >
                {s.text}
              </mark>
            ) : (
              <span key={si}>{s.text}</span>
            ),
          )
        ) : d.text === "" ? (
          " "
        ) : (
          d.text
        )}
      </span>
    </div>
  );
}

function DiffCheckerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("diff-checker", isPro);
  const seo = getToolSeo("diff-checker");

  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [diff, setDiff] = useState<DiffLine[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [ignoreWs, setIgnoreWs] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [view, setView] = useState<"unified" | "split">("unified");

  const compare = () => {
    if (!trial.canUse) return;
    if (!original && !modified) {
      toast.error("Paste text into both boxes to compare.");
      return;
    }
    // Comparison key: whitespace collapsed+trimmed and/or lowercased per the
    // toggles - the ORIGINAL line text is always what's displayed.
    const norm = (s: string) => {
      let k = s;
      if (ignoreWs) k = k.replace(/\s+/g, " ").trim();
      if (ignoreCase) k = k.toLowerCase();
      return k;
    };
    const a = original.split("\n").map((t) => ({ key: norm(t), text: t }));
    const b = modified.split("\n").map((t) => ({ key: norm(t), text: t }));
    if (a.length * b.length > 9_000_000) {
      toast.error("Texts are too large to compare - keep each under ~3,000 lines.");
      return;
    }
    setBusy(true);
    // Yield to the UI before the (potentially heavy) DP pass.
    setTimeout(() => {
      try {
        setDiff(enrichCharDiff(diffLines(a, b)));
        trial.recordUse();
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const additions = diff?.filter((d) => d.kind === "add").length ?? 0;
  const deletions = diff?.filter((d) => d.kind === "del").length ?? 0;

  return (
    <ToolPageShell toolId="diff-checker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Diff Checker" left={trial.left} />

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Original</span>
          <textarea
            value={original} onChange={(e) => setOriginal(e.target.value)}
            placeholder="Paste the original text here…"
            spellCheck={false}
            className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Modified</span>
          <textarea
            value={modified} onChange={(e) => setModified(e.target.value)}
            placeholder="Paste the modified text here…"
            spellCheck={false}
            className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ActionButton busy={busy} disabled={!trial.canUse} onClick={compare}>
          <GitCompareArrows className="h-4 w-4" /> {busy ? "Comparing…" : "Compare"}
        </ActionButton>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition",
            ignoreWs
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
          title="Collapse whitespace runs and trim lines before comparing"
        >
          <input type="checkbox" checked={ignoreWs} onChange={() => setIgnoreWs((v) => !v)} className="sr-only" />
          Ignore whitespace
        </label>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition",
            ignoreCase
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
          title="Compare lines case-insensitively"
        >
          <input type="checkbox" checked={ignoreCase} onChange={() => setIgnoreCase((v) => !v)} className="sr-only" />
          Ignore case
        </label>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free comparisons left - texts never leave your device.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        {diff === null ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <ArrowLeftRight className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">Differences appear here</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Removed lines show in red with a − prefix, added lines in green with a + prefix.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {additions} addition{additions === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                {deletions} deletion{deletions === 1 ? "" : "s"}
              </span>
              {additions === 0 && deletions === 0 && (
                <span className="text-sm font-semibold text-muted-foreground">
                  The two texts are identical.
                </span>
              )}
              <div className="ml-auto flex rounded-xl border border-border p-1 text-sm font-semibold">
                {(["unified", "split"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-lg px-3 py-1 capitalize transition",
                      view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {view === "unified" ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <div className="min-w-full font-mono text-[13px] leading-relaxed">
                  {diff.map((d, i) => (
                    <DiffLineRow key={i} d={d} num={i + 1} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Original
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-border font-mono text-[13px] leading-relaxed">
                    {diff
                      .filter((d) => d.kind !== "add")
                      .map((d, i) => (
                        <DiffLineRow key={i} d={d} />
                      ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Modified
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-border font-mono text-[13px] leading-relaxed">
                    {diff
                      .filter((d) => d.kind !== "del")
                      .map((d, i) => (
                        <DiffLineRow key={i} d={d} />
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
