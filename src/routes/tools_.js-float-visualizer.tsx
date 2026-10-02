// /tools/js-float-visualizer - IEEE 754 bit-level explorer: click individual
// sign / exponent / mantissa bits of a double or float, see the exact decimal
// value, neighbors and the famous 0.1 + 0.2 demo. Runs in your browser.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, FlaskConical, Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-float-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("js-float-visualizer");
    const canonical = "https://iconvault.site/tools/js-float-visualizer";
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
  component: FloatTool,
});

/* ---------------- IEEE 754 core ---------------- */

type Prec = "f64" | "f32";
const CONF = {
  f64: { bits: 64, ebits: 11, mbits: 52, bias: 1023, label: "binary64 (double)" },
  f32: { bits: 32, ebits: 8, mbits: 23, bias: 127, label: "binary32 (float)" },
} as const;

function bitsOf(v: number, prec: Prec): bigint {
  const dv = new DataView(new ArrayBuffer(8));
  if (prec === "f64") {
    dv.setFloat64(0, v);
    return dv.getBigUint64(0);
  }
  dv.setFloat32(0, v);
  return BigInt(dv.getUint32(0));
}

function valueOfBits(b: bigint, prec: Prec): number {
  const dv = new DataView(new ArrayBuffer(8));
  if (prec === "f64") {
    dv.setBigUint64(0, b);
    return dv.getFloat64(0);
  }
  dv.setUint32(0, Number(b));
  return dv.getFloat32(0);
}

type Kind = "zero" | "denormal" | "normal" | "inf" | "nan";

function decode(bits: bigint, prec: Prec): { sign: number; expRaw: number; mant: bigint; kind: Kind } {
  const c = CONF[prec];
  const sign = Number((bits >> BigInt(c.bits - 1)) & 1n);
  const expRaw = Number((bits >> BigInt(c.mbits)) & ((1n << BigInt(c.ebits)) - 1n));
  const mant = bits & ((1n << BigInt(c.mbits)) - 1n);
  const maxExp = (1 << c.ebits) - 1;
  let kind: Kind = "normal";
  if (expRaw === maxExp) kind = mant === 0n ? "inf" : "nan";
  else if (expRaw === 0) kind = mant === 0n ? "zero" : "denormal";
  return { sign, expRaw, mant, kind };
}

/** Exact decimal expansion of num / 2^pow2. */
function fracToDecimal(num: bigint, pow2: number): string {
  const digits = (num * 5n ** BigInt(pow2)).toString().padStart(pow2 + 1, "0");
  const intPart = digits.slice(0, digits.length - pow2);
  const frac = digits.slice(digits.length - pow2).replace(/0+$/, "");
  return frac ? `${intPart}.${frac}` : intPart;
}

function exactDecimal(bits: bigint, prec: Prec): string {
  const c = CONF[prec];
  const { sign, expRaw, mant, kind } = decode(bits, prec);
  const neg = sign === 1 ? "-" : "";
  if (kind === "inf") return `${neg}Infinity`;
  if (kind === "nan") return "NaN";
  if (kind === "zero") return `${neg}0`;
  if (kind === "denormal") return neg + fracToDecimal(mant, c.bias + c.mbits - 1);
  const num = (1n << BigInt(c.mbits)) + mant;
  const exp2 = expRaw - c.bias - c.mbits;
  if (exp2 >= 0) return neg + (num << BigInt(exp2)).toString();
  return neg + fracToDecimal(num, -exp2);
}

function bitAt(bits: bigint, prec: Prec, msbIndex: number): boolean {
  const lsb = CONF[prec].bits - 1 - msbIndex;
  return ((bits >> BigInt(lsb)) & 1n) === 1n;
}

function bitsToGroups(bits: bigint, prec: Prec): { sign: string; exp: string; mant: string } {
  const c = CONF[prec];
  const full = bits.toString(2).padStart(c.bits, "0");
  return {
    sign: full.slice(0, 1),
    exp: full.slice(1, 1 + c.ebits),
    mant: full.slice(1 + c.ebits),
  };
}

