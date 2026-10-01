// /tools/eta-calculator - Turn your measured work rate into an estimated
// finish time and date with a live progress bar. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Gauge } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/eta-calculator")({
  head: () => {
    const seo = getToolSeoMeta("eta-calculator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: EtaTool,
});

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60";

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function fmtTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 48) return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh === 0 ? `${d} day${d === 1 ? "" : "s"}` : `${d} day${d === 1 ? "" : "s"} ${rh} hr`;
}

function EtaTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("eta-calculator", isPro);
  const seo = getToolSeo("eta-calculator");

  const [done, setDone] = useState("40");
  const [elapsedH, setElapsedH] = useState("2");
  const [elapsedM, setElapsedM] = useState("30");
  const [remaining, setRemaining] = useState("60");
  const [now] = useState(() => Date.now());

  const result = useMemo(() => {
    const doneN = num(done);
    const elapsedMin = num(elapsedH) * 60 + num(elapsedM);
    const remN = num(remaining);
    const total = doneN + remN;
    if (elapsedMin <= 0 || doneN <= 0 || remN < 0 || total <= 0) return null;
    const perMin = doneN / elapsedMin;
    const remainingMin = remN / perMin;
    const eta = new Date(now + remainingMin * 60000);
    return {
      perHour: perMin * 60,
      perMin,
      remainingMin,
      doneN,
      remN,
      total,
      progress: doneN / total,
      eta,
    };
  }, [done, elapsedH, elapsedM, remaining, now]);

  const etaDate = result
    ? result.eta.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "";
  const etaTime = result
    ? result.eta.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";

  const copyResult = async () => {
    if (!result || !trial.canUse) return;
    const text =
      `ETA estimate\n` +
      `Units done: ${result.doneN} in ${fmtTime(num(elapsedH) * 60 + num(elapsedM))} ` +
      `(rate: ${result.perHour >= 10 ? Math.round(result.perHour) : result.perHour.toFixed(2)}/hr)\n` +
      `Remaining: ${result.remN} units\n` +
      `Time left: ${fmtTime(result.remainingMin)}\n` +
      `Estimated finish: ${etaTime}, ${etaDate}`;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Estimate copied to clipboard");
    } catch {
      toast.error("Could not copy - your browser blocked clipboard access");
    }
  };

  return (
    <ToolPageShell toolId="eta-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ETA Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Units already done
            </label>
            <input
              type="number"
              min={0}
              value={done}
              onChange={(e) => setDone(e.target.value)}
              className={inputCls}
              placeholder="e.g. 40"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Time taken for those units
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  min={0}
                  value={elapsedH}
                  onChange={(e) => setElapsedH(e.target.value)}
                  className={inputCls}
                  placeholder="Hours"
                  aria-label="Hours"
                />
                <p className="mt-1 text-xs text-muted-foreground">Hours</p>
              </div>
              <div>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={elapsedM}
                  onChange={(e) => setElapsedM(e.target.value)}
                  className={inputCls}
                  placeholder="Minutes"
                  aria-label="Minutes"
                />
                <p className="mt-1 text-xs text-muted-foreground">Minutes</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Units remaining
            </label>
            <input
              type="number"
              min={0}
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              className={inputCls}
              placeholder="e.g. 60"
            />
          </div>

          <ActionButton busy={false} disabled={!result || !trial.canUse} onClick={copyResult}>
            <Copy className="h-4 w-4" /> Copy estimate
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs on your device.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Gauge className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your ETA appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter how many units you finished and how long they took, and this tool projects
                your finish time from your real measured rate.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl bg-primary/5 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estimated finish
                </p>
                <p className="mt-1 text-3xl font-extrabold text-primary">{etaTime}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground/70">{etaDate}</p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground/80">Progress</span>
                  <span className="font-bold">
                    {Math.round(result.progress * 100)}% ({result.doneN.toLocaleString()} of{" "}
                    {result.total.toLocaleString()})
                  </span>
                </div>
                <div
                  className="h-3 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={Math.round(result.progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${result.progress * 100}%` }}
                  />
                </div>
              </div>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Your rate</dt>
                  <dd className={cn("mt-1 text-xl font-bold")}>
                    {result.perHour >= 10 ? Math.round(result.perHour) : result.perHour.toFixed(2)}{" "}
                    <span className="text-sm font-medium text-muted-foreground">/ hr</span>
                  </dd>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Time left</dt>
                  <dd className="mt-1 text-xl font-bold">{fmtTime(result.remainingMin)}</dd>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Units remaining</dt>
                  <dd className="mt-1 text-xl font-bold">{result.remN.toLocaleString()}</dd>
                </div>
              </dl>

              <p className="text-xs text-muted-foreground">
                Assumes you keep working at the same pace with no breaks. Real projects slow down,
                so treat this as the optimistic end of the range.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
