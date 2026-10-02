// /tools/typography-scale - Modular typography scale builder with live preview
// and CSS / SCSS / Tailwind export. 100% client-side; trial use is recorded
// when a snippet is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Type } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/typography-scale")({
  head: () => {
    const seo = getToolSeoMeta("typography-scale");
    const canonical = "https://iconvault.site/tools/typography-scale";
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
  component: TypeScaleTool,
});

const RATIOS = [
  { name: "Minor second", value: 1.067 },
  { name: "Major second", value: 1.125 },
  { name: "Minor third", value: 1.2 },
  { name: "Major third", value: 1.25 },
  { name: "Perfect fourth", value: 1.333 },
  { name: "Augmented fourth", value: 1.414 },
  { name: "Perfect fifth", value: 1.5 },
  { name: "Golden ratio", value: 1.618 },
  { name: "Custom", value: 0 },
];

type ExportTab = "css" | "scss" | "tailwind";

function stepName(n: number): string {
  if (n === 0) return "Base (body)";
  return n > 0 ? `Step +${n}` : `Step ${n}`;
}

function varName(n: number): string {
  return n < 0 ? `--text-scale-n${Math.abs(n)}` : `--text-scale-${n}`;
}

function TypeScaleTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("typography-scale", isPro);
  const seo = getToolSeo("typography-scale");

  const [base, setBase] = useState(16);
  const [ratioIdx, setRatioIdx] = useState(4);
  const [customRatio, setCustomRatio] = useState(1.25);
  const [upSteps, setUpSteps] = useState(5);
  const [downSteps, setDownSteps] = useState(3);
  const [tab, setTab] = useState<ExportTab>("css");
  const [copied, setCopied] = useState(false);

  const selRatio = RATIOS[ratioIdx];
  const ratio = ratioIdx === RATIOS.length - 1 ? Math.max(1.01, customRatio || 1.25) : (selRatio?.value ?? 1.25);
  const ratioName = ratioIdx === RATIOS.length - 1 ? "Custom" : (selRatio?.name ?? "");

  const steps = useMemo(() => {
    const list: { n: number; px: number }[] = [];
    for (let n = upSteps; n >= 1; n--) list.push({ n, px: base * Math.pow(ratio, n) });
    list.push({ n: 0, px: base });
    for (let n = 1; n <= downSteps; n++) list.push({ n: -n, px: base / Math.pow(ratio, n) });
    return list;
  }, [base, ratio, upSteps, downSteps]);

  const fmtPx = (px: number) => (px >= 10 ? px.toFixed(2).replace(/\.?0+$/, "") : px.toFixed(2));

  const exportText = useMemo(() => {
    const asc = [...steps].reverse();
    const comment = `Typography scale: base ${base}px, ratio ${ratio} (${ratioName})`;
    if (tab === "css") {
      return `/* ${comment} */\n:root {\n${asc.map((s) => `  ${varName(s.n)}: ${fmtPx(s.px)}px;`).join("\n")}\n}`;
    }
    if (tab === "scss") {
      return `// ${comment}\n$text-scale: (\n${asc.map((s) => `  "${s.n}": ${fmtPx(s.px)}px,`).join("\n")}\n);`;
    }
    return `// ${comment}\n// tailwind.config.js\ntheme: {\n  extend: {\n    fontSize: {\n${asc.map((s) => `      "scale-${s.n}": "${fmtPx(s.px)}px",`).join("\n")}\n    },\n  },\n},`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, tab, base, ratio, ratioName]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      trial.recordUse();
      toast.success("Scale copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const numberInput = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (n: number) => void,
    suffix = "px",
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none"
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );

  return (
    <ToolPageShell toolId="typography-scale" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Typography Scale" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {numberInput("Base font size", base, 8, 32, 1, setBase)}

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Scale ratio</span>
            <select
              value={ratioIdx}
              onChange={(e) => setRatioIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {RATIOS.map((r, i) => (
                <option key={r.name} value={i}>
                  {r.name}{r.value > 0 ? ` (${r.value})` : ""}
                </option>
              ))}
            </select>
            {ratioIdx === RATIOS.length - 1 && (
              <div className="mt-3">
                {numberInput("Custom ratio", customRatio, 1.01, 3, 0.001, setCustomRatio, "")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {numberInput("Steps up", upSteps, 0, 8, 1, setUpSteps, "")}
            {numberInput("Steps down", downSteps, 0, 6, 1, setDownSteps, "")}
          </div>

          <p className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            Each step multiplies the previous size by the ratio. Larger ratios give more dramatic
            headings; smaller ratios feel calmer and more editorial.
          </p>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Live preview</h2>
            </div>
            <div className="space-y-4">
              {steps.map((s) => (
                <div key={s.n} className="flex items-baseline gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="w-24 shrink-0">
                    <p className="text-xs font-bold">{stepName(s.n)}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {fmtPx(s.px)}px / {(s.px / 16).toFixed(3)}rem
                    </p>
                  </div>
                  <p className="truncate leading-tight" style={{ fontSize: `${Math.min(s.px, 72)}px` }}>
                    The quick brown fox
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 rounded-xl bg-muted p-1">
                {(["css", "scss", "tailwind"] as ExportTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t === "css" ? "CSS variables" : t === "scss" ? "SCSS map" : "Tailwind"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copy}
                disabled={!trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
              {exportText}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
