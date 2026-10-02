// /tools/freeze-time-guide - Pick a food and get its freezer life, quality
// notes, and a use-by date from your freeze date. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Copy, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/freeze-time-guide")({
  head: () => {
    const seo = getToolSeoMeta("freeze-time-guide");
    const canonical = "https://iconvault.site/tools/freeze-time-guide";
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
  component: FreezeTool,
});

interface Food {
  name: string;
  months: number;
  note: string;
}

// Freezer-life months are quality guidelines, not safety deadlines.
const FOODS: Food[] = [
  { name: "Chicken breasts (raw)", months: 9, note: "Wrap airtight; freezer burn dries the surface first." },
  { name: "Ground beef (raw)", months: 4, note: "Flatten packs to freeze and thaw faster." },
  { name: "Beef steaks (raw)", months: 12, note: "Quality holds well; thaw in the fridge overnight." },
  { name: "Pork chops (raw)", months: 6, note: "Best within 6 months; flavor fades after that." },
  { name: "Bacon (raw)", months: 1, note: "Short life due to high fat and salt; freeze in portions." },
  { name: "Sausage (raw)", months: 2, note: "Seasoning dulls with time; use quickly." },
  { name: "Ham, whole (cooked)", months: 12, note: "Sliced ham is better used within 2 months." },
  { name: "Turkey, whole (raw)", months: 12, note: "Keep at 0 F; large birds thaw slowly, plan ahead." },
  { name: "Fish fillets, lean (raw)", months: 8, note: "Cod, haddock and tilapia keep well; avoid air pockets." },
  { name: "Salmon (raw)", months: 3, note: "Oily fish lose flavor faster than lean fish." },
  { name: "Shrimp (raw)", months: 6, note: "Freeze in a single layer, then bag." },
  { name: "Bread (sliced)", months: 3, note: "Toast directly from frozen; staleness returns fast after thaw." },
  { name: "Butter", months: 9, note: "Freezes beautifully; wrap to block odors." },
  { name: "Milk", months: 6, note: "Leave headroom to expand; shake well after thawing." },
  { name: "Hard cheese", months: 6, note: "Texture turns crumbly; grate after thawing for cooking." },
  { name: "Ice cream", months: 4, note: "Press wrap on the surface to stop ice crystals." },
  { name: "Pizza (frozen store-bought)", months: 2, note: "Keep the box sealed; quality drops once opened." },
  { name: "Berries (fresh)", months: 12, note: "Freeze on a tray first so they do not clump." },
  { name: "Bananas", months: 3, note: "Peel and slice first; perfect for smoothies." },
  { name: "Vegetables, blanched", months: 12, note: "Blanching before freezing protects color and texture." },
  { name: "Corn (kernels)", months: 12, note: "One of the best keepers in the freezer." },
  { name: "Peas", months: 12, note: "Spread flat in bags for easy scooping." },
  { name: "Soup / stew (cooked)", months: 3, note: "Cool fully first; leave room to expand." },
  { name: "Casserole (cooked)", months: 3, note: "Dairy-heavy casseroles may separate; stir after reheating." },
  { name: "Cooked rice", months: 6, note: "Portion into flat bags for quick weeknight thawing." },
  { name: "Cooked pasta", months: 2, note: "Slightly undercook before freezing; sauce freezes better than plain." },
  { name: "Pizza dough", months: 3, note: "Oil the surface and bag tightly; thaw in the fridge." },
  { name: "Cookie dough", months: 3, note: "Scoop into balls and freeze; bake from frozen, adding minutes." },
  { name: "Muffins (baked)", months: 3, note: "Wrap individually to avoid drying out." },
  { name: "Pancakes (cooked)", months: 3, note: "Layer with parchment so they separate easily." },
  { name: "Leftovers with meat", months: 3, note: "Label with the date; reheat to steaming hot throughout." },
  { name: "Gravy", months: 3, note: "Whisk while reheating to bring it back together." },
  { name: "Eggs, beaten (no shell)", months: 12, note: "Never freeze eggs in the shell; add a pinch of salt per cup." },
  { name: "Nuts", months: 12, note: "Freezing slows rancidity in high-fat nuts." },
  { name: "Coffee beans", months: 3, note: "Grind just before brewing; moisture is the enemy." },
  { name: "Flour", months: 24, note: "Seal well; whole-grain flours benefit most." },
  { name: "Fresh herbs in oil", months: 6, note: "Freeze in ice-cube trays for single-use portions." },
  { name: "Baby food (homemade)", months: 3, note: "Use trays, then transfer cubes to labeled bags." },
  { name: "Breast milk", months: 6, note: "Best within 6 months at 0 F; thaw in the fridge." },
];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function FreezeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("freeze-time-guide", isPro);
  const seo = getToolSeo("freeze-time-guide");

  const [foodName, setFoodName] = useState(FOODS![0]!.name!);
  const [qty, setQty] = useState("2");
  const [freezeDate, setFreezeDate] = useState(todayISO);

  const result = useMemo(() => {
    const food = FOODS.find((f) => f.name === foodName) ?? FOODS[0];
    const d = new Date(`${freezeDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const useBy = new Date(d);
    useBy.setMonth(useBy.getMonth() + food!.months);
    return {
      food,
      useBy,
      useByStr: useBy.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    };
  }, [foodName, freezeDate]);

  const copyResult = async () => {
    if (!result || !trial.canUse) return;
    const q = parseFloat(qty);
    const text =
      `Freezer guide: ${result.food!.name}\n` +
      (Number.isFinite(q) && q > 0 ? `Quantity: ${qty}\n` : "") +
      `Freezer life: about ${result.food!.months} month${result.food!.months === 1 ? "" : "s"}\n` +
      `Frozen on: ${freezeDate} -> use by: ${result.useByStr}\n` +
      `Quality note: ${result.food!.note}`;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Use-by summary copied to clipboard");
    } catch {
      toast.error("Could not copy - your browser blocked clipboard access");
    }
  };

  return (
    <ToolPageShell toolId="freeze-time-guide" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Freeze Time Guide" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Food</label>
            <select value={foodName} onChange={(e) => setFoodName(e.target.value)} className={inputCls}>
              {FOODS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Quantity</label>
              <input type="text" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} placeholder="e.g. 2 packs" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Freeze date</label>
              <input type="date" value={freezeDate} onChange={(e) => setFreezeDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <ActionButton busy={false} disabled={!result || !trial.canUse} onClick={copyResult}>
            <Copy className="h-4 w-4" /> Copy use-by summary
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs on your device.
            </p>
          )}

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Honest note</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              These are quality guidelines, not safety deadlines. They assume a freezer that truly
              holds 0 F (-18 C). A warmer freezer shortens every number here, so check your freezer
              temperature and when in doubt, throw it out.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Snowflake className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Pick a food and a freeze date</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                This tool works out when quality starts to drop and gives you a use-by date.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl bg-primary/5 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Use by
                </p>
                <p className="mt-1 text-3xl font-extrabold text-primary">{result.useByStr}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground/70">
                  {result.food!.name} - about {result.food!.months} month
                  {result.food!.months === 1 ? "" : "s"} of peak quality
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Quality tip</p>
                  <p className="mt-1 text-sm text-muted-foreground">{result.food!.note}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">How quality fades for this food</p>
                <div className="relative pl-5">
                  <div className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />
                  {[
                    { label: "Day 1", text: "Peak quality - freeze it in airtight, portion-sized packs." },
                    { label: `~${Math.max(1, Math.round(result.food!.months / 2))} months`, text: "Still good - minor texture or flavor changes may start." },
                    { label: `${result.food!.months} months`, text: "Use-by date - cook it now rather than re-freezing quality." },
                  ].map((s) => (
                    <div key={s.label} className="relative pb-4 last:pb-0">
                      <span className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-sm font-bold">{s.label}</p>
                      <p className="text-sm text-muted-foreground">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                These timings are general guidelines compiled from common food-storage references.
                Packaging quality matters as much as time: air is what causes freezer burn.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
