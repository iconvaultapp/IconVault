// /tools/css-grid-track-sizing - Grid Track Sizing lab: configure column
// tracks and watch the browser resolve fr, minmax() and auto into real pixels.

import { useLayoutEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Grid2x2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-grid-track-sizing";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-grid-track-sizing";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-grid-track-sizing")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-grid-track-sizing";
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
  component: GridTrackSizing,
});

const TRACK_OPTIONS = [
  "1fr",
  "2fr",
  "200px",
  "minmax(150px, 1fr)",
  "minmax(100px, 300px)",
  "auto",
  "min-content",
  "max-content",
  "fit-content(200px)",
] as const;

const PRESETS: { name: string; tracks: string[] }[] = [
  { name: "Equal thirds", tracks: ["1fr", "1fr", "1fr"] },
  { name: "Sidebar layout", tracks: ["240px", "1fr"] },
  { name: "minmax demo", tracks: ["minmax(150px, 1fr)", "2fr", "minmax(100px, 300px)"] },
  { name: "Content-sized", tracks: ["min-content", "max-content", "1fr"] },
];

const ITEM_TEXTS = [
  "One",
  "Two words",
  "Three medium words",
  "Supercalifragilisticexpialidocious",
  "Five",
  "A slightly longer sentence here",
  "Seven",
  "Eight is great",
];

function GridTrackSizing() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-grid-track-sizing", isPro);
  const seo = toolSeo;

  const [tracks, setTracks] = useState<string[]>(["1fr", "1fr", "1fr"]);
  const [containerW, setContainerW] = useState(760);
  const [gap, setGap] = useState(12);
  const [resolved, setResolved] = useState<string[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const template = tracks.join(" ");

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const computed = getComputedStyle(el).gridTemplateColumns.split(" ");
    setResolved(computed);
  }, [template, containerW, gap]);

  const setTrack = (i: number, v: string) =>
    setTracks((p) => p.map((t, j) => (j === i ? v : t)));

  const addColumn = () => {
    if (tracks.length >= 6) return;
    setTracks((p) => [...p, "1fr"]);
  };
  const removeColumn = () => {
    if (tracks.length <= 1) return;
    setTracks((p) => p.slice(0, -1));
  };

  const css = `.grid {\n  display: grid;\n  grid-template-columns: ${template};\n  gap: ${gap}px;\n}\n/* container: ${containerW}px wide */`;

  const copyCss = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      toast.success("Grid CSS copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const totalResolved = resolved.reduce((a, v) => a + (parseFloat(v) || 0), 0);
  const gapsTotal = gap * (tracks.length - 1);
  const freeSpace = Math.max(0, containerW - totalResolved - gapsTotal);

  return (
    <ToolPageShell toolId="css-grid-track-sizing" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Grid Track Sizing" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setTracks(p.tracks)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/50"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Tracks</p>
              <div className="flex gap-1">
                <button type="button" onClick={removeColumn} disabled={tracks.length <= 1} className="rounded-md border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40">-</button>
                <button type="button" onClick={addColumn} disabled={tracks.length >= 6} className="rounded-md border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40">+</button>
              </div>
            </div>
            <div className="space-y-2">
              {tracks.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <select
                    value={t}
                    onChange={(e) => setTrack(i, e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs"
                  >
                    {TRACK_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>Container width</span>
              <span className="tabular-nums">{containerW}px</span>
            </div>
            <input type="range" min={320} max={1100} step={10} value={containerW} onChange={(e) => setContainerW(parseInt(e.target.value))} className="w-full accent-primary" aria-label="Container width" />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>Gap</span>
              <span className="tabular-nums">{gap}px</span>
            </div>
            <input type="range" min={0} max={32} step={2} value={gap} onChange={(e) => setGap(parseInt(e.target.value))} className="w-full accent-primary" aria-label="Gap" />
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
            <Grid2x2 className="h-4 w-4" /> Copy grid CSS
          </ActionButton>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free copies left.</p>}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="overflow-x-auto">
            <div style={{ width: containerW }} className="max-w-full">
              <div
                ref={gridRef}
                className="grid rounded-xl border border-dashed border-border bg-muted/30 p-3"
                style={{ gridTemplateColumns: template, gap }}
              >
                {ITEM_TEXTS.map((t, i) => (
                  <div key={i} className="flex min-h-[64px] items-center justify-center rounded-lg bg-primary/15 px-2 text-center text-xs font-semibold text-primary">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Resolved track sizes (read from the live browser engine)</p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Track</th>
                    <th className="px-3 py-2 font-semibold">Your definition</th>
                    <th className="px-3 py-2 font-semibold">Resolved width</th>
                    <th className="px-3 py-2 font-semibold">Share</th>
                    <th className="hidden px-3 py-2 font-semibold sm:table-cell">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((t, i) => {
                    const px = parseFloat(resolved[i] || "0") || 0;
                    const share = totalResolved > 0 ? (px / totalResolved) * 100 : 0;
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 font-bold">{i + 1}</td>
                        <td className="px-3 py-2 font-mono">{t}</td>
                        <td className="px-3 py-2 font-bold tabular-nums">{resolved[i] || "-"}</td>
                        <td className="px-3 py-2 tabular-nums">{share.toFixed(1)}%</td>
                        <td className="hidden px-3 py-2 sm:table-cell">
                          <div className="h-2.5 w-32 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${share}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Tracks total <span className="font-bold text-foreground tabular-nums">{Math.round(totalResolved)}px</span>
              {" "}+ gaps <span className="font-bold text-foreground tabular-nums">{gapsTotal}px</span>
              {" "}= <span className="font-bold text-foreground tabular-nums">{Math.round(totalResolved + gapsTotal)}px</span> of {containerW}px.
              Unused space: <span className={cn("font-bold tabular-nums", freeSpace > 1 ? "text-amber-500" : "text-foreground")}>{Math.round(freeSpace)}px</span>
              {freeSpace > 1 && " (no fr track claimed it)"}.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
              <span className="text-xs font-semibold text-muted-foreground">grid.css</span>
              <button type="button" onClick={copyCss} className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:border-primary/50">
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="overflow-x-auto p-3 text-xs leading-relaxed"><code>{css}</code></pre>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">What you are seeing</p>
            <p>
              <code className="font-mono">fr</code> divides leftover space after fixed tracks. <code className="font-mono">minmax(min, max)</code> clamps
              a track between two bounds. <code className="font-mono">auto</code>, <code className="font-mono">min-content</code> and{" "}
              <code className="font-mono">max-content</code> size from the items inside, which is why the long word
              stretches its track. Try narrowing the container to watch <code className="font-mono">minmax()</code> bottom out at its minimum.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