/* ---------------- demo data ---------------- */

interface DemoStep {
  title: string;
  text: string;
  bits: bigint;
  exact: string;
}

function buildDemo(): DemoStep[] {
  const b1 = bitsOf(0.1, "f64");
  const b2 = bitsOf(0.2, "f64");
  const d1 = decode(b1, "f64");
  const d2 = decode(b2, "f64");
  const num1 = (1n << 52n) + d1.mant;
  const num2 = (1n << 52n) + d2.mant;
  const sumExact = fracToDecimal((num1 << BigInt(d1.expRaw - 1)) + (num2 << BigInt(d2.expRaw - 1)), 1074);
  const sumBits = bitsOf(0.1 + 0.2, "f64");
  return [
    {
      title: "0.1 cannot be stored exactly",
      text: "0.1 in binary is 0.0001100110011... repeating forever. A double keeps the closest 53 significant bits, which is very slightly more than 0.1. This is the exact value actually stored:",
      bits: b1,
      exact: exactDecimal(b1, "f64"),
    },
    {
      title: "0.2 cannot be stored exactly either",
      text: "Same story: the stored value is a touch larger than 0.2. Both errors are tiny, about one part in 10^16, but they add up instead of cancelling:",
      bits: b2,
      exact: exactDecimal(b2, "f64"),
    },
    {
      title: "Add the two exact stored values",
      text: "Adding the exact values the machine actually holds gives a sum that needs 55 significant bits. A double only has 53, so this sum is not representable:",
      bits: b1,
      exact: sumExact,
    },
    {
      title: "Round to the nearest double",
      text: "The hardware rounds the unrepresentable sum to the nearest double (ties go to even). The winner is a hair above 0.3, which is why JavaScript prints 0.30000000000000004. It is not a bug: it is the correctly rounded result of adding two approximations.",
      bits: sumBits,
      exact: exactDecimal(sumBits, "f64"),
    },
  ];
}

/* ---------------- small components ---------------- */

