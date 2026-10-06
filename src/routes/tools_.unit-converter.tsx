// /tools/unit-converter - Convert length, mass, volume, temperature,
// speed, area, time and data with live results and swap. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/unit-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/unit-converter";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/unit-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/unit-converter";
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
  component: UnitConverterTool,
});

interface Unit {
  label: string;
  symbol: string;
  toBase: number; // multiply by this to get base unit
}

interface Category {
  id: string;
  name: string;
  base: string;
  units: Unit[];
  temp?: boolean;
}

const CATEGORIES: Category[] = [
  {
    id: "length", name: "Length", base: "m", units: [
      { label: "Millimeter", symbol: "mm", toBase: 0.001 },
      { label: "Centimeter", symbol: "cm", toBase: 0.01 },
      { label: "Meter", symbol: "m", toBase: 1 },
      { label: "Kilometer", symbol: "km", toBase: 1000 },
      { label: "Inch", symbol: "in", toBase: 0.0254 },
      { label: "Foot", symbol: "ft", toBase: 0.3048 },
      { label: "Yard", symbol: "yd", toBase: 0.9144 },
      { label: "Mile", symbol: "mi", toBase: 1609.344 },
    ],
  },
  {
    id: "mass", name: "Mass", base: "kg", units: [
      { label: "Milligram", symbol: "mg", toBase: 0.000001 },
      { label: "Gram", symbol: "g", toBase: 0.001 },
      { label: "Kilogram", symbol: "kg", toBase: 1 },
      { label: "Metric ton", symbol: "t", toBase: 1000 },
      { label: "Ounce", symbol: "oz", toBase: 0.028349523125 },
      { label: "Pound", symbol: "lb", toBase: 0.45359237 },
    ],
  },
  {
    id: "volume", name: "Volume", base: "L", units: [
      { label: "Milliliter", symbol: "mL", toBase: 0.001 },
      { label: "Liter", symbol: "L", toBase: 1 },
      { label: "Cubic meter", symbol: "m3", toBase: 1000 },
      { label: "Teaspoon (US)", symbol: "tsp", toBase: 0.00492892159375 },
      { label: "Tablespoon (US)", symbol: "tbsp", toBase: 0.01478676478125 },
      { label: "Fluid ounce (US)", symbol: "fl oz", toBase: 0.0295735295625 },
      { label: "Cup (US)", symbol: "cup", toBase: 0.2365882365 },
      { label: "Pint (US)", symbol: "pt", toBase: 0.473176473 },
      { label: "Quart (US)", symbol: "qt", toBase: 0.946352946 },
      { label: "Gallon (US)", symbol: "gal", toBase: 3.785411784 },
    ],
  },
  {
    id: "temperature", name: "Temperature", base: "C", temp: true, units: [
      { label: "Celsius", symbol: "C", toBase: 1 },
      { label: "Fahrenheit", symbol: "F", toBase: 1 },
      { label: "Kelvin", symbol: "K", toBase: 1 },
    ],
  },
  {
    id: "speed", name: "Speed", base: "m/s", units: [
      { label: "Meter / second", symbol: "m/s", toBase: 1 },
      { label: "Kilometer / hour", symbol: "km/h", toBase: 1 / 3.6 },
      { label: "Mile / hour", symbol: "mph", toBase: 0.44704 },
      { label: "Knot", symbol: "kn", toBase: 0.5144444444444445 },
      { label: "Foot / second", symbol: "ft/s", toBase: 0.3048 },
    ],
  },
  {
    id: "area", name: "Area", base: "m2", units: [
      { label: "Square centimeter", symbol: "cm2", toBase: 0.0001 },
      { label: "Square meter", symbol: "m2", toBase: 1 },
      { label: "Hectare", symbol: "ha", toBase: 10000 },
      { label: "Square kilometer", symbol: "km2", toBase: 1000000 },
      { label: "Square foot", symbol: "ft2", toBase: 0.09290304 },
      { label: "Square yard", symbol: "yd2", toBase: 0.83612736 },
      { label: "Acre", symbol: "acre", toBase: 4046.8564224 },
      { label: "Square mile", symbol: "mi2", toBase: 2589988.110336 },
    ],
  },
  {
    id: "time", name: "Time", base: "s", units: [
      { label: "Millisecond", symbol: "ms", toBase: 0.001 },
      { label: "Second", symbol: "s", toBase: 1 },
      { label: "Minute", symbol: "min", toBase: 60 },
      { label: "Hour", symbol: "h", toBase: 3600 },
      { label: "Day", symbol: "day", toBase: 86400 },
      { label: "Week", symbol: "week", toBase: 604800 },
    ],
  },
  {
    id: "data", name: "Data", base: "B", units: [
      { label: "Bit", symbol: "bit", toBase: 0.125 },
      { label: "Byte", symbol: "B", toBase: 1 },
      { label: "Kilobyte", symbol: "KB", toBase: 1000 },
      { label: "Megabyte", symbol: "MB", toBase: 1000000 },
      { label: "Gigabyte", symbol: "GB", toBase: 1000000000 },
      { label: "Terabyte", symbol: "TB", toBase: 1000000000000 },
      { label: "Kibibyte", symbol: "KiB", toBase: 1024 },
      { label: "Mebibyte", symbol: "MiB", toBase: 1048576 },
    ],
  },
];

