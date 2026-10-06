// /tools/css-nesting-lab - Write nested CSS, flatten it to vanilla CSS with a
// small built-in parser (&, nested selectors, media queries), and preview it
// live on sample markup. 100% client-side; trial use is recorded on flatten/copy.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Check, Copy, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-nesting-lab";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-nesting-lab";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-nesting-lab")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-nesting-lab";
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
  component: NestingLabTool,
});

const DEFAULT_CSS = `.lab-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  max-width: 420px;

  &:hover {
    border-color: #0f766e;
    box-shadow: 0 12px 32px rgba(15, 118, 110, 0.12);
  }

  .lab-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 800;
  }

  .lab-text {
    margin: 0 0 16px;
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
  }

  .lab-btn {
    background: #0f766e;
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 10px 22px;
    font-weight: 700;
    cursor: pointer;

    &:hover {
      background: #0d5f59;
    }
  }

  @media (max-width: 480px) {
    padding: 16px;

    .lab-title {
      font-size: 17px;
    }
  }
}`;

function combineSelectors(parents: string[], sel: string): string[] {
  const parts = sel.split(",").map((s) => s.trim()).filter(Boolean);
  if (parents.length === 0) return parts;
  const out: string[] = [];
  for (const p of parents) {
    for (const c of parts) {
      out.push(c.includes("&") ? c.replace(/&/g, p) : `${p} ${c}`);
    }
  }
  return out;
}

function parseBlock(text: string, parents: string[]): string[] {
  const out: string[] = [];
  const decls: string[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    while (i < n && /\s/.test(text[i]!)) i++;
    if (i >= n) break;
    if (text[i] === "}") {
      i++;
      continue;
    }
    const brace = text.indexOf("{", i);
    const semi = text.indexOf(";", i);
    if (brace !== -1 && (semi === -1 || brace < semi)) {
      const rawSel = text.slice(i, brace).trim();
      let depth = 1;
      let j = brace + 1;
      while (j < n && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const inner = text.slice(brace + 1, j - 1);
      i = j;
      if (!rawSel) continue;
      if (rawSel.startsWith("@")) {
        const innerRules = parseBlock(inner, parents);
        if (innerRules.length > 0) out.push(`${rawSel} {\n${innerRules.join("\n")}\n}`);
      } else {
        out.push(...parseBlock(inner, combineSelectors(parents, rawSel)));
      }
    } else if (semi !== -1) {
      const d = text.slice(i, semi).trim();
      if (d) decls.push(`${d};`);
      i = semi + 1;
    } else {
      break;
    }
  }
  if (decls.length > 0 && parents.length > 0) {
    for (const p of parents) out.push(`${p} {\n  ${decls.join("\n  ")}\n}`);
  }
  return out;
}

function flattenNesting(src: string): { css: string; error: string | null } {
  try {
    const rules = parseBlock(src.replace(/\/\*[\s\S]*?\*\//g, ""), []);
    if (rules.length === 0) return { css: "", error: "Nothing to flatten: no valid rules found." };
    return { css: rules.join("\n\n"), error: null };
  } catch {
    return { css: "", error: "Could not parse the CSS. Check for unbalanced braces." };
  }
}

function NestingLabTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-nesting-lab", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState(DEFAULT_CSS);
  const [busy, setBusy] = useState(false);
  const [flattenedOnce, setFlattenedOnce] = useState(false);
  const [copied, setCopied] = useState(false);
  const [support] = useState(
    () => typeof CSS !== "undefined" && CSS.supports("selector(&)"),
  );

  const live = useMemo(() => flattenNesting(input), [input]);

  const flatten = () => {
    if (!trial.canUse) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setFlattenedOnce(true);
      if (live.error) {
        toast.error(live.error);
      } else {
        trial.recordUse();
        toast.success("Nested CSS flattened");
      }
    }, 250);
  };

  const copy = async () => {
    if (!trial.canUse || !live.css) return;
    try {
      await navigator.clipboard.writeText(live.css);
      setCopied(true);
      trial.recordUse();
      toast.success("Flattened CSS copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="css-nesting-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Nesting Lab" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <Braces className="h-4 w-4 text-primary" />
        <span className="font-semibold">Browser support:</span>
        <span
          className={
            support
              ? "rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-600"
              : "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600"
          }
        >
          {support ? "Native nesting works in this browser" : "This browser needs the flattened output"}
        </span>
        <span className="text-xs text-muted-foreground">
          Native CSS nesting ships in Chrome 112+, Edge 112+, Safari 16.5+ and Firefox 117+ (2023).
          The flattened output below works everywhere, no build step needed.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Nested CSS input</h2>
            <button
              type="button"
              onClick={() => setInput(DEFAULT_CSS)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Reset sample
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            rows={22}
            className="w-full rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed focus:border-primary focus:outline-none"
            placeholder=".card { ... }"
          />
          <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={flatten}>
            <Wand2 className="h-4 w-4" /> {busy ? "Flattening…" : "Flatten to vanilla CSS"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free flattens left.
            </p>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Handles <code className="font-mono">&amp;</code>, nested selectors, comma lists and nested
            at-rules like <code className="font-mono">@media</code>. For exotic cases (nesting inside
            <code className="font-mono"> @supports</code> conditions, <code className="font-mono">@scope</code>)
            use a real preprocessor.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Flattened output</h2>
              <button
                type="button"
                onClick={copy}
                disabled={!trial.canUse || !live.css}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {live.error ? (
              <p className="rounded-xl bg-red-500/10 p-4 text-sm font-medium text-red-500">{live.error}</p>
            ) : (
              <pre className="max-h-[420px] overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
                {live.css}
              </pre>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Live preview</h2>
            <div className="flex justify-center rounded-xl bg-muted/40 p-6">
              <style>{live.css}</style>
              <div className="lab-card">
                <h3 className="lab-title">Card title</h3>
                <p className="lab-text">
                  This sample card is styled by your flattened CSS, live. Hover it, resize the
                  window, and edit the input to see changes instantly.
                </p>
                <button type="button" className="lab-btn">Action</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
