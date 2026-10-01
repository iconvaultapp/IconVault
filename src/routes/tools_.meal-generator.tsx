// /tools/meal-generator - Random meal ideas with macros matched to your
// diet and calorie target, 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Dices, Flame } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/meal-generator")({
  head: () => {
    const seo = getToolSeoMeta("meal-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MealTool,
});

type Diet = "any" | "veg" | "vegan" | "high-protein" | "low-carb";

interface Meal {
  name: string;
  desc: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  diets: Diet[];
}

const DIETS: { id: Diet; label: string; desc: string }[] = [
  { id: "any", label: "Anything", desc: "No restrictions" },
  { id: "veg", label: "Vegetarian", desc: "No meat or fish" },
  { id: "vegan", label: "Vegan", desc: "No animal products" },
  { id: "high-protein", label: "High protein", desc: "35g+ protein" },
  { id: "low-carb", label: "Low carb", desc: "Under 20g carbs" },
];

const MEALS: Meal[] = [
  { name: "Grilled chicken bowl", desc: "Chicken breast, brown rice, roasted broccoli, tahini drizzle", kcal: 620, protein: 48, carbs: 45, fat: 22, diets: ["any", "high-protein"] },
  { name: "Paneer tikka wrap", desc: "Marinated paneer, peppers, onions in a whole wheat wrap", kcal: 540, protein: 28, carbs: 48, fat: 24, diets: ["any", "veg", "high-protein"] },
  { name: "Lentil dal with rice", desc: "Red lentil dal, basmati rice, spinach, lemon", kcal: 480, protein: 22, carbs: 78, fat: 6, diets: ["any", "veg", "vegan"] },
  { name: "Tofu Buddha bowl", desc: "Crispy tofu, quinoa, avocado, edamame, sesame dressing", kcal: 560, protein: 26, carbs: 52, fat: 28, diets: ["any", "veg", "vegan", "high-protein"] },
  { name: "Salmon poke bowl", desc: "Raw salmon, rice, cucumber, mango, soy-lime sauce", kcal: 590, protein: 38, carbs: 55, fat: 20, diets: ["any", "high-protein"] },
  { name: "Chickpea masala", desc: "Chickpeas in tomato-onion masala, jeera rice, raita on the side", kcal: 520, protein: 18, carbs: 75, fat: 14, diets: ["any", "veg", "vegan"] },
  { name: "Greek yogurt parfait", desc: "Greek yogurt, granola, berries, honey", kcal: 380, protein: 24, carbs: 52, fat: 8, diets: ["any", "veg"] },
  { name: "Veggie stir fry noodles", desc: "Rice noodles, bok choy, mushrooms, carrots, garlic soy glaze", kcal: 450, protein: 12, carbs: 78, fat: 10, diets: ["any", "veg", "vegan"] },
  { name: "Egg bhurji toast", desc: "Spiced scrambled eggs on sourdough with tomato and onion", kcal: 420, protein: 26, carbs: 38, fat: 18, diets: ["any", "veg"] },
  { name: "Quinoa salad", desc: "Quinoa, roasted sweet potato, kale, chickpeas, lemon tahini", kcal: 470, protein: 16, carbs: 62, fat: 18, diets: ["any", "veg", "vegan"] },
  { name: "Chicken curry rice", desc: "Home-style chicken curry with steamed rice and salad", kcal: 650, protein: 42, carbs: 60, fat: 22, diets: ["any", "high-protein"] },
  { name: "Zucchini egg frittata", desc: "Frittata with zucchini, mushrooms, feta and herbs", kcal: 320, protein: 22, carbs: 8, fat: 22, diets: ["any", "veg", "low-carb", "high-protein"] },
  { name: "Cauliflower rice biryani", desc: "Cauliflower rice biryani with paneer and mint raita", kcal: 380, protein: 20, carbs: 16, fat: 24, diets: ["any", "veg", "low-carb"] },
  { name: "Oatmeal power bowl", desc: "Oats, banana, peanut butter, chia seeds, dark chocolate", kcal: 460, protein: 16, carbs: 64, fat: 16, diets: ["any", "veg", "vegan"] },
  { name: "Sprout chaat", desc: "Sprouted moong chaat with onion, tomato, lemon, coriander", kcal: 220, protein: 14, carbs: 30, fat: 4, diets: ["any", "veg", "vegan"] },
  { name: "Tuna salad lettuce cups", desc: "Tuna salad in butter lettuce cups with celery and mayo", kcal: 280, protein: 34, carbs: 6, fat: 14, diets: ["any", "low-carb", "high-protein"] },
  { name: "Mushroom risotto", desc: "Creamy mushroom risotto with parmesan and thyme", kcal: 580, protein: 16, carbs: 72, fat: 24, diets: ["any", "veg"] },
  { name: "Black bean burrito bowl", desc: "Black beans, cilantro rice, corn, salsa, guacamole", kcal: 610, protein: 22, carbs: 88, fat: 20, diets: ["any", "veg", "vegan"] },
  { name: "Grilled fish tacos", desc: "Grilled fish tacos with cabbage slaw and chipotle crema", kcal: 480, protein: 36, carbs: 42, fat: 16, diets: ["any", "high-protein"] },
  { name: "Cottage cheese bowl", desc: "Cottage cheese, cucumber, tomato, flax seeds, olive oil", kcal: 300, protein: 26, carbs: 12, fat: 16, diets: ["any", "veg", "low-carb", "high-protein"] },
];