function convertTemp(value: number, from: string, to: string): number {
  let c: number;
  if (from === "C") c = value;
  else if (from === "F") c = ((value - 32) * 5) / 9;
  else c = value - 273.15;
  if (to === "C") return c;
  if (to === "F") return (c * 9) / 5 + 32;
  return c + 273.15;
}

function formatNum(n: number): string {
  if (!isFinite(n)) return "-";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(6).replace(/(\.\d*?)0+e/, "$1e");
  return String(Number(n.toPrecision(10)));
}

const selectCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

function UnitConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("unit-converter", isPro);
  const seo = toolSeo;

  const [catId, setCatId] = useState("length");
  const [value, setValue] = useState("1");
  const [fromIdx, setFromIdx] = useState(2); // m
  const [toIdx, setToIdx] = useState(5); // ft

  const cat = CATEGORIES.find((c) => c.id === catId) ?? CATEGORIES[0];

  const pickCat = (id: string) => {
    setCatId(id);
    setFromIdx(0);
    setToIdx(Math.min(1, (CATEGORIES.find((c) => c.id === id)?.units.length ?? 2) - 1));
  };

  const result = useMemo(() => {
    const v = parseFloat(value);
    if (!isFinite(v)) return null;
    const from = cat!.units[fromIdx];
    const to = cat!.units[toIdx];
    if (!from || !to) return null;
    if (cat!.temp) return convertTemp(v, from.symbol, to.symbol);
    return (v * from.toBase) / to.toBase;
  }, [value, cat, fromIdx, toIdx]);

  const swap = () => {
    setFromIdx(toIdx);
    setToIdx(fromIdx);
  };

  const copyResult = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    if (result === null) {
      toast.error("Enter a value first.");
      return;
    }
    const from = cat!.units[fromIdx];
    const to = cat!.units[toIdx];
    try {
      await navigator.clipboard.writeText(`${value} ${from!.symbol} = ${formatNum(result)} ${to!.symbol}`);
      trial.recordUse();
      toast.success("Result copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="unit-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Unit Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-2 text-[13px] font-medium text-foreground/80">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCat(c.id)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                  catId === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          {!isPro && (
            <p className="mt-4 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="uc-value">Value</label>
            <input
              id="uc-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-lg outline-none focus:border-primary"
            />
          </div>

          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="uc-from">From</label>
              <select id="uc-from" value={fromIdx} onChange={(e) => setFromIdx(Number(e.target.value))} className={selectCls}>
                {cat!.units.map((u, i) => (
                  <option key={u.symbol} value={i}>{u.label} ({u.symbol})</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={swap}
              className="mx-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
              aria-label="Swap units"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="uc-to">To</label>
              <select id="uc-to" value={toIdx} onChange={(e) => setToIdx(Number(e.target.value))} className={selectCls}>
                {cat!.units.map((u, i) => (
                  <option key={u.symbol} value={i}>{u.label} ({u.symbol})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
            {result === null ? (
              <p className="text-sm text-muted-foreground">Enter a value to convert.</p>
            ) : (
              <>
                <p className="font-mono text-4xl font-bold text-primary">{formatNum(result)}</p>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {value} {cat!.units[fromIdx]?.symbol} = {cat!.units[toIdx]?.symbol}
                </p>
              </>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={copyResult}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
            >
              <ClipboardCopy className="h-4 w-4" /> Copy result
            </button>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">All units in {cat!.name.toLowerCase()}</p>
            <div className="max-h-[220px] overflow-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <tbody className="font-mono">
                  {cat!.units.map((u) => {
                    const v = parseFloat(value);
                    let r: number | null = null;
                    if (isFinite(v)) {
                      r = cat!.temp ? convertTemp(v, cat!.units![fromIdx]!.symbol!, u.symbol) : (v * cat!.units![fromIdx]!.toBase!) / u.toBase;
                    }
                    return (
                      <tr key={u.symbol} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pl-3 pr-4 text-muted-foreground">{u.label}</td>
                        <td className="py-1.5 pr-3 text-right font-bold">{r === null ? "-" : formatNum(r)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
