// /tools/bitwise-calculator - AND, OR, XOR, NOT and bit shifts on two operands
// with results shown in binary, octal, decimal and hex at once. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Binary, ClipboardCopy, Cpu } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/bitwise-calculator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/bitwise-calculator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/bitwise-calculator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/bitwise-calculator";
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
  component: BitwiseTool,
});

const BASES = [
  { base: 2, label: "BIN" },
  { base: 8, label: "OCT" },
  { base: 10, label: "DEC" },
  { base: 16, label: "HEX" },
] as const;

const OPS = [
  { id: "AND", label: "AND", symbol: "&" },
  { id: "OR", label: "OR", symbol: "|" },
  { id: "XOR", label: "XOR", symbol: "^" },
  { id: "NOT", label: "NOT A", symbol: "~A" },
  { id: "SHL", label: "A << B", symbol: "<<" },
  { id: "SHR", label: "A >> B (logical)", symbol: ">>>" },
  { id: "SAR", label: "A >> B (signed)", symbol: ">>" },
] as const;

type OpId = (typeof OPS)[number]["id"];

const PREFIX: Record<number, string> = { 2: "0b", 8: "0o", 10: "", 16: "0x" };
const DIGIT_RE: Record<number, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^-?\d+$/,
  16: /^[0-9a-fA-F]+$/,
};

const MASK32 = 0xffffffffn;

function parseOperand(raw: string, base: number): bigint | null {
  const s = raw.trim();
  if (!s || !DIGIT_RE![base]!.test(s)) return null;
  try {
    return (base === 10 ? BigInt(s) : BigInt(PREFIX[base] + s)) & MASK32;
  } catch {
    return null;
  }
}

function toSigned32(u: bigint): bigint {
  return u >= 0x80000000n ? u - 0x100000000n : u;
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";
const selectCls =
  "rounded-xl border border-border bg-background px-2 py-2.5 font-mono text-xs font-bold outline-none focus:border-primary";

function OperandInput({
  label,
  value,
  onValue,
  base,
  onBase,
}: {
  label: string;
  value: string;
  onValue: (v: string) => void;
  base: number;
  onBase: (b: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onValue(e.target.value)}
          spellCheck={false}
          placeholder={base === 16 ? "FF" : base === 2 ? "1010" : "12"}
          className={inputCls}
        />
        <select value={base} onChange={(e) => onBase(Number(e.target.value))} className={selectCls} aria-label={`${label} base`}>
          {BASES.map((b) => (
            <option key={b.base} value={b.base}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function BitwiseTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bitwise-calculator", isPro);
  const seo = toolSeo;

  const [aStr, setAStr] = useState("12");
  const [bStr, setBStr] = useState("10");
  const [baseA, setBaseA] = useState(10);
  const [baseB, setBaseB] = useState(10);
  const [op, setOp] = useState<OpId>("AND");

  const a = useMemo(() => parseOperand(aStr, baseA), [aStr, baseA]);
  const b = useMemo(() => parseOperand(bStr, baseB), [bStr, baseB]);

  const result = useMemo(() => {
    if (a === null) return null;
    const shift = b === null ? 0n : b & 31n;
    switch (op) {
      case "AND": return b === null ? null : a & b;
      case "OR": return b === null ? null : a | b;
      case "XOR": return b === null ? null : a ^ b;
      case "NOT": return (~a) & MASK32;
      case "SHL": return (a << shift) & MASK32;
      case "SHR": return a >> shift;
      case "SAR": return (toSigned32(a) >> shift) & MASK32;
    }
  }, [a, b, op]);

  const needsB = op !== "NOT";
  const valid = result !== null;

  const rows = useMemo(() => {
    if (result === null) return [];
    const bin = result.toString(2).padStart(32, "0").replace(/(.{4})/g, "$1 ").trim();
    return [
      { label: "Binary", value: `0b${bin}` },
      { label: "Octal", value: `0o${result.toString(8)}` },
      { label: "Decimal (unsigned)", value: result.toString(10) },
      { label: "Decimal (signed)", value: toSigned32(result).toString(10) },
      { label: "Hexadecimal", value: `0x${result.toString(16).toUpperCase().padStart(8, "0")}` },
    ];
  }, [result]);

  const copy = async () => {
    if (!valid || !trial.canUse) {
      if (!trial.canUse) toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(rows.map((r) => `${r.label}: ${r.value}`).join("\n"));
      trial.recordUse();
      toast.success("Result copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  const opDef = OPS.find((o) => o.id === op)!;

  return (
    <ToolPageShell toolId="bitwise-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Bitwise Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <OperandInput label="Operand A" value={aStr} onValue={setAStr} base={baseA} onBase={setBaseA} />
          {needsB && (
            <OperandInput label="Operand B (shift amount for shifts)" value={bStr} onValue={setBStr} base={baseB} onBase={setBaseB} />
          )}
          {a === null && <p className="text-xs font-medium text-red-500">Operand A is not valid in the selected base.</p>}
          {needsB && b === null && <p className="text-xs font-medium text-red-500">Operand B is not valid in the selected base.</p>}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Operation</p>
            <div className="grid grid-cols-2 gap-2">
              {OPS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOp(o.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 font-mono text-sm font-bold transition",
                    op === o.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {op === "NOT"
                ? "NOT flips every bit of A (32-bit)."
                : op === "SHL" || op === "SHR" || op === "SAR"
                  ? "Shifts use B mod 32 as the shift amount."
                  : "Both operands are treated as 32-bit unsigned values."}
            </p>
          </div>

          <ActionButton disabled={!valid || !trial.canUse} onClick={copy}>
            <ClipboardCopy className="h-4 w-4" /> Copy result
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {!valid ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <Cpu className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Enter valid operands</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The result of the {opDef.label} operation appears here in every base at once.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground">Expression</p>
                <p className="mt-1 font-mono text-lg font-bold">
                  {op === "NOT" ? (
                    <>{opDef.symbol} <span className="text-primary">{aStr}</span></>
                  ) : (
                    <>
                      <span className="text-primary">{aStr}</span> {opDef.symbol}{" "}
                      <span className="text-primary">{bStr}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="space-y-2">
                {rows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{r.label}</p>
                      <p className="break-all font-mono text-base font-bold text-primary">{r.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(r.value).then(
                        () => toast.success(`${r.label} copied`),
                        () => toast.error("Copy failed - select and copy manually."),
                      )}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40"
                    >
                      <ClipboardCopy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                ))}
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Binary className="h-3.5 w-3.5" /> Binary is shown as a full 32-bit word, grouped in nibbles.
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
