// /tools/contrast-checker - WCAG contrast ratio checker for text/background pairs.
// 100% client-side; trial use is recorded when the Check button produces a result.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Contrast, ArrowLeftRight, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/contrast-checker")({
  head: () => {
    const seo = getToolSeoMeta("contrast-checker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ContrastCheckerTool,
});

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}

interface Badge {
  label: string;
  pass: boolean;
}

function badgesFor(ratio: number): Badge[] {
  return [
    { label: "AA normal", pass: ratio >= 4.5 },
    { label: "AA large", pass: ratio >= 3 },
    { label: "AAA normal", pass: ratio >= 7 },
    { label: "AAA large", pass: ratio >= 4.5 },
  ];
}

function ContrastCheckerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("contrast-checker", isPro);
  const seo = getToolSeo("contrast-checker");

  const [fg, setFg] = useState("#111827");
  const [bg, setBg] = useState("#ffffff");
  const [ratio, setRatio] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fgValid = hexToRgb(fg) !== null;
  const bgValid = hexToRgb(bg) !== null;

  /** Live ratio - recomputed whenever both fields hold valid hex, no button needed. */
  const liveRatio = useMemo(() => {
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    if (l1 === null || l2 === null) return null;
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }, [fg, bg]);

  // Last color pair already counted toward the free trial (initialized with the
  // starting pair so the initial page load doesn't consume a use).
  const lastRecordedPair = useRef<string>(`${fg}+${bg}`);

  useEffect(() => {
    if (liveRatio === null) return;
    const pair = `${fg}+${bg}`;
    if (pair !== lastRecordedPair.current && trial.canUse) {
      trial.recordUse();
      lastRecordedPair.current = pair;
    }
  }, [liveRatio, fg, bg, trial.canUse, trial.recordUse]);

  // Live value wins when valid; the Check button's stored ratio is the fallback.
  const shown = liveRatio ?? ratio;

  const result = useMemo(() => {
    if (shown === null) return null;
    return badgesFor(shown);
  }, [shown]);

  const check = () => {
    if (!trial.canUse) return;
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    if (l1 === null || l2 === null) {
      setError("Enter valid hex colors for both fields.");
      toast.error("Enter valid hex colors for both fields.");
      return;
    }
    setError(null);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    setRatio((lighter + 0.05) / (darker + 0.05));
    trial.recordUse();
    lastRecordedPair.current = `${fg}+${bg}`;
  };

  /** Nudge the foreground color toward black or white until it hits WCAG AA (4.5:1). */
  const suggestFix = () => {
    const fgRgb = hexToRgb(fg);
    const bgRgb = hexToRgb(bg);
    if (!fgRgb || !bgRgb) return;
    const toHex = (r: number, g: number, b: number) =>
      `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
    const mix = (t: number, target: { r: number; g: number; b: number }) => ({
      r: fgRgb.r + (target.r - fgRgb.r) * t,
      g: fgRgb.g + (target.g - fgRgb.g) * t,
      b: fgRgb.b + (target.b - fgRgb.b) * t,
    });
    const BLACK = { r: 0, g: 0, b: 0 };
    const WHITE = { r: 255, g: 255, b: 255 };
    let bestHex: string | null = null;
    let bestT = Infinity;
    for (const target of [BLACK, WHITE]) {
      for (let t = 0.05; t <= 1; t += 0.05) {
        const m = mix(t, target);
        const l1 = luminance(toHex(m.r, m.g, m.b));
        const l2 = luminance(bg);
        if (l1 === null || l2 === null) continue;
        const r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (r >= 4.5) {
          if (t < bestT) {
            bestT = t;
            bestHex = toHex(m.r, m.g, m.b);
          }
          break;
        }
      }
    }
    if (bestHex) {
      setFg(bestHex);
      toast.success(`Suggested fix: ${bestHex} - re-check to verify.`);
    } else {
      toast.error("No nearby fix found - try a very different color.");
    }
  };

  const colorField = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hexToRgb(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} picker`}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-background p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="#000000"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
        />
      </div>
    </div>
  );

  return (
    <ToolPageShell toolId="contrast-checker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Contrast Checker" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          {colorField("Text (foreground)", fg, setFg)}
          {colorField("Background", bg, setBg)}
          <ActionButton busy={false} disabled={!trial.canUse || !fgValid || !bgValid} onClick={check}>
            <Contrast className="h-4 w-4" /> Check contrast
          </ActionButton>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setFg(bg); setBg(fg); setRatio(null); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Swap colors
            </button>
            <button
              type="button"
              onClick={suggestFix}
              disabled={!fgValid || !bgValid}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-3.5 w-3.5" /> Suggest AA fix
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free checks left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-5">
          <div
            className="flex min-h-[220px] flex-col justify-center rounded-2xl border border-border p-8 transition-colors"
            style={{ backgroundColor: bgValid ? bg : "#ffffff", color: fgValid ? fg : "#111827" }}
          >
            <p className="text-4xl font-extrabold tracking-tight">The quick brown fox</p>
            <p className="mt-3 text-lg font-semibold">Sample paragraph text at a regular reading size.</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-widest">Small uppercase label</p>
          </div>

          {shown !== null && result ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-muted-foreground">Contrast ratio</p>
                <p className="font-mono text-4xl font-extrabold tabular-nums">{shown.toFixed(2)}:1</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.map((b) => (
                  <span
                    key={b.label}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold",
                      b.pass
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400",
                    )}
                  >
                    {b.pass ? "✓" : "✕"} {b.label}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                WCAG 2.1: normal text needs ≥ 4.5:1 for AA and ≥ 7:1 for AAA; large text (18pt+ or 14pt+ bold)
                needs ≥ 3:1 for AA and ≥ 4.5:1 for AAA.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Type two valid hex colors to see the live ratio and AA / AAA verdicts - or press{" "}
              <span className="font-bold text-foreground">Check contrast</span>.
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
