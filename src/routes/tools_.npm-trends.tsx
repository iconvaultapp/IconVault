// /tools/npm-trends - Compare npm download trends for up to 5 packages with
// canvas charts. Data comes from api.npmjs.org, rendered 100% in-browser.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LineChart, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/npm-trends")({
  head: () => {
    const seo = getToolSeoMeta("npm-trends");
    const canonical = "https://iconvault.site/tools/npm-trends";
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
  component: NpmTrendsTool,
});

const COLORS = ["#f43f5e", "#3b82f6", "#22c55e", "#eab308", "#a855f7"];

interface Series {
  name: string;
  color: string;
  points: { day: string; downloads: number }[];
  total: number;
}

type Period = "last-month" | "last-year";

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

async function fetchSeries(name: string, period: Period): Promise<Series> {
  const range = period === "last-month" ? "last-month" : "last-year";
  const res = await fetch(`https://api.npmjs.org/downloads/range/${range}/${encodeURIComponent(name)}`);
  if (res.status === 404) throw new Error(`No download data for "${name}".`);
  if (!res.ok) throw new Error(`api.npmjs.org returned HTTP ${res.status}.`);
  const data = await res.json();
  const points = (data.downloads ?? []) as { day: string; downloads: number }[];
  const total = points.reduce((a, p) => a + (p.downloads || 0), 0);
  return { name, color: "", points, total };
}

function NpmTrendsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("npm-trends", isPro);
  const seo = getToolSeo("npm-trends");
  const [names, setNames] = useState<string[]>(["react", "vue", "svelte"]);
  const [input, setInput] = useState("");
  const [period, setPeriod] = useState<Period>("last-year");
  const [busy, setBusy] = useState(false);
  const [series, setSeries] = useState<Series[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addName = () => {
    const v = input.trim().toLowerCase();
    if (!v) return;
    if (names.includes(v)) {
      toast.message(`${v} is already in the comparison`);
      return;
    }
    if (names.length >= 5) {
      toast.error("Maximum 5 packages per comparison");
      return;
    }
    setNames((p) => [...p, v]);
    setInput("");
  };

  const removeName = (n: string) => setNames((p) => p.filter((x) => x !== n));

  const compare = async () => {
    if (names.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setSeries([]);
    try {
      const list = await Promise.all(names.map((n) => fetchSeries(n, period)));
      const colored = list.map((s, i) => ({ ...s, color: COLORS[i % COLORS.length] ?? COLORS[0]! }));
      setSeries(colored);
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Comparison failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || series.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 720;
    const H = 340;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const padL = 52;
    const padR = 12;
    const padT = 16;
    const padB = 28;
    const all = series.flatMap((s) => s.points.map((p) => p.downloads));
    const max = Math.max(...all, 1);
    const n = Math.max(...series.map((s) => s.points.length), 1);
    const x = (i: number) => padL + (i / Math.max(n - 1, 1)) * (W - padL - padR);
    const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

    const css = getComputedStyle(document.documentElement);
    const muted = css.getPropertyValue("--muted-foreground").trim() || "#888";
    ctx.strokeStyle = "rgba(128,128,128,0.2)";
    ctx.fillStyle = muted;
    ctx.font = "11px system-ui";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = (max / 4) * g;
      const gy = y(v);
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(W - padR, gy);
      ctx.stroke();
      ctx.fillText(fmt(v), 6, gy + 4);
    }

    series.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const px = x(i);
        const py = y(p.downloads);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });

    if (n > 0) {
      const first = series[0]?.points[0]?.day ?? "";
      const last = series[0]?.points[n - 1]?.day ?? "";
      ctx.fillText(first, padL, H - 8);
      const lastW = ctx.measureText(last).width;
      ctx.fillText(last, W - padR - lastW, H - 8);
    }
  }, [series]);

  return (
    <ToolPageShell toolId="npm-trends" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="NPM Trends" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">
            Packages (up to 5)
          </label>
          <div className="flex flex-wrap gap-2">
            {names.map((n, i) => (
              <span
                key={n}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 py-1.5 pl-3 pr-2 font-mono text-sm"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {n}
                <button type="button" onClick={() => removeName(n)} aria-label={`Remove ${n}`} className="text-muted-foreground hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {names.length < 5 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border py-1.5 pl-3 pr-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addName(); }}
                  placeholder="add package"
                  spellCheck={false}
                  autoComplete="off"
                  className="w-28 bg-transparent font-mono text-sm outline-none"
                />
                <button type="button" onClick={addName} aria-label="Add package" className="rounded-full p-1 text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-border p-1">
              {(["last-month", "last-year"] as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition",
                    period === p ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "last-month" ? "30 days" : "12 months"}
                </button>
              ))}
            </div>
            <ActionButton busy={busy} disabled={names.length === 0 || !trial.canUse} onClick={compare}>
              <LineChart className="h-4 w-4" /> {busy ? "Loading…" : "Compare"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free comparisons left.
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {series.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap gap-4">
              {series.map((s) => (
                <span key={s.name} className="inline-flex items-center gap-2 text-sm font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="font-mono">{s.name}</span>
                  <span className="text-muted-foreground">{fmt(s.total)} total</span>
                </span>
              ))}
            </div>
            <canvas ref={canvasRef} className="w-full rounded-xl bg-muted/30" />
            <p className="mt-3 text-xs text-muted-foreground">
              Daily downloads from api.npmjs.org · {period === "last-month" ? "last 30 days" : "last 12 months"}.
            </p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
