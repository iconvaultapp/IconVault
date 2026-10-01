// /tools/number-base-converter - Convert numbers between binary, octal, decimal
// and hexadecimal, with a clickable bit visualizer and two's complement mode.
// 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Binary, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/number-base-converter")({
  head: () => {
    const seo = getToolSeoMeta("number-base-converter");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BaseConverterTool,
});

const BASES = [
  { base: 2, label: "Binary", short: "BIN" },
  { base: 8, label: "Octal", short: "OCT" },
  { base: 10, label: "Decimal", short: "DEC" },
  { base: 16, label: "Hexadecimal", short: "HEX" },
] as const;

const PREFIX: Record<number, string> = { 2: "0b", 8: "0o", 10: "", 16: "0x" };

const DIGIT_RE: Record<number, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^-?\d+$/,
  16: /^[0-9a-fA-F]+$/,
};

function parseInput(raw: string, base: number): bigint | null {
  const s = raw.trim();
  if (!s || !DIGIT_RE![base]!.test(s)) return null;
  try {
    return BigInt(PREFIX[base] + s);
  } catch {
    return null;
  }
}

function formatBig(u: bigint, base: number): string {
  const s = u.toString(base);
  return base === 16 ? s.toUpperCase() : s;
}

function groupBits(s: string): string {
  return s.replace(/(.{4})/g, "$1 ").trim();
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

function BaseConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("number-base-converter", isPro);
  const seo = getToolSeo("number-base-converter");

  const [input, setInput] = useState("255");
  const [fromBase, setFromBase] = useState(10);
  const [bitWidth, setBitWidth] = useState(8);
  const [twos, setTwos] = useState(false);

  const parsed = useMemo(() => parseInput(input, fromBase), [input, fromBase]);
  const mask = useMemo(() => (1n << BigInt(bitWidth)) - 1n, [bitWidth]);

  const result = useMemo(() => {
    if (parsed === null) return { ok: false as const };
    if (twos) {
      const mod = mask + 1n;
      const u = ((parsed % mod) + mod) % mod;
      const half = 1n << BigInt(bitWidth - 1);
      const signed = u >= half ? u - mod : u;
      return { ok: true as const, unsigned: u, signed, overflow: false };
    }
    if (parsed < 0n) {
      return { ok: true as const, unsigned: 0n, signed: 0n, overflow: false, negativeError: true };
    }
    return { ok: true as const, unsigned: parsed, signed: parsed, overflow: parsed > mask };
  }, [parsed, twos, mask, bitWidth]);

  const shownBits = useMemo(() => {
    if (!result.ok) return null;
    const u = result.unsigned & mask;
    const bits: boolean[] = [];
    for (let i = bitWidth - 1; i >= 0; i--) {
      bits.push(((u >> BigInt(i)) & 1n) === 1n);
    }
    return bits;
  }, [result, mask, bitWidth]);

  const toggleBit = (displayIndex: number) => {
    if (!result.ok) return;
    const p = bitWidth - 1 - displayIndex;
    const next = (result.unsigned ^ (1n << BigInt(p))) & mask;
    setInput(formatBig(next, fromBase));
  };

  const copyAll = async () => {
    if (!result.ok || !trial.canUse) {
      if (!trial.canUse) toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    const lines = BASES.map((b) => {
      const val = b.base === 10 && twos ? result.signed.toString() : formatBig(result.unsigned, b.base);
      return `${b.label}: ${val}`;
    });
    lines.push(`Bits (${bitWidth}): ${shownBits ? groupBits(shownBits.map((x) => (x ? "1" : "0")).join("")) : ""}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      trial.recordUse();
      toast.success("All bases copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  const copyOne = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="number-base-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Base Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="bc-input">
              Number
            </label>
            <input
              id="bc-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder={fromBase === 16 ? "FF" : fromBase === 2 ? "1010" : "255"}
              className={inputCls}
            />
            {parsed === null && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                Not a valid {BASES.find((b) => b.base === fromBase)?.label.toLowerCase()} number.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Input base</p>
            <div className="grid grid-cols-4 gap-2">
              {BASES.map((b) => (
                <button
                  key={b.base}
                  type="button"
                  onClick={() => setFromBase(b.base)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 font-mono text-sm font-bold transition",
                    fromBase === b.base
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {b.short}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Bit width (visualizer)</p>
            <div className="grid grid-cols-3 gap-2">
              {[8, 16, 32].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setBitWidth(w)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 font-mono text-sm font-bold transition",
                    bitWidth === w
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {w}-bit
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTwos((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium transition hover:border-primary/40"
            aria-pressed={twos}
          >
            <span>
              Two&apos;s complement
              <span className="block text-xs font-normal text-muted-foreground">Interpret bits as a signed integer</span>
            </span>
            <span
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition",
                twos ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  twos ? "left-[22px]" : "left-0.5",
                )}
              />
            </span>
          </button>

          <ActionButton disabled={!result.ok || !trial.canUse} onClick={copyAll}>
            <ClipboardCopy className="h-4 w-4" /> Copy all bases
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {!result.ok ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <Binary className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Enter a number to convert</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Conversions to binary, octal, decimal and hexadecimal appear here instantly.
              </p>
            </div>
          ) : result.negativeError ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <p className="font-semibold">Negative number without two&apos;s complement</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Turn on two&apos;s complement to interpret negative values as signed {bitWidth}-bit integers.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {BASES.map((b) => {
                  const val =
                    b.base === 10 && twos ? result.signed.toString() : formatBig(result.unsigned, b.base);
                  return (
                    <div key={b.base} className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">{b.label}</p>
                        <button
                          type="button"
                          onClick={() => void copyOne(b.label, val)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40"
                        >
                          <ClipboardCopy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                      <p className="break-all font-mono text-xl font-bold text-primary">
                        {b.base !== 10 && <span className="text-muted-foreground">{PREFIX[b.base]}</span>}
                        {val}
                      </p>
                      {b.base === 10 && twos && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          Unsigned: {formatBig(result.unsigned, 10)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Bit visualization ({bitWidth}-bit) - click any bit to flip it
                </p>
                {result.overflow && !twos && (
                  <p className="mb-2 text-xs font-medium text-amber-600">
                    Value exceeds {bitWidth} bits - showing the lowest {bitWidth} bits.
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {shownBits?.map((bit, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleBit(i)}
                      aria-label={`Bit ${bitWidth - 1 - i}: ${bit ? 1 : 0}`}
                      className={cn(
                        "h-11 w-9 rounded-lg border font-mono text-lg font-bold transition",
                        i % 4 === 3 && "mr-2",
                        bit
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {bit ? 1 : 0}
                    </button>
                  ))}
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {shownBits ? groupBits(shownBits.map((x) => (x ? "1" : "0")).join("")) : ""}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
