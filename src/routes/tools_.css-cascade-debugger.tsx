// /tools/css-cascade-debugger - Paste CSS rules + a target selector, see which
// declaration wins for each property. Hand-written specificity calculator.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-cascade-debugger")({
  head: () => {
    const seo = getToolSeoMeta("css-cascade-debugger");
    const canonical = "https://iconvault.site/tools/css-cascade-debugger";
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
  component: CascadeTool,
});

type Spec = [number, number, number];

interface Declaration {
  property: string;
  value: string;
  important: boolean;
}

interface Rule {
  index: number;
  selectors: string[];
  declarations: Declaration[];
}

interface Match {
  selector: string;
  spec: Spec;
  specText: string;
  order: number;
  value: string;
  important: boolean;
}

const SAMPLE = `/* Paste your CSS below, then type the target selector */
button {
  color: #333;
  padding: 8px 16px;
}
.btn {
  color: #fff;
  background: #3b82f6;
}
.btn.primary {
  background: #10b981 !important;
}
#submit.btn {
  color: #000;
  border: none;
}
button.btn.primary {
  padding: 12px 24px;
}`;

function specToString([a, b, c]: Spec): string {
  return `(${a}, ${b}, ${c})`;
}

/** Hand-written specificity calculator: (ID, class/attr/pseudo-class, element/pseudo-element). */
function specificity(selector: string): Spec {
  let sel = selector;
  let a = 0, b = 0, c = 0;
  // Handle :not() specially: its own specificity is that of its argument
  sel = sel.replace(/:not\(([^)]*)\)/g, (_m, inner: string) => {
    const [ia, ib, ic] = specificity(inner);
    a += ia; b += ib; c += ic;
    return " ";
  });
  // IDs
  const ids = sel.match(/#[\w-]+/g);
  a += ids ? ids.length : 0;
  sel = sel.replace(/#[\w-]+/g, " ");
  // Classes
  const classes = sel.match(/\.[\w-]+/g);
  b += classes ? classes.length : 0;
  sel = sel.replace(/\.[\w-]+/g, " ");
  // Attribute selectors
  const attrs = sel.match(/\[[^\]]+\]/g);
  b += attrs ? attrs.length : 0;
  sel = sel.replace(/\[[^\]]+\]/g, " ");
  // Pseudo-elements count as elements
  const pseudoEls = sel.match(/::[\w-]+/g);
  c += pseudoEls ? pseudoEls.length : 0;
  sel = sel.replace(/::[\w-]+/g, " ");
  // Pseudo-classes count as classes
  const pseudoClasses = sel.match(/:[\w-]+(\([^)]*\))?/g);
  b += pseudoClasses ? pseudoClasses.length : 0;
  sel = sel.replace(/:[\w-]+(\([^)]*\))?/g, " ");
  // Remaining words are element selectors (ignore * and combinators)
  const elements = sel.match(/(^|[\s>+~])([a-zA-Z][\w-]*)/g);
  c += elements ? elements.length : 0;
  return [a, b, c];
}

function compareSpec(x: Spec, y: Spec): number {
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

function parseCss(text: string): Rule[] {
  const rules: Rule[] = [];
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = stripped.split("}");
  blocks.forEach((block, i) => {
    const brace = block.indexOf("{");
    if (brace === -1) return;
    const selectorPart = block.slice(0, brace).trim();
    const body = block.slice(brace + 1).trim();
    if (!selectorPart || !body) return;
    const selectors = selectorPart.split(",").map((s) => s.trim()).filter(Boolean);
    const declarations: Declaration[] = [];
    for (const decl of body.split(";")) {
      const colon = decl.indexOf(":");
      if (colon === -1) continue;
      const property = decl.slice(0, colon).trim().toLowerCase();
      let value = decl.slice(colon + 1).trim();
      if (!property || !value) continue;
      const important = /!important\s*$/i.test(value);
      if (important) value = value.replace(/!important\s*$/i, "").trim();
      declarations.push({ property, value, important });
    }
    if (selectors.length && declarations.length) {
      rules.push({ index: i, selectors, declarations });
    }
  });
  return rules;
}

interface TargetBits {
  tag: string | null;
  ids: string[];
  classes: string[];
  attrs: string[];
  pseudos: string[];
}

function targetBits(target: string): TargetBits {
  let t = target.trim();
  const ids = (t.match(/#[\w-]+/g) ?? []).map((s) => s.slice(1));
  t = t.replace(/#[\w-]+/g, " ");
  const classes = (t.match(/\.[\w-]+/g) ?? []).map((s) => s.slice(1));
  t = t.replace(/\.[\w-]+/g, " ");
  const attrs = (t.match(/\[[^\]]+\]/g) ?? []).map((s) => s.slice(1, -1).split("=")[0]!.trim().toLowerCase());
  t = t.replace(/\[[^\]]+\]/g, " ");
  const pseudos = (t.match(/:[\w-]+/g) ?? []).map((s) => s.slice(1).toLowerCase());
  t = t.replace(/:[\w-]+(\([^)]*\))?/g, " ").replace(/::[\w-]+/g, " ");
  const tagMatch = t.trim().match(/^[a-zA-Z][\w-]*/);
  const tag = tagMatch ? tagMatch[0].toLowerCase() : null;
  return { tag, ids, classes, attrs, pseudos };
}

/** Approximate match: the selector's last compound must be covered by the target's bits. */
function matches(selector: string, target: TargetBits): boolean {
  const last = selector.split(/[\s>+~]+/).filter(Boolean).pop() ?? "";
  let s = last.replace(/:not\([^)]*\)/g, " ");
  const ids = (s.match(/#[\w-]+/g) ?? []).map((x) => x.slice(1));
  s = s.replace(/#[\w-]+/g, " ");
  const classes = (s.match(/\.[\w-]+/g) ?? []).map((x) => x.slice(1));
  s = s.replace(/\.[\w-]+/g, " ");
  const attrs = (s.match(/\[[^\]]+\]/g) ?? []).map((x) => x.slice(1, -1).split("=")[0]!.trim().toLowerCase());
  s = s.replace(/\[[^\]]+\]/g, " ").replace(/::[\w-]+/g, " ");
  const pseudos = (s.match(/:[\w-]+/g) ?? []).map((x) => x.slice(1).toLowerCase());
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, " ");
  const tagMatch = s.trim().match(/^[a-zA-Z][\w-]*/);
  const tag = tagMatch && tagMatch[0] !== "*" ? tagMatch[0].toLowerCase() : null;

  if (tag && target.tag && tag !== target.tag) return false;
  if (ids.some((id) => !target.ids.includes(id))) return false;
  if (classes.some((cl) => !target.classes.includes(cl))) return false;
  if (attrs.some((at) => !target.attrs.includes(at))) return false;
  if (pseudos.some((p) => !target.pseudos.includes(p))) return false;
  return true;
}

function CascadeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-cascade-debugger", isPro);
  const seo = getToolSeo("css-cascade-debugger");

  const [css, setCss] = useState(SAMPLE);
  const [target, setTarget] = useState("button#submit.btn.primary");
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => {
    const tb = targetBits(target);
    if (!target.trim()) return null;
    const rules = parseCss(css);
    const byProp = new Map<string, Match[]>();
    for (const rule of rules) {
      for (const selector of rule.selectors) {
        if (!matches(selector, tb)) continue;
        const spec = specificity(selector);
        for (const d of rule.declarations) {
          const arr = byProp.get(d.property) ?? [];
          arr.push({
            selector, spec, specText: specToString(spec), order: rule.index,
            value: d.value, important: d.important,
          });
          byProp.set(d.property, arr);
        }
      }
    }
    const winners: { property: string; winner: Match; losers: Match[]; reason: string }[] = [];
    for (const [property, list] of byProp) {
      const sorted = [...list].sort((x, y) =>
        (x.important ? 1 : 0) - (y.important ? 1 : 0) ||
        compareSpec(x.spec, y.spec) ||
        x.order - y.order,
      );
      const winner = sorted[sorted.length - 1]!;
      const losers = sorted.slice(0, -1).reverse();
      let reason: string;
      if (winner.important && losers.some((l) => !l.important)) {
        reason = "Wins by !important";
      } else if (losers.length === 0) {
        reason = "Only matching declaration";
      } else {
        const next = sorted[sorted.length - 2]!;
        reason = compareSpec(winner.spec, next.spec) !== 0
          ? `Wins on specificity ${winner.specText} over ${next.specText}`
          : "Same specificity, later in source order wins";
      }
      winners.push({ property, winner, losers, reason });
    }
    winners.sort((a, b) => a.property.localeCompare(b.property));
    return { rules: rules.length, matched: byProp.size > 0, winners };
  }, [css, target]);

  const copyReport = async () => {
    if (!result || !trial.canUse) return;
    const lines: string[] = [`Cascade report for "${target.trim()}"`, ""];
    for (const w of result.winners) {
      lines.push(
        `${w.property}: ${w.winner.value}${w.winner.important ? " !important" : ""}`,
        `  winner: ${w.winner.selector} ${w.winner.specText}  (${w.reason})`,
      );
      for (const l of w.losers) {
        lines.push(`  loses:  ${l.selector} ${l.specText}${l.important ? " !important" : ""} -> ${l.value}`);
      }
      lines.push("");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      trial.recordUse();
      toast.success("Report copied to clipboard");
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  };

  return (
    <ToolPageShell toolId="css-cascade-debugger" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Cascade Debugger" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="cascade-css" className="mb-2 block text-[13px] font-medium text-foreground/80">
              CSS rules
            </label>
            <textarea
              id="cascade-css"
              value={css}
              onChange={(e) => setCss(e.target.value)}
              spellCheck={false}
              rows={14}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="cascade-target" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Target selector (the element you are styling)
            </label>
            <input
              id="cascade-target"
              value={target}
              onChange={(e) => { setTarget(e.target.value); setError(null); }}
              spellCheck={false}
              placeholder="e.g. button#submit.btn.primary"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Matching is approximate: a rule counts if its last compound selector is covered by the target selector.
          </p>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result || result.winners.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
              <Play className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">No matching declarations</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter a target selector that one of your rules covers to see the cascade breakdown.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {result.rules} rules parsed · {result.winners.length} properties for{" "}
                  <code className="font-mono font-bold text-foreground">{target.trim()}</code>
                </p>
                <ActionButton disabled={!trial.canUse} onClick={copyReport}>
                  <Copy className="h-4 w-4" /> Copy report
                </ActionButton>
              </div>
              {result.winners.map((w) => (
                <div key={w.property} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-mono text-sm font-bold">
                      {w.property}: <span className="text-primary">{w.winner.value}</span>
                      {w.winner.important && <span className="text-red-500"> !important</span>}
                    </p>
                    <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {w.reason}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    winning selector: <span className="font-bold text-foreground">{w.winner.selector}</span>{" "}
                    {w.winner.specText}
                  </p>
                  {w.losers.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-border pt-2">
                      {w.losers.map((l, i) => (
                        <p key={i} className={cn("font-mono text-xs text-muted-foreground", l.important && "text-red-500/80")}>
                          <span className="line-through">{l.selector}</span> {l.specText}{l.important ? " !important" : ""} - loses
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free report copies left.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
