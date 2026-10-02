// /tools/subnet-calculator - CIDR subnet calculator: network, broadcast,
// first/last usable, total hosts, mask, wildcard, binary view. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/subnet-calculator")({
  head: () => {
    const seo = getToolSeoMeta("subnet-calculator");
    const canonical = "https://iconvault.site/tools/subnet-calculator";
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
  component: SubnetCalculator,
});

interface SubnetResult {
  network: string;
  broadcast: string;
  first: string;
  last: string;
  mask: string;
  wildcard: string;
  total: number;
  usable: number;
  prefix: number;
  bin: { label: string; value: string }[];
}

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

function numToIp(n: number): string {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

function numToBin(n: number): string {
  const b = n.toString(2).padStart(32, "0");
  return `${b.slice(0, 8)}.${b.slice(8, 16)}.${b.slice(16, 24)}.${b.slice(24)}`;
}

function calc(input: string): SubnetResult | null {
  const m = input.trim().match(/^(.+?)\/(\d{1,2})$/);
  if (!m) return null;
  const prefix = parseInt(m[2]!, 10);
  if (prefix < 0 || prefix > 32) return null;
  const ip = ipToNum(m[1]!);
  if (ip === null) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const wildcard = (~mask) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const hostBits = 32 - prefix;
  const total = hostBits === 32 ? 4294967296 : 2 ** hostBits;
  const usable = prefix >= 31 ? total : Math.max(0, total - 2);
  const first = prefix >= 31 ? network : (network + 1) >>> 0;
  const last = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;
  return {
    network: numToIp(network),
    broadcast: numToIp(broadcast),
    first: numToIp(first),
    last: numToIp(last),
    mask: numToIp(mask),
    wildcard: numToIp(wildcard),
    total,
    usable,
    prefix,
    bin: [
      { label: "Network", value: numToBin(network) },
      { label: "Mask", value: numToBin(mask) },
      { label: "Broadcast", value: numToBin(broadcast) },
    ],
  };
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function SubnetCalculator() {
  const { isPro } = usePlan();
  const trial = useToolTrial("subnet-calculator", isPro);
  const seo = getToolSeo("subnet-calculator");

  const [input, setInput] = useState("192.168.1.0/24");
  const [result, setResult] = useState<SubnetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (!trial.canUse) return;
    const r = calc(input);
    if (!r) {
      setResult(null);
      setError("Enter a valid CIDR like 192.168.1.0/24 or 10.0.0.0/8.");
      return;
    }
    setError(null);
    setResult(r);
    trial.recordUse();
    toast.success("Subnet calculated");
  };

  const rows: { label: string; value: string }[] = result
    ? [
        { label: "Network address", value: result.network },
        { label: "Broadcast address", value: result.broadcast },
        { label: "First usable host", value: result.first },
        { label: "Last usable host", value: result.last },
        { label: "Subnet mask", value: `${result.mask} (/${result.prefix})` },
        { label: "Wildcard mask", value: result.wildcard },
        { label: "Total addresses", value: result.total.toLocaleString() },
        { label: "Usable hosts", value: result.usable.toLocaleString() },
      ]
    : [];

  return (
    <ToolPageShell toolId="subnet-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Subnet Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">IP in CIDR notation</p>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder="192.168.1.0/24"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Any IPv4 address plus prefix length 0-32</p>
          </div>
          <ActionButton disabled={!trial.canUse || !input.trim()} onClick={run}>
            <Calculator className="h-4 w-4" /> Calculate
          </ActionButton>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Calculator className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Enter a CIDR block to see its breakdown</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Network and broadcast addresses, usable host range, masks and a binary view, all computed in your browser.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{r.label}</p>
                      <p className="truncate font-mono text-sm font-bold">{r.value}</p>
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
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-sm font-semibold">Binary view</p>
                <div className="space-y-2">
                  {result.bin.map((b) => (
                    <div key={b.label} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                      <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{b.label}</span>
                      <code className="break-all font-mono text-xs sm:text-sm">{b.value}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