function BitStrip({ bits, prec, interactive, onToggle }: {
  bits: bigint; prec: Prec; interactive?: boolean; onToggle?: (msbIndex: number) => void;
}) {
  const c = CONF[prec];
  const groups: { name: string; count: number; on: string; label: string; offset: number }[] = [
    { name: "sign", count: 1, on: "#ef4444", label: "sign", offset: 0 },
    { name: "exponent", count: c.ebits, on: "#f59e0b", label: "exponent", offset: 1 },
    { name: "mantissa", count: c.mbits, on: "#14b8a6", label: "mantissa", offset: 1 + c.ebits },
  ];
  return (
    <div className="flex flex-wrap items-start gap-3">
      {groups.map((g) => (
        <div key={g.name}>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: g.on }}>{g.label}</p>
          <div className="flex flex-wrap gap-[3px]">
            {Array.from({ length: g.count }, (_, j) => {
              const msb = g.offset + j;
              const on = bitAt(bits, prec, msb);
              let tip = `bit ${c.bits - 1 - msb} (${g.label})`;
              if (g.name === "mantissa") tip += `, weight 2^-${j + 1}`;
              if (g.name === "exponent") tip += `, weight 2^${c.ebits - 1 - j}`;
              return (
                <button
                  key={j}
                  type="button"
                  title={tip}
                  disabled={!interactive}
                  onClick={() => onToggle?.(msb)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold transition",
                    interactive && "hover:scale-110 hover:ring-2 hover:ring-primary/50",
                  )}
                  style={{
                    background: on ? g.on : "#e2e8f0",
                    color: on ? "#fff" : "#64748b",
                    cursor: interactive ? "pointer" : "default",
                  }}
                >
                  {on ? 1 : 0}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- component ---------------- */

const PRESETS: { label: string; value: number }[] = [
  { label: "0.1", value: 0.1 },
  { label: "0.2", value: 0.2 },
  { label: "1/3", value: 1 / 3 },
  { label: "pi", value: Math.PI },
  { label: "2^53+1", value: 2 ** 53 + 1 },
  { label: "min denormal", value: 5e-324 },
  { label: "-0", value: -0 },
  { label: "Infinity", value: Infinity },
  { label: "NaN", value: NaN },
];

function FloatTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-float-visualizer", isPro);
  const seo = getToolSeo("js-float-visualizer");

  const [prec, setPrec] = useState<Prec>("f64");
  const [bits, setBits] = useState<bigint>(() => bitsOf(0.1, "f64"));
  const [input, setInput] = useState("0.1");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [demoIdx, setDemoIdx] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const demo = useMemo(buildDemo, []);

  useEffect(() => {
    if (!demoPlaying) return;
    const t = setInterval(() => {
      setDemoIdx((i) => {
        if (i >= demo.length - 1) { setDemoPlaying(false); return i; }
        return i + 1;
      });
    }, 2600);
    return () => clearInterval(t);
  }, [demoPlaying, demo.length]);

  const c = CONF[prec];
  const { sign, expRaw, mant, kind } = decode(bits, prec);
  const value = valueOfBits(bits, prec);
  const exact = exactDecimal(bits, prec);
  const groups = bitsToGroups(bits, prec);
  const hex = bits.toString(16).padStart(c.bits / 4, "0");
  const maxBits = (1n << BigInt(c.bits)) - 1n;
  const prevBits = bits > 0n ? bits - 1n : null;
  const nextBits = bits < maxBits ? bits + 1n : null;

  const applyInput = () => {
    const v = Number(input.trim());
    if (input.trim() === "" || Number.isNaN(v) && !/nan/i.test(input.trim())) {
      setError("Type a number, Infinity, -Infinity or NaN.");
      return;
    }
    setError(null);
    setBits(bitsOf(v, prec));
  };

  const switchPrec = (p: Prec) => {
    setPrec(p);
    setBits(bitsOf(value, p));
  };

  const toggleBit = (msbIndex: number) => {
    const lsb = c.bits - 1 - msbIndex;
    setBits((b) => b ^ (1n << BigInt(lsb)));
  };

  const startDemo = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    if (demoIdx >= demo.length - 1) setDemoIdx(0);
    setDemoPlaying(true);
  };

  const copyAnalysis = async () => {
    if (!trial.canUse) return;
    const unbiased = kind === "normal" ? expRaw - c.bias : null;
    const lines = [
      `Float analysis (${c.label})`,
      `Stored value: ${String(value)}`,
      `Bits: ${groups.sign} ${groups.exp} ${groups.mant}`,
      `Hex: 0x${hex}`,
      `Sign: ${sign === 1 ? "-" : "+"} | Exponent: ${groups.exp} (raw ${expRaw}${unbiased !== null ? `, unbiased ${unbiased}` : ""}) | Kind: ${kind}`,
      `Exact decimal value: ${exact}`,
      prevBits !== null ? `Previous representable: ${String(valueOfBits(prevBits, prec))}` : "",
      nextBits !== null ? `Next representable: ${String(valueOfBits(nextBits, prec))}` : "",
    ].filter((l) => l !== "");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      trial.recordUse();
      toast.success("Analysis copied");
    } catch {
      toast.error("Could not access the clipboard");
    }
  };

  const dstep = demo[demoIdx]!;

  return (
    <ToolPageShell toolId="js-float-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Float Visualizer" left={trial.left} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Number</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyInput(); }}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none transition focus:border-primary"
              placeholder="e.g. 0.1, 1/3, 1e308"
            />
          </label>
          <div className="flex gap-2">
            {(["f64", "f32"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => switchPrec(p)}
                className={cn(
                  "rounded-xl border px-4 py-2.5 font-mono text-sm font-bold transition",
                  prec === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {p === "f64" ? "64-bit" : "32-bit"}
              </button>
            ))}
          </div>
          <ActionButton onClick={applyInput}>Set bits</ActionButton>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setInput(String(p.value)); setError(null); setBits(bitsOf(p.value, prec)); }}
              className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">Bit explorer: click any bit to flip it</p>
              <p className="font-mono text-xs text-muted-foreground">0x{hex}</p>
            </div>
            <BitStrip bits={bits} prec={prec} interactive onToggle={toggleBit} />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-red-500">Sign</p>
                <p className="font-mono text-sm font-bold">{groups.sign} <span className="text-muted-foreground">= {sign === 1 ? "negative" : "positive"}</span></p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Exponent</p>
                <p className="break-all font-mono text-sm font-bold">{groups.exp}</p>
                <p className="text-xs text-muted-foreground">
                  raw {expRaw}{kind === "normal" ? `, unbiased ${expRaw - c.bias}, factor 2^${expRaw - c.bias}` : ` (${kind})`}
                </p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-teal-600">Mantissa</p>
                <p className="break-all font-mono text-xs font-bold">{groups.mant}</p>
                <p className="text-xs text-muted-foreground">
                  {kind === "normal" ? `value = (-1)^${sign} x 2^${expRaw - c.bias} x 1.${groups.mant.slice(0, 8)}...` : kind}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold">
              <FlaskConical className="h-4 w-4 text-primary" /> The 0.1 + 0.2 demo (binary64)
            </p>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Step {demoIdx + 1} of {demo.length}: {dstep.title}
              </p>
              <p className="mb-3 text-sm text-muted-foreground">{dstep.text}</p>
              <div className="mb-3 overflow-x-auto">
                <BitStrip bits={dstep.bits} prec="f64" />
              </div>
              <p className="break-all font-mono text-sm font-bold">{dstep.exact}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button" onClick={() => { setDemoPlaying(false); setDemoIdx(0); }}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                aria-label="Reset demo"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button" onClick={() => { setDemoPlaying(false); setDemoIdx((i) => Math.max(0, i - 1)); }}
                disabled={demoIdx === 0}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                aria-label="Previous demo step"
              >
                <StepBack className="h-4 w-4" />
              </button>
              {demoPlaying ? (
                <button type="button" onClick={() => setDemoPlaying(false)} className="rounded-lg border border-border p-2 text-foreground transition hover:border-primary/40" aria-label="Pause demo">
                  <Pause className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={startDemo} disabled={!trial.canUse} className="rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:opacity-40" aria-label="Play demo">
                  <Play className="h-4 w-4" />
                </button>
              )}
              <button
                type="button" onClick={() => { setDemoPlaying(false); setDemoIdx((i) => Math.min(demo.length - 1, i + 1)); }}
                disabled={demoIdx >= demo.length - 1}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                aria-label="Next demo step"
              >
                <StepForward className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">Decoded value</p>
            <p className="break-all font-mono text-2xl font-bold">{String(value)}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exact decimal value</p>
            <p className="break-all font-mono text-xs">{exact}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p><span className="font-semibold text-foreground">Neighbors:</span></p>
              {prevBits !== null && <p className="break-all font-mono">- {String(valueOfBits(prevBits, prec))}</p>}
              {nextBits !== null && <p className="break-all font-mono">+ {String(valueOfBits(nextBits, prec))}</p>}
              <p className="pt-1">Anything between two neighbors rounds to one of them. That rounding is where 0.1 + 0.2 comes from.</p>
            </div>
            <div className="mt-4">
              <ActionButton onClick={copyAnalysis} disabled={!trial.canUse}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy analysis
              </ActionButton>
              {!isPro && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free copies left. Flipping bits and stepping the demo are always free.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground">
            <p className="mb-1 font-bold text-foreground">About this model</p>
            <p>Bit layouts, rounding and exact values match IEEE 754 binary64 and binary32 precisely. Typing a decimal converts it exactly the way JavaScript's Number() does. Denormals, signed zero, infinities and NaN are all explorable: flip the exponent bits to all 1s and watch Infinity appear.</p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
