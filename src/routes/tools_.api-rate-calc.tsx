// /tools/api-rate-calc - API rate-limit math: daily capacity from any limit,
// token-bucket vs sliding-window burst planner, headroom check, and a ready
// copy-paste token-bucket implementation filled with your numbers.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, ClipboardCopy, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/api-rate-calc")({
  head: () => {
    const seo = getToolSeoMeta("api-rate-calc");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ApiRateCalc,
});

const PERIODS = [
  { label: "per second", secs: 1 },
  { label: "per minute", secs: 60 },
  { label: "per hour", secs: 3600 },
  { label: "per day", secs: 86400 },
] as const;

function Num({ label, value, onChange, min = 0, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <input
        type="number" min={min} step={step} value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function fmtBig(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(n < 10 && n % 1 !== 0 ? 2 : 0);
}

function ApiRateCalc() {
  const { isPro } = usePlan();
  const trial = useToolTrial("api-rate-calc", isPro);
  const seo = getToolSeo("api-rate-calc");

  const [limit, setLimit] = useState(1000);
  const [periodIdx, setPeriodIdx] = useState(2); // per hour
  const [bucket, setBucket] = useState(100);
  const [avgRps, setAvgRps] = useState(2);
  const [peakRps, setPeakRps] = useState(20);
  const [burst, setBurst] = useState(80);
  const [mode, setMode] = useState<"token" | "sliding">("token");
  const [done, setDone] = useState(false);

  const period = PERIODS[periodIdx] ?? PERIODS[2]!;

  const r = useMemo(() => {
    const rps = limit / period.secs;
    const perDay = rps * 86400;
    const dailyUsage = avgRps * 86400;
    const utilization = perDay > 0 ? (dailyUsage / perDay) * 100 : 0;
    const refillPerSec = rps;
    const burstOk = bucket >= burst;
    const peakOk = mode === "sliding" ? peakRps <= rps * 1.0 + bucket / 1 : peakRps <= rps + bucket;
    const neededBucket = Math.max(0, Math.ceil(peakRps - rps));
    const ok = utilization < 80 && burstOk;
    return { rps, perDay, dailyUsage, utilization, refillPerSec, burstOk, peakOk, neededBucket, ok };
  }, [limit, period, bucket, avgRps, peakRps, burst, mode]);

  const code = useMemo(() => `// Token bucket rate limiter: ${limit} req ${period.label}, burst ${bucket}
function createLimiter() {
  let tokens = ${bucket};
  let last = Date.now();
  const capacity = ${bucket};
  const refillPerMs = ${(r.refillPerSec / 1000).toPrecision(4)}; // tokens per ms

  return function allow(cost = 1) {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + (now - last) * refillPerMs);
    last = now;
    if (tokens >= cost) { tokens -= cost; return true; }
    return false;
  };
}

const allow = createLimiter();
if (!allow()) {
  // respond 429 with Retry-After
}`, [limit, period, bucket, r.refillPerSec]);

  const calculate = useCallback(() => {
    if (!trial.canUse) return;
    setDone(true);
    trial.recordUse();
    toast.success("Rate plan calculated");
  }, [trial]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Limiter code copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  }, [code]);

  const stats = [
    { label: "Capacity", value: `${fmtBig(r.perDay)} req/day` },
    { label: "Projected usage", value: `${fmtBig(r.dailyUsage)} req/day` },
    { label: "Utilization", value: `${r.utilization.toFixed(1)}%` },
    { label: "Sustained rate", value: `${r.rps >= 1 ? r.rps.toFixed(2) : r.rps.toPrecision(2)} req/s` },
    { label: "Burst allowance", value: r.burstOk ? `${bucket} OK` : `${bucket} too small` },
    { label: "Verdict", value: r.ok ? "Healthy" : "Tighten it" },
  ];

  return (
    <ToolPageShell toolId="api-rate-calc" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="API Rate Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Algorithm</p>
            <div className="flex gap-2">
              {([["token", "Token bucket"], ["sliding", "Sliding window"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMode(v)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                    mode === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "token"
                ? "Token bucket: steady refill, absorbs bursts up to bucket size."
                : "Sliding window: smooths traffic over a rolling window, stricter on spikes."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Num label="Limit (requests)" value={limit} onChange={setLimit} />
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Period</label>
              <select
                value={periodIdx}
                onChange={(e) => setPeriodIdx(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {PERIODS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <Num label={mode === "token" ? "Bucket size (burst allowance)" : "Window burst allowance"} value={bucket} onChange={setBucket} />

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Your traffic</p>
            <div className="space-y-4">
              <Num label="Average requests/sec" value={avgRps} onChange={setAvgRps} step={0.1} />
              <Num label="Peak requests/sec" value={peakRps} onChange={setPeakRps} step={0.5} />
              <Num label="Expected burst size" value={burst} onChange={setBurst} />
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={calculate}>
            <Calculator className="h-4 w-4" /> Calculate
          </ActionButton>
        </div>

        <div className="space-y-5">
          {!done ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card text-center">
              <Zap className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your rate plan appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter your limit and traffic, then hit Calculate for capacity, headroom and a verdict.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={cn("mt-1 text-xl font-extrabold",
                      s.label === "Verdict" && (r.ok ? "text-emerald-500" : "text-amber-500"))}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-2 text-sm font-semibold">Tier planner</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", r.utilization < 50 ? "bg-emerald-500" : "bg-amber-500")} />
                    <span><strong>Headroom:</strong> {(100 - r.utilization).toFixed(1)}% of capacity unused at average traffic. Keep 20%+ headroom for growth.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", r.burstOk ? "bg-emerald-500" : "bg-red-500")} />
                    <span>
                      {r.burstOk
                        ? `Your burst of ${burst} requests fits inside the ${bucket}-token bucket.`
                        : `Your burst of ${burst} exceeds the ${bucket}-token bucket. Raise it to at least ${Math.ceil(burst * 1.2)}.`}
                    </span>
                  </li>
                  {!r.peakOk && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                      <span>Peak of {peakRps} req/s exceeds sustained rate + bucket. Raise the limit or the bucket to at least {r.neededBucket}.</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>Bucket refills at {r.refillPerSec >= 1 ? r.refillPerSec.toFixed(2) : r.refillPerSec.toPrecision(2)} tokens/sec: a drained bucket takes {(bucket / Math.max(r.refillPerSec, 0.0001)).toFixed(1)}s to refill.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Token bucket code, filled with your numbers</p>
                  <button
                    type="button"
                    onClick={() => void copyCode()}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 text-xs leading-relaxed">{code}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
