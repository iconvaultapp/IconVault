// /tools/ipv4-converter - Convert a dotted-decimal IPv4 address to integer,
// hex, binary, octal and IPv6-mapped forms. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/ipv4-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/ipv4-converter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ipv4-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/ipv4-converter";
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
  component: Ipv4Converter,
});

function ipToNum(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const v = parseInt(p, 10);
    if (v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function Ipv4Converter() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ipv4-converter", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("192.168.1.1");
  const [rows, setRows] = useState<{ label: string; value: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convert = () => {
    if (!trial.canUse) return;
    const n = ipToNum(input);
    if (n === null) {
      setRows(null);
      setError("Enter a valid IPv4 address like 192.168.1.1.");
      return;
    }
    const hex = n.toString(16).padStart(8, "0");
    setError(null);
    setRows([
      { label: "Integer", value: String(n) },
      { label: "Hexadecimal", value: `0x${hex}` },
      { label: "Binary", value: n.toString(2).padStart(32, "0") },
      { label: "Octal", value: `0${n.toString(8)}` },
      { label: "IPv6-mapped", value: `::ffff:${input.trim()}` },
      { label: "IPv6 hex", value: `::ffff:${hex.slice(0, 4)}:${hex.slice(4)}` },
    ]);
    trial.recordUse();
    toast.success("Converted");
  };

  return (
    <ToolPageShell toolId="ipv4-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="IPv4 Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">IPv4 address</p>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") convert(); }}
              placeholder="192.168.1.1"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
          <ActionButton disabled={!trial.canUse || !input.trim()} onClick={convert}>
            <ArrowLeftRight className="h-4 w-4" /> Convert
          </ActionButton>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!rows ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ArrowLeftRight className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Every representation of one IP</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Integer, hex, binary, octal and IPv6-mapped forms, computed instantly in your browser.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{r.label}</p>
                    <p className="break-all font-mono text-sm font-bold">{r.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(r.value, r.label)}
                    className={cn("shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground")}
                    aria-label={`Copy ${r.label}`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
