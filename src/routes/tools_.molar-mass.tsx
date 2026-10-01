// /tools/molar-mass - Parse a chemical formula and get its molar mass plus
// the mass share of every element. 100% in-browser, no upload.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/molar-mass")({
  head: () => {
    const seo = getToolSeoMeta("molar-mass");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MolarMassTool,
});

// Standard atomic weights (g/mol)
const MASSES: Record<string, number> = {
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06,
  Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.630,
  As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224,
  Nb: 92.906, Mo: 95.95, Tc: 98, Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41,
  In: 114.82, Sn: 118.71, Sb: 121.76, Te: 127.60, I: 126.90, Xe: 131.29, Cs: 132.91, Ba: 137.33,
  La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24, Pm: 145, Sm: 150.36, Eu: 151.96, Gd: 157.25,
  Tb: 158.93, Dy: 162.50, Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05, Lu: 174.97, Hf: 178.49,
  Ta: 180.95, W: 183.84, Re: 186.21, Os: 190.23, Ir: 192.22, Pt: 195.08, Au: 196.97, Hg: 200.59,
  Tl: 204.38, Pb: 207.2, Bi: 208.98, Po: 209, At: 210, Rn: 222, Fr: 223, Ra: 226, Ac: 227,
  Th: 232.04, Pa: 231.04, U: 238.03,
};

interface ElementRow {
  symbol: string;
  count: number;
  mass: number;
  pct: number;
}

interface ParseResult {
  total: number;
  rows: ElementRow[];
}

/** Hand-written stack-based formula parser. Handles nested parentheses and multipliers. */
function parseFormula(raw: string): ParseResult {
  const s = raw.replace(/\s+/g, "");
  if (!s) throw new Error("Enter a formula like H2SO4 or Ca(OH)2.");
  const stack: Map<string, number>[] = [new Map()];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === "(") {
      stack.push(new Map());
      i++;
    } else if (ch === ")") {
      i++;
      let num = "";
      while (i < s.length && /\d/.test(s![i]!)) num += s[i++];
      const mult = num ? parseInt(num, 10) : 1;
      if (mult < 1) throw new Error("Invalid multiplier after parenthesis.");
      if (stack.length < 2) throw new Error("Unmatched closing parenthesis.");
      const grp = stack.pop()!;
      const top = stack[stack.length - 1]!;
      for (const [el, c] of grp) top.set(el, (top.get(el) ?? 0) + c * mult);
    } else if (/[A-Z]/.test(ch)) {
      let el = ch;
      i++;
      if (i < s.length && /[a-z]/.test(s![i]!)) {
        el += s[i];
        i++;
      }
      if (!(el in MASSES)) throw new Error(`Unknown element symbol: ${el}.`);
      let num = "";
      while (i < s.length && /\d/.test(s![i]!)) num += s[i++];
      const mult = num ? parseInt(num, 10) : 1;
      if (mult < 1) throw new Error(`Invalid count after ${el}.`);
      const top = stack[stack.length - 1]!;
      top.set(el, (top.get(el) ?? 0) + mult);
    } else {
      throw new Error(`Unexpected character: ${ch}. Use element symbols, numbers and ( ).`);
    }
  }
  if (stack.length !== 1) throw new Error("Unmatched opening parenthesis.");
  const counts = stack[0]!;
  if (counts.size === 0) throw new Error("Enter a formula like H2SO4 or Ca(OH)2.");
  let total = 0;
  const rows: ElementRow[] = [];
  for (const [symbol, count] of counts) {
    const mass = MASSES![symbol]! * count;
    total += mass;
    rows.push({ symbol, count, mass, pct: 0 });
  }
  for (const r of rows) r.pct = (r.mass / total) * 100;
  rows.sort((a, b) => b.mass - a.mass);
  return { total, rows };
}

const EXAMPLES = ["H2SO4", "Ca(OH)2", "C6H12O6", "NaCl", "CuSO4(H2O)5"];

function MolarMassTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("molar-mass", isPro);
  const seo = getToolSeo("molar-mass");

  const [formula, setFormula] = useState("H2SO4");

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: parseFormula(formula) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not parse formula." };
    }
  }, [formula]);

  const copyResult = async () => {
    if (!parsed.ok || !trial.canUse) return;
    const lines = [
      `Molar mass of ${formula.trim()}: ${parsed.value.total.toFixed(3)} g/mol`,
      `Element composition:`,
      ...parsed.value.rows.map(
        (r) => `${r.symbol}: ${r.count} atom(s), ${r.mass.toFixed(3)} g/mol (${r.pct.toFixed(2)}%)`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      trial.recordUse();
      toast.success("Composition copied to clipboard");
    } catch {
      toast.error("Could not copy - your browser blocked clipboard access");
    }
  };

  return (
    <ToolPageShell toolId="molar-mass" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Molar Mass Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Chemical formula
            </label>
            <input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary/60"
              placeholder="e.g. H2SO4"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Use element symbols with subscripts as plain numbers, and parentheses for groups:
              Ca(OH)2.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setFormula(ex)}
                  className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={false} disabled={!parsed.ok || !trial.canUse} onClick={copyResult}>
            <Copy className="h-4 w-4" /> Copy result
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs on your device.
            </p>
          )}
          {!parsed.ok && <p className="text-sm font-medium text-red-500">{parsed.error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!parsed.ok ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FlaskConical className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Fix the formula to see the breakdown</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{parsed.error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl bg-primary/5 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Molar mass of <span className="font-mono normal-case">{formula.trim()}</span>
                </p>
                <p className="mt-1 text-3xl font-extrabold text-primary">
                  {parsed.value.total.toFixed(3)}{" "}
                  <span className="text-lg font-semibold">g/mol</span>
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Element composition</p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left">
                        <th className="px-4 py-2.5 font-semibold">Element</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Atoms</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Mass (g/mol)</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Mass share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.value.rows.map((r) => (
                        <tr key={r.symbol} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 font-mono font-bold">{r.symbol}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{r.count}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{r.mass.toFixed(3)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            <span className="mr-2 inline-block h-2 w-16 overflow-hidden rounded-full bg-muted align-middle">
                              <span
                                className="block h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, r.pct)}%` }}
                              />
                            </span>
                            {r.pct.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Based on standard atomic weights. Percentages are mass fractions of one mole.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
