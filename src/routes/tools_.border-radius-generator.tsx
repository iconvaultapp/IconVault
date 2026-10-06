// /tools/border-radius-generator - Build border-radius visually, including
// elliptical per-corner radii. 100% client-side; trial use is recorded
// when the CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/border-radius-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/border-radius-generator";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/border-radius-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/border-radius-generator";
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
  component: RadiusTool,
});

const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;

const PRESETS: { name: string; v: number[]; e?: number[] }[] = [
  { name: "None", v: [0, 0, 0, 0] },
  { name: "Rounded", v: [12, 12, 12, 12] },
  { name: "Pill", v: [50, 50, 50, 50] },
  { name: "Circle", v: [50, 50, 50, 50] },
  { name: "Leaf", v: [0, 50, 0, 50] },
  { name: "Blob", v: [60, 40, 30, 70], e: [60, 30, 70, 40] },
  { name: "Pebble", v: [30, 60, 30, 60], e: [40, 50, 40, 50] },
];

function RadiusTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("border-radius-generator", isPro);
  const seo = toolSeo;

  const [h, setH] = useState<number[]>([16, 16, 16, 16]);
  const [v, setV] = useState<number[]>([16, 16, 16, 16]);
  const [elliptical, setElliptical] = useState(false);
  const [copied, setCopied] = useState(false);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setH([...p.v]);
    setV(p.e ? [...p.e] : [...p.v]);
    setElliptical(!!p.e);
  };

  const setCorner = (i: number, val: number, vert: boolean) => {
    if (vert) {
      setV((p) => {
        const c = [...p];
        c[i] = val;
        return c;
      });
    } else {
      setH((p) => {
        const c = [...p];
        c[i] = val;
        return c;
      });
    }
  };

  const css = useMemo(() => {
    if (!elliptical) {
      const all = h.every((x) => x === h[0]);
      return `border-radius: ${all ? `${h[0]}%` : `${h[0]}% ${h[1]}% ${h[2]}% ${h[3]}%`};`;
    }
    const hh = `${h[0]}% ${h[1]}% ${h[2]}% ${h[3]}%`;
    const vv = `${v[0]}% ${v[1]}% ${v[2]}% ${v[3]}%`;
    return `border-radius: ${hh} / ${vv};`;
  }, [h, v, elliptical]);

  const radiusValue = useMemo(
    () =>
      elliptical
        ? `${h.map((x) => x + "%").join(" ")} / ${v.map((x) => x + "%").join(" ")}`
        : h.map((x) => x + "%").join(" "),
    [h, v, elliptical],
  );

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      trial.recordUse();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const slider = (label: string, value: number, onChange: (n: number) => void, axis: "H" | "V") => (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground/80">
          {label} <span className="text-xs text-muted-foreground">({axis})</span>
        </span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );

  return (
    <ToolPageShell toolId="border-radius-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Border Radius Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={elliptical}
              onChange={(e) => {
                setElliptical(e.target.checked);
                if (e.target.checked) setV([...h]);
              }}
              className="h-4 w-4 accent-primary"
            />
            Elliptical mode (separate horizontal and vertical radii)
          </label>

          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {CORNERS.map((c, i) => (
              <div key={c} className="rounded-xl bg-muted/50 p-3">
                <p className="mb-2 text-[13px] font-bold capitalize">{c.replace("-", " ")}</p>
                {slider("Horizontal", h[i] ?? 0, (n) => setCorner(i, n, false), "H")}
                {elliptical && slider("Vertical", v[i] ?? 0, (n) => setCorner(i, n, true), "V")}
              </div>
            ))}
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border bg-card p-10">
            <div
              className="flex h-64 w-64 items-center justify-center bg-primary font-mono text-xs font-bold text-primary-foreground shadow-xl transition-all duration-150"
              style={{ borderRadius: radiusValue }}
            >
              {elliptical ? `${h[0]}/${v[0]}` : `${h[0]}%`}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS output</p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-sm">{css}</pre>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy CSS"}
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
