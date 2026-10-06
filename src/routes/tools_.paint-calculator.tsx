// /tools/paint-calculator - Estimate how much paint a room needs from wall
// sizes, minus doors and windows, for any number of coats. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, PaintRoller, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/paint-calculator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/paint-calculator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/paint-calculator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/paint-calculator";
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
  component: PaintTool,
});

interface Rect {
  id: number;
  w: string;
  h: string;
  qty: string;
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

let nextId = 1;
const mkRect = (w = "", h = "", qty = "1"): Rect => ({ id: nextId++, w, h, qty });

const DOOR_W = "3";
const DOOR_H = "6.8";
const WINDOW_W = "4";
const WINDOW_H = "4";

function PaintTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("paint-calculator", isPro);
  const seo = toolSeo;

  const [walls, setWalls] = useState<Rect[]>([mkRect("12", "9"), mkRect("10", "9")]);
  const [openings, setOpenings] = useState<Rect[]>([mkRect(DOOR_W, DOOR_H), mkRect(WINDOW_W, WINDOW_H)]);
  const [coats, setCoats] = useState("2");
  const [coverage, setCoverage] = useState("350");

  const result = useMemo(() => {
    const wallArea = walls.reduce((a, r) => a + num(r.w) * num(r.h) * num(r.qty), 0);
    const openArea = openings.reduce((a, r) => a + num(r.w) * num(r.h) * num(r.qty), 0);
    const coatsN = Math.max(1, Math.round(num(coats) || 1));
    const coverageN = num(coverage);
    if (wallArea <= 0 || coverageN <= 0) return null;
    const paintable = Math.max(0, wallArea - openArea) * coatsN;
    const gallons = paintable / coverageN;
    const liters = gallons * 3.78541;
    const buyQuarts = Math.ceil(gallons * 4) / 4;
    return { wallArea, openArea, paintable, coatsN, coverageN, gallons, liters, buyQuarts };
  }, [walls, openings, coats, coverage]);

  const setField = (
    list: Rect[],
    setList: (v: Rect[]) => void,
    id: number,
    key: keyof Omit<Rect, "id">,
    v: string,
  ) => setList(list.map((r) => (r.id === id ? { ...r, [key]: v } : r)));

  const copySummary = async () => {
    if (!result || !trial.canUse) return;
    const text =
      `Paint estimate\n` +
      `Wall area: ${result.wallArea.toFixed(1)} sq ft - ${result.openArea.toFixed(1)} sq ft (doors/windows) = ` +
      `${(result.wallArea - result.openArea).toFixed(1)} sq ft per coat\n` +
      `Coats: ${result.coatsN} | Coverage: ${result.coverageN} sq ft per gallon\n` +
      `Paint needed: ${result.gallons.toFixed(2)} gallons (${result.liters.toFixed(2)} liters)\n` +
      `Buy: ${result.buyQuarts.toFixed(2)} gallons (rounded up to the nearest quart)`;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Could not copy - your browser blocked clipboard access");
    }
  };

  const rectRow = (
    r: Rect,
    list: Rect[],
    setList: (v: Rect[]) => void,
    label: string,
    qtyLabel: string,
  ) => (
    <div key={r.id} className="flex items-end gap-2">
      <div className="flex-1">
        <span className="sr-only">{label} width (ft)</span>
        <input type="number" min={0} value={r.w} onChange={(e) => setField(list, setList, r.id, "w", e.target.value)} className={inputCls} placeholder="W" aria-label={`${label} width in feet`} />
      </div>
      <span className="pb-2 text-muted-foreground">x</span>
      <div className="flex-1">
        <span className="sr-only">{label} height (ft)</span>
        <input type="number" min={0} value={r.h} onChange={(e) => setField(list, setList, r.id, "h", e.target.value)} className={inputCls} placeholder="H" aria-label={`${label} height in feet`} />
      </div>
      <div className="w-16">
        <span className="sr-only">{qtyLabel}</span>
        <input type="number" min={0} value={r.qty} onChange={(e) => setField(list, setList, r.id, "qty", e.target.value)} className={inputCls} placeholder="Qty" aria-label={qtyLabel} />
      </div>
      <button
        type="button"
        onClick={() => setList(list.filter((x) => x.id !== r.id))}
        className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-500/50 hover:text-red-500"
        aria-label={`Remove ${label}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <ToolPageShell toolId="paint-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Paint Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Walls (length x height, ft)</p>
              <button
                type="button"
                onClick={() => setWalls((w) => [...w, mkRect()])}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {walls.map((r, i) => rectRow(r, walls, setWalls, `Wall ${i + 1}`, "Wall quantity"))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Doors and windows to subtract</p>
              <button
                type="button"
                onClick={() => setOpenings((o) => [...o, mkRect()])}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {openings.length === 0 && (
                <p className="text-xs text-muted-foreground">No openings - full wall area counts.</p>
              )}
              {openings.map((r, i) => rectRow(r, openings, setOpenings, `Opening ${i + 1}`, "Opening quantity"))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Coats</label>
              <input type="number" min={1} value={coats} onChange={(e) => setCoats(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                Coverage (sq ft / gal)
              </label>
              <input type="number" min={0} value={coverage} onChange={(e) => setCoverage(e.target.value)} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Honest note: 350 sq ft per gallon is a typical one-coat figure for smooth walls. Rough,
            porous or unpainted drywall drinks more paint, so check your paint can and lower this
            number if your surface is thirsty.
          </p>

          <ActionButton busy={false} disabled={!result || !trial.canUse} onClick={copySummary}>
            <Copy className="h-4 w-4" /> Copy summary
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
              <PaintRoller className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your paint estimate appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your wall sizes and the doors and windows you will paint around.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl bg-primary/5 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Paint needed ({result.coatsN} coat{result.coatsN === 1 ? "" : "s"})
                </p>
                <p className="mt-1 text-3xl font-extrabold text-primary">
                  {result.gallons.toFixed(2)} <span className="text-lg font-semibold">gallons</span>
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground/70">
                  {result.liters.toFixed(2)} liters - buy {result.buyQuarts.toFixed(2)} gallons
                  (rounded up to the nearest quart)
                </p>
              </div>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Wall area</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums">{result.wallArea.toFixed(1)} sq ft</dd>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Minus openings</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums">{result.openArea.toFixed(1)} sq ft</dd>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Total to paint</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums">{result.paintable.toFixed(1)} sq ft</dd>
                </div>
              </dl>

              <p className="text-xs text-muted-foreground">
                Ceilings, trim and primer are not included. For a dramatic color change, plan a
                separate primer coat at the same coverage rate.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