const CALORIE_TARGETS = [300, 400, 500, 600, 700, 800];

function MealTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("meal-generator", isPro);
  const seo = getToolSeo("meal-generator");

  const [diet, setDiet] = useState<Diet>("any");
  const [target, setTarget] = useState(500);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [rolls, setRolls] = useState(0);

  const roll = () => {
    const pool = MEALS.filter((m) => (diet === "high-protein" ? m.protein >= 35 : m.diets.includes(diet)));
    const within = pool.filter((m) => Math.abs(m.kcal - target) <= 150);
    const pick = (within.length ? within : pool);
    if (!pick.length) {
      toast.error("No meals match that diet.");
      return;
    }
    setMeal(pick[Math.floor(Math.random() * pick.length)]!);
    setRolls((r) => r + 1);
    trial.recordUse();
  };

  const copy = async () => {
    if (!meal) return;
    const text = `${meal.name}: ${meal.desc} (${meal.kcal} kcal | P ${meal.protein}g / C ${meal.carbs}g / F ${meal.fat}g)`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Meal copied");
    } catch {
      toast.error("Copy failed. Your browser blocked clipboard access.");
    }
  };

  const kcalDiff = meal ? meal.kcal - target : 0;

  return (
    <ToolPageShell toolId="meal-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Meal Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Diet</p>
            <div className="space-y-2">
              {DIETS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDiet(d.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                    diet === d.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("text-sm font-semibold", diet === d.id && "text-primary")}>{d.label}</span>
                  <span className="text-xs text-muted-foreground">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">
              Calorie target: <span className="font-bold text-foreground">{target} kcal</span>
            </label>
            <input
              type="range"
              min={300}
              max={800}
              step={50}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              {CALORIE_TARGETS.map((c) => (
                <button key={c} type="button" onClick={() => setTarget(c)} className={cn("hover:text-foreground", target === c && "font-bold text-primary")}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <ActionButton onClick={roll}>
            <Dices className="h-4 w-4" /> {meal ? "Re-roll" : "Suggest a meal"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Suggestions stay within roughly 150 kcal of your target when possible. {rolls > 0 && `${rolls} roll${rolls === 1 ? "" : "s"} so far.`}
          </p>
        </div>

        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
          {!meal ? (
            <div>
              <p className="text-lg font-semibold">What is for dinner?</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a diet and calorie target, then hit Suggest a meal for a random idea with full macros.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-lg text-left">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {DIETS.find((d) => d.id === diet)?.label}
                  </p>
                  <h2 className="mt-1 text-3xl font-bold">{meal.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{meal.desc}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-sm font-bold text-orange-600">
                  <Flame className="h-4 w-4" /> {meal.kcal} kcal
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Protein", value: meal.protein, unit: "g" },
                  { label: "Carbs", value: meal.carbs, unit: "g" },
                  { label: "Fat", value: meal.fat, unit: "g" },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold">{m.value}<span className="text-sm font-medium text-muted-foreground">{m.unit}</span></p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>

              <p className={cn(
                "mt-3 text-sm",
                Math.abs(kcalDiff) <= 150 ? "text-emerald-600" : "text-amber-600",
              )}>
                {kcalDiff === 0
                  ? "Exactly on your calorie target."
                  : kcalDiff > 0
                    ? `${kcalDiff} kcal over your target.`
                    : `${-kcalDiff} kcal under your target.`}
              </p>

              <div className="mt-6 flex gap-2">
                <ActionButton onClick={roll}>
                  <Dices className="h-4 w-4" /> Re-roll
                </ActionButton>
                <ActionButton onClick={copy}>
                  <Copy className="h-4 w-4" /> Copy
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
