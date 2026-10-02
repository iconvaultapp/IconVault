// /tools/mac-generator - Random MAC addresses with a built-in OUI table for
// common vendors, locally-administered toggle, and OUI lookup. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, ExternalLink, Network, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/mac-generator")({
  head: () => {
    const seo = getToolSeoMeta("mac-generator");
    const canonical = "https://iconvault.site/tools/mac-generator";
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
  component: MacGenerator,
});

const COUNTS = [1, 5, 10, 20] as const;

/** Common vendor OUIs (first 3 octets). A sample only; full database linked below. */
const OUI_TABLE: { vendor: string; oui: string }[] = [
  { vendor: "Apple", oui: "3C:22:FB" },
  { vendor: "Apple", oui: "F0:18:98" },
  { vendor: "Apple", oui: "8C:85:90" },
  { vendor: "Cisco", oui: "00:1B:54" },
  { vendor: "Cisco", oui: "00:24:97" },
  { vendor: "Intel", oui: "00:1B:21" },
  { vendor: "Intel", oui: "00:1C:C0" },
  { vendor: "Samsung", oui: "00:12:FB" },
  { vendor: "Dell", oui: "F8:BC:12" },
  { vendor: "HP", oui: "00:1B:78" },
  { vendor: "Microsoft", oui: "00:0D:3A" },
  { vendor: "Google", oui: "3C:5A:37" },
  { vendor: "Amazon", oui: "40:B4:CD" },
  { vendor: "VMware", oui: "00:0C:29" },
  { vendor: "VMware", oui: "00:50:56" },
  { vendor: "Huawei", oui: "00:18:82" },
  { vendor: "Sony", oui: "00:14:A5" },
  { vendor: "LG", oui: "00:1C:62" },
  { vendor: "Xiaomi", oui: "64:09:80" },
];

function randByte(): number {
  const a = new Uint8Array(1);
  crypto.getRandomValues(a);
  return a[0]!;
}

function toMac(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

/** Random MAC under a fixed OUI, or fully random when oui is empty. */
function makeMac(oui: string, locallyAdministered: boolean): string {
  const bytes = oui
    ? oui.split(":").map((h) => parseInt(h, 16))
    : [randByte(), randByte(), randByte()];
  while (bytes.length < 6) bytes.push(randByte());
  if (locallyAdministered) {
    bytes[0] = (bytes![0]! & 0xfe) | 0x02; // clear multicast, set local bit
  }
  return toMac(bytes);
}

function lookupVendor(mac: string): string | null {
  const clean = mac.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (clean.length < 6) return null;
  const oui = `${clean.slice(0, 2)}:${clean.slice(2, 4)}:${clean.slice(4, 6)}`;
  const hit = OUI_TABLE.find((o) => o.oui === oui);
  return hit ? hit.vendor : null;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function MacGenerator() {
  const { isPro } = usePlan();
  const trial = useToolTrial("mac-generator", isPro);
  const seo = getToolSeo("mac-generator");

  const [count, setCount] = useState<number>(5);
  const [oui, setOui] = useState("");
  const [local, setLocal] = useState(false);
  const [macs, setMacs] = useState<string[]>([]);
  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  const generate = () => {
    if (!trial.canUse) return;
    setMacs(Array.from({ length: count }, () => makeMac(oui, local)));
    trial.recordUse();
    toast.success(`${count} MAC ${count === 1 ? "address" : "addresses"} generated`);
  };

  const doLookup = () => {
    const vendor = lookupVendor(lookup);
    setLookupResult(vendor ?? "Not in the built-in table - try the full database below.");
  };

  return (
    <ToolPageShell toolId="mac-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="MAC Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Vendor OUI (optional)</p>
            <select
              value={oui}
              onChange={(e) => setOui(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              <option value="">Fully random</option>
              {OUI_TABLE.map((o, i) => (
                <option key={i} value={o.oui}>{o.vendor} - {o.oui}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
            <span>Locally-administered bit</span>
            <button
              type="button"
              role="switch"
              aria-checked={local}
              onClick={() => setLocal((v) => !v)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition",
                local ? "bg-primary" : "bg-muted",
              )}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", local ? "left-[22px]" : "left-0.5")} />
            </button>
          </label>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">How many</p>
            <div className="flex flex-wrap gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCount(c)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    count === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Network className="h-4 w-4" /> Generate
          </ActionButton>
          {macs.length > 0 && (
            <button
              type="button"
              onClick={() => copy(macs.join("\n"), "MAC list")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold hover:border-primary/40"
            >
              <Copy className="h-4 w-4" /> Copy all
            </button>
          )}

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">OUI vendor lookup</p>
            <div className="flex gap-2">
              <input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doLookup(); }}
                placeholder="3C:22:FB:..."
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={doLookup}
                className="shrink-0 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
                aria-label="Look up vendor"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {lookupResult && <p className="mt-2 text-sm font-semibold">{lookupResult}</p>}
            <a
              href="https://www.wireshark.org/tools/oui-lookup.html"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Full OUI database lookup <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {macs.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Network className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Random MAC addresses on demand</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Universally or locally administered, optionally under a real vendor OUI. Uses your browser's secure random generator.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {macs.map((m) => (
                <div key={m} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                  <code className="font-mono text-sm font-bold">{m}</code>
                  <button
                    type="button"
                    onClick={() => copy(m, "MAC")}
                    className={cn("shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground")}
                    aria-label={`Copy ${m}`}
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
