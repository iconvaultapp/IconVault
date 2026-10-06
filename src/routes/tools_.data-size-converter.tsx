// /tools/data-size-converter - Convert a value between bits, bytes, KB, MB, GB,
// TB, KiB, MiB and GiB with a full conversion table. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/data-size-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/data-size-converter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/data-size-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/data-size-converter";
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
  component: DataSizeTool,
});

const UNITS = [
  { id: "bit", label: "Bits", short: "bit", bits: 1 },
  { id: "byte", label: "Bytes", short: "B", bits: 8 },
  { id: "kb", label: "Kilobytes", short: "KB", bits: 8000 },
  { id: "mb", label: "Megabytes", short: "MB", bits: 8e6 },
  { id: "gb", label: "Gigabytes", short: "GB", bits: 8e9 },
  { id: "tb", label: "Terabytes", short: "TB", bits: 8e12 },
  { id: "kib", label: "Kibibytes", short: "KiB", bits: 8192 },
  { id: "mib", label: "Mebibytes", short: "MiB", bits: 8388608 },
  { id: "gib", label: "Gibibytes", short: "GiB", bits: 8589934592 },
] as const;

function formatValue(n: number): string {
  if (!isFinite(n)) return "0";
  if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-6)) {
    return n.toExponential(4).replace(/\.?0+e/, "e");
  }
  const rounded = Number(n.toPrecision(10));
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

function DataSizeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("data-size-converter", isPro);
  const seo = toolSeo;

  const [value, setValue] = useState("1");
  const [fromId, setFromId] = useState<string>("gb");

  const parsed = useMemo(() => {
    const n = parseFloat(value);
    return isFinite(n) && n >= 0 ? n : null;
  }, [value]);

  const rows = useMemo(() => {
    if (parsed === null) return [];
    const from = UNITS.find((u) => u.id === fromId)!;
    const totalBits = parsed * from.bits;
    return UNITS.map((u) => ({
      ...u,
      converted: totalBits / u.bits,
      formatted: formatValue(totalBits / u.bits),
    }));
  }, [parsed, fromId]);

  const copyText = async (text: string, what: string, record: boolean) => {
    if (record && !trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      if (record) trial.recordUse();
      toast.success(`${what} copied`);
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  const copyAll = () =>
    void copyText(
      rows.map((r) => `${r.label} (${r.short}): ${r.formatted}`).join("\n"),
      "Full table",
      true,
    );

  return (
    <ToolPageShell toolId="data-size-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Data Size Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="ds-value">
              Value
            </label>
            <input
              id="ds-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              placeholder="1"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
            {parsed === null && (
              <p className="mt-1.5 text-xs font-medium text-red-500">Enter a non-negative number.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">From unit</p>
            <div className="grid grid-cols-3 gap-2">
              {UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setFromId(u.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 font-mono text-sm font-bold transition",
                    fromId === u.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {u.short}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              KB/MB/GB/TB use 1000-based SI units. KiB/MiB/GiB use 1024-based binary units.
            </p>
          </div>

          <ActionButton disabled={rows.length === 0 || !trial.canUse} onClick={copyAll}>
            <ClipboardCopy className="h-4 w-4" /> Copy full table
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {rows.length === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <HardDrive className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Enter a value to convert</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The full conversion table across all nine units appears here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 text-right font-medium">Value</th>
                    <th className="px-3 py-2 text-right font-medium">Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-border/60 last:border-0",
                        r.id === fromId && "bg-primary/5",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-semibold">{r.label}</span>{" "}
                        <span className="font-mono text-xs text-muted-foreground">({r.short})</span>
                        {r.id === fromId && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            input
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-primary">{r.formatted}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(
                              `${parsed} ${UNITS.find((u) => u.id === fromId)!.short} = ${r.formatted} ${r.short}`,
                              r.short,
                              true,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40"
                        >
                          <ClipboardCopy className="h-3 w-3" /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
