// /tools/grade-calculator - Weighted grade calculator with assignment rows and
// a "what do I need on the final" forecaster. 100% in-browser.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, GraduationCap, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/grade-calculator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/grade-calculator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/grade-calculator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/grade-calculator";
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
  component: GradeTool,
});

interface Row {
  id: number;
  name: string;
  earned: string;
  possible: string;
  weight: string;
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary";

function GradeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("grade-calculator", isPro);
  const seo = toolSeo;

  const idRef = useRef(4);
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "Homework", earned: "92", possible: "100", weight: "20" },
    { id: 2, name: "Midterm", earned: "78", possible: "100", weight: "30" },
    { id: 3, name: "Project", earned: "45", possible: "50", weight: "25" },
  ]);
  const [finalWeight, setFinalWeight] = useState("25");
  const [target, setTarget] = useState("90");

  const update = (id: number, field: keyof Omit<Row, "id">, value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const remove = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));

  const add = () =>
    setRows((rs) => [...rs, { id: idRef.current++, name: "", earned: "", possible: "100", weight: "" }]);

  const calc = useMemo(() => {
    let weightSum = 0;
    let points = 0;
    let counted = 0;
    for (const r of rows) {
      const e = parseFloat(r.earned);
      const p = parseFloat(r.possible);
      const w = parseFloat(r.weight);
      if (!isFinite(e) || !isFinite(p) || !isFinite(w) || p <= 0 || w <= 0) continue;
      weightSum += w;
      points += (e / p) * w;
      counted++;
    }
    if (counted === 0 || weightSum <= 0) return null;
    return { grade: (points / weightSum) * 100, weightSum, counted };
  }, [rows]);

  const forecast = useMemo(() => {
    if (!calc) return null;
    const fw = parseFloat(finalWeight);
    const t = parseFloat(target);
    if (!isFinite(fw) || fw <= 0 || fw >= 100 || !isFinite(t)) return null;
    const rest = 100 - fw;
    const needed = ((t - (calc.grade * rest) / 100) / fw) * 100;
    return { needed, impossible: needed > 100, safe: needed <= 0 };
  }, [calc, finalWeight, target]);

  const copy = async () => {
    if (!calc || !trial.canUse) {
      if (!trial.canUse) toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    const lines = rows
      .map((r) => {
        const e = parseFloat(r.earned);
        const p = parseFloat(r.possible);
        const w = parseFloat(r.weight);
        const pct = isFinite(e) && isFinite(p) && p > 0 ? ((e / p) * 100).toFixed(1) : "?";
        return `${r.name || "Assignment"}: ${r.earned}/${r.possible} (${pct}%), weight ${w || 0}%`;
      })
      .join("\n");
    const summary = `Grade breakdown\n${lines}\nCurrent weighted grade: ${calc.grade.toFixed(2)}%${
      forecast
        ? `\nTo reach ${target}% with a ${finalWeight}% final, you need ${forecast.needed.toFixed(2)}% on the final.`
        : ""
    }`;
    try {
      await navigator.clipboard.writeText(summary);
      trial.recordUse();
      toast.success("Grade summary copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  const gradeColor =
    calc && calc.grade >= 90
      ? "text-green-600"
      : calc && calc.grade >= 70
        ? "text-primary"
        : "text-amber-600";

  return (
    <ToolPageShell toolId="grade-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Grade Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Assignment</th>
                  <th className="w-24 px-2 py-2 font-medium">Score</th>
                  <th className="w-24 px-2 py-2 font-medium">Out of</th>
                  <th className="w-24 px-2 py-2 font-medium">Weight %</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-2">
                      <input
                        value={r.name}
                        onChange={(e) => update(r.id, "name", e.target.value)}
                        placeholder="e.g. Quiz 1"
                        className={inputCls}
                        aria-label="Assignment name"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input value={r.earned} onChange={(e) => update(r.id, "earned", e.target.value)} inputMode="decimal" placeholder="0" className={inputCls} aria-label="Points earned" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={r.possible} onChange={(e) => update(r.id, "possible", e.target.value)} inputMode="decimal" placeholder="100" className={inputCls} aria-label="Points possible" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={r.weight} onChange={(e) => update(r.id, "weight", e.target.value)} inputMode="decimal" placeholder="0" className={inputCls} aria-label="Weight percent" />
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-400 hover:text-red-500"
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Add assignment
          </button>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              Final exam forecaster - what do I need?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="gc-fw">
                  Final weight %
                </label>
                <input id="gc-fw" value={finalWeight} onChange={(e) => setFinalWeight(e.target.value)} inputMode="decimal" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="gc-t">
                  Target grade %
                </label>
                <input id="gc-t" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" className={inputCls} />
              </div>
            </div>
            {forecast && calc && (
              <p className="mt-3 font-mono text-sm font-bold text-primary">
                {forecast.safe ? (
                  <>You already have {target}% locked in - even a 0 on the final keeps you at or above target.</>
                ) : forecast.impossible ? (
                  <>You would need {forecast.needed.toFixed(1)}% on the final - that is over 100%, so the target is out of reach.</>
                ) : (
                  <>You need {forecast.needed.toFixed(1)}% on the final to finish with {target}%.</>
                )}
              </p>
            )}
          </div>

          <ActionButton disabled={!calc || !trial.canUse} onClick={copy}>
            <ClipboardCopy className="h-4 w-4" /> Copy summary
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current weighted grade</p>
          {calc ? (
            <>
              <p className={`font-mono text-6xl font-bold ${gradeColor}`}>{calc.grade.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                Based on {calc.counted} graded {calc.counted === 1 ? "item" : "items"} - weights total {calc.weightSum.toFixed(0)}%.
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-6xl font-bold text-muted-foreground">--</p>
              <p className="max-w-[220px] text-xs text-muted-foreground">
                Fill in at least one assignment row with a score, a total and a weight.
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
