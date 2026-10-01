// /tools/smoothie-macros - Build a smoothie from real ingredients and get
// total calories, protein, carbs and fat. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, CupSoda, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/smoothie-macros")({
  head: () => {
    const seo = getToolSeoMeta("smoothie-macros");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SmoothieTool,
});

interface Ingredient {
  id: string;
  name: string;
  cat: "Fruits" | "Liquids" | "Protein" | "Extras";
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Macros per 100 g (approximate, USDA-style averages)
const INGREDIENTS: Ingredient[] = [
  { id: "banana", name: "Banana", cat: "Fruits", cal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { id: "strawberry", name: "Strawberries", cat: "Fruits", cal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { id: "blueberry", name: "Blueberries", cat: "Fruits", cal: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
  { id: "mango", name: "Mango", cat: "Fruits", cal: 60, protein: 0.8, carbs: 15, fat: 0.4 },
  { id: "pineapple", name: "Pineapple", cat: "Fruits", cal: 50, protein: 0.5, carbs: 13.1, fat: 0.1 },
  { id: "apple", name: "Apple", cat: "Fruits", cal: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  { id: "orange", name: "Orange", cat: "Fruits", cal: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
  { id: "peach", name: "Peach", cat: "Fruits", cal: 39, protein: 0.9, carbs: 9.5, fat: 0.3 },
  { id: "avocado", name: "Avocado", cat: "Fruits", cal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { id: "dates", name: "Dates", cat: "Fruits", cal: 282, protein: 2.5, carbs: 75, fat: 0.4 },
  { id: "milk", name: "Whole milk", cat: "Liquids", cal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { id: "almond-milk", name: "Almond milk (unsweetened)", cat: "Liquids", cal: 15, protein: 0.6, carbs: 1.3, fat: 1.1 },
  { id: "coconut-water", name: "Coconut water", cat: "Liquids", cal: 19, protein: 0.7, carbs: 3.7, fat: 0.2 },
  { id: "oj", name: "Orange juice", cat: "Liquids", cal: 45, protein: 0.7, carbs: 10.4, fat: 0.2 },
  { id: "greek-yogurt", name: "Greek yogurt", cat: "Liquids", cal: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { id: "kefir", name: "Kefir", cat: "Liquids", cal: 55, protein: 3.3, carbs: 4.5, fat: 3.5 },
  { id: "whey", name: "Whey protein powder", cat: "Protein", cal: 400, protein: 80, carbs: 10, fat: 6 },
  { id: "peanut-butter", name: "Peanut butter", cat: "Protein", cal: 588, protein: 25, carbs: 20, fat: 50 },
  { id: "chia", name: "Chia seeds", cat: "Protein", cal: 486, protein: 16.5, carbs: 42.1, fat: 30.7 },
  { id: "oats", name: "Oats", cat: "Protein", cal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { id: "almonds", name: "Almonds", cat: "Protein", cal: 579, protein: 21.2, carbs: 21.6, fat: 49.9 },
  { id: "honey", name: "Honey", cat: "Protein", cal: 304, protein: 0.3, carbs: 82.4, fat: 0 },
  { id: "cocoa", name: "Cocoa powder", cat: "Extras", cal: 228, protein: 19.6, carbs: 57.9, fat: 13.7 },
  { id: "spinach", name: "Spinach", cat: "Extras", cal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { id: "kale", name: "Kale", cat: "Extras", cal: 49, protein: 4.3, carbs: 8.8, fat: 0.9 },
  { id: "flax", name: "Flaxseed", cat: "Extras", cal: 534, protein: 18.3, carbs: 28.9, fat: 42.2 },
  { id: "cinnamon", name: "Cinnamon", cat: "Extras", cal: 247, protein: 4, carbs: 80.6, fat: 1.2 },
];

interface Row {
  id: number;
  ingId: string;
  grams: string;
}

const CATS = ["Fruits", "Liquids", "Protein", "Extras"] as const;

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";

let nextId = 1;

function SmoothieTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("smoothie-macros", isPro);
  const seo = getToolSeo("smoothie-macros");

  const [rows, setRows] = useState<Row[]>([
    { id: nextId++, ingId: "banana", grams: "120" },
    { id: nextId++, ingId: "milk", grams: "200" },
    { id: nextId++, ingId: "greek-yogurt", grams: "100" },
  ]);

  const totals = useMemo(() => {
    const t = { cal: 0, protein: 0, carbs: 0, fat: 0, grams: 0 };
    for (const r of rows) {
      const ing = INGREDIENTS.find((i) => i.id === r.ingId);
      const g = parseFloat(r.grams);
      if (!ing || !Number.isFinite(g) || g <= 0) continue;
      const f = g / 100;
      t.cal += ing.cal * f;
      t.protein += ing.protein * f;
      t.carbs += ing.carbs * f;
      t.fat += ing.fat * f;
      t.grams += g;
    }
    return t;
  }, [rows]);

  const setRow = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const copyRecipe = async () => {
    if (rows.length === 0 || !trial.canUse) return;
    const lines = [
      "My smoothie recipe",
      ...rows.map((r) => {
        const ing = INGREDIENTS.find((i) => i.id === r.ingId);
        return `- ${ing ? ing.name : "?"}: ${r.grams} g`;
      }),
      `Total: ${Math.round(totals.cal)} kcal | Protein ${totals.protein.toFixed(1)} g | Carbs ${totals.carbs.toFixed(1)} g | Fat ${totals.fat.toFixed(1)} g`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      trial.recordUse();
      toast.success("Recipe copied to clipboard");
    } catch {
      toast.error("Could not copy - your browser blocked clipboard access");
    }
  };

  return (
    <ToolPageShell toolId="smoothie-macros" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Smoothie Macros" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Ingredients</p>
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, { id: nextId++, ingId: INGREDIENTS![0]!.id!, grams: "100" }])}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          <div className="space-y-2.5">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <select
                  value={r.ingId}
                  onChange={(e) => setRow(r.id, { ingId: e.target.value })}
                  className={inputCls}
                  aria-label="Ingredient"
                >
                  {CATS.map((c) => (
                    <optgroup key={c} label={c}>
                      {INGREDIENTS.filter((i) => i.cat === c).map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={r.grams}
                  onChange={(e) => setRow(r.id, { grams: e.target.value })}
                  className={cn(inputCls, "w-24 shrink-0")}
                  aria-label="Amount in grams"
                />
                <span className="shrink-0 text-xs text-muted-foreground">g</span>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                  className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-500/50 hover:text-red-500"
                  aria-label="Remove ingredient"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-xs text-muted-foreground">Add an ingredient to start building.</p>
            )}
          </div>

          <ActionButton busy={false} disabled={rows.length === 0 || !trial.canUse} onClick={copyRecipe}>
            <Copy className="h-4 w-4" /> Copy recipe
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs on your device.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Macros are approximate averages per 100 g. Brands vary, especially protein powders.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {rows.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <CupSoda className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your smoothie totals appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick ingredients and amounts to see the full nutrition breakdown.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl bg-primary/5 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total calories
                </p>
                <p className="mt-1 text-3xl font-extrabold text-primary">
                  {Math.round(totals.cal)} <span className="text-lg font-semibold">kcal</span>
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground/70">
                  {Math.round(totals.grams)} g total serving
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Protein", v: totals.protein, unit: "g", cal: totals.protein * 4 },
                  { label: "Carbs", v: totals.carbs, unit: "g", cal: totals.carbs * 4 },
                  { label: "Fat", v: totals.fat, unit: "g", cal: totals.fat * 9 },
                ].map((m) => {
                  const share = totals.cal > 0 ? (m.cal / totals.cal) * 100 : 0;
                  return (
                    <div key={m.label} className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="mt-1 text-xl font-bold tabular-nums">
                        {m.v.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">{m.unit}</span>
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{Math.round(share)}% of calories</p>
                    </div>
                  );
                })}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Per ingredient</p>
                <div className="space-y-1.5">
                  {rows.map((r) => {
                    const ing = INGREDIENTS.find((i) => i.id === r.ingId);
                    const g = parseFloat(r.grams);
                    if (!ing || !Number.isFinite(g) || g <= 0) return null;
                    const f = g / 100;
                    return (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span className="font-medium">
                          {ing.name} <span className="text-muted-foreground">({g} g)</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {Math.round(ing.cal * f)} kcal
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
