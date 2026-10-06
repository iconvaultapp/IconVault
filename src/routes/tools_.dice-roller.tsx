// /tools/dice-roller - RPG dice roller with modifiers, animation and roll history.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Dices, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/dice-roller";
import toolSeoMeta from "@/lib/tool-seo-meta-data/dice-roller";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/dice-roller")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/dice-roller";
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
  component: DiceRollerTool,
});

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;
const HISTORY_KEY = "iconvault-dice-history";

type Roll = {
  id: number;
  sides: number;
  count: number;
  mod: number;
  rolls: number[];
  total: number;
  time: string;
};

function loadHistory(): Roll[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Roll[]) : [];
  } catch {
    return [];
  }
}

function rollDie(sides: number) {
  return 1 + Math.floor(Math.random() * sides);
}

function formatRoll(r: Roll) {
  const modPart = r.mod === 0 ? "" : r.mod > 0 ? `+${r.mod}` : `${r.mod}`;
  return `${r.count}d${r.sides}${modPart}: [${r.rolls.join(", ")}] = ${r.total}`;
}

function DiceRollerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("dice-roller", isPro);
  const seo = toolSeo;

  const [sides, setSides] = useState<number>(20);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState<number[]>([]);
  const [last, setLast] = useState<Roll | null>(null);
  const [history, setHistory] = useState<Roll[]>(() =>
    typeof window === "undefined" ? [] : loadHistory(),
  );

  const animRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (animRef.current !== null) window.clearInterval(animRef.current);
    },
    [],
  );

  const roll = useCallback(() => {
    if (rolling || !trial.canUse) return;
    trial.recordUse();
    setRolling(true);
    setLast(null);
    const anim = window.setInterval(() => {
      setDisplay(Array.from({ length: count }, () => rollDie(sides)));
    }, 70);
    animRef.current = anim;
    window.setTimeout(() => {
      window.clearInterval(anim);
      animRef.current = null;
      const rolls = Array.from({ length: count }, () => rollDie(sides));
      const total = rolls.reduce((a, b) => a + b, 0) + mod;
      const entry: Roll = {
        id: Date.now(),
        sides,
        count,
        mod,
        rolls,
        total,
        time: new Date().toLocaleTimeString(),
      };
      setDisplay(rolls);
      setLast(entry);
      setRolling(false);
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 30);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* storage full */ }
        return next;
      });
    }, 750);
  }, [rolling, trial, count, sides, mod]);

  const copyRoll = useCallback(async () => {
    if (!last) return;
    try {
      await navigator.clipboard.writeText(formatRoll(last));
      toast.success("Roll copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [last]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    toast.success("History cleared");
  }, []);

  const modLabel = mod === 0 ? "+0" : mod > 0 ? `+${mod}` : `${mod}`;
  const total = display.length > 0 ? display.reduce((a, b) => a + b, 0) + mod : null;

  return (
    <ToolPageShell toolId="dice-roller" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Dice Roller" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Choose your dice</p>
            <div className="flex flex-wrap gap-2">
              {DICE.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSides(d)}
                  className={cn(
                    "min-w-[64px] rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                    sides === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  d{d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Dice count</p>
              <input
                type="range"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Number of dice"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span className="font-bold text-foreground">{count}</span>
                <span>20</span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Modifier</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={-20}
                  max={20}
                  value={mod}
                  onChange={(e) => setMod(Number(e.target.value))}
                  className="w-full accent-primary"
                  aria-label="Modifier"
                />
                <span className="w-12 text-right text-sm font-bold text-foreground">{modLabel}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Added to the total after the roll.</p>
            </div>
          </div>

          {/* Result */}
          <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl bg-muted/50 p-6">
            {display.length === 0 && !rolling ? (
              <p className="text-sm text-muted-foreground">Pick your dice and roll. d20 is the classic.</p>
            ) : (
              <>
                <div className={cn("flex flex-wrap justify-center gap-2", rolling && "opacity-70")}>
                  {display.map((v, i) => (
                    <div
                      key={i}
                      className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-card text-xl font-black text-primary"
                    >
                      {v}
                    </div>
                  ))}
                </div>
                {total !== null && (
                  <p className="text-lg font-bold text-foreground">
                    Total <span className="text-2xl text-primary">{total}</span>
                    <span className="ml-2 text-sm font-semibold text-muted-foreground">
                      {count}d{sides}{mod === 0 ? "" : mod > 0 ? `+${mod}` : mod}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton busy={rolling} disabled={!trial.canUse} onClick={roll}>
              <Dices className="h-4 w-4" /> {rolling ? "Rolling…" : "Roll"}
            </ActionButton>
            {last && !rolling && (
              <button
                type="button"
                onClick={copyRoll}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground transition hover:border-primary/40"
              >
                <Copy className="h-4 w-4" /> Copy roll
              </button>
            )}
            {!isPro && (
              <p className="ml-auto text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free rolls left.
              </p>
            )}
          </div>
        </div>

        <div className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Roll history</h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rolls yet. Your results land here.</p>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 12).map((r) => (
                <li key={r.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{r.total}</span>
                    <span className="text-xs text-muted-foreground">{r.time}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.count}d{r.sides}{r.mod === 0 ? "" : r.mod > 0 ? `+${r.mod}` : r.mod} {`[${r.rolls.join(", ")}]`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">History stays in your browser only.</p>
        </div>
      </div>
    </ToolPageShell>
  );
}
