// /tools/ipv6-ula-generator - Generate random RFC 4193 unique local IPv6
// prefixes (fd00::/8 with a random 40-bit global ID). 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Dices } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ipv6-ula-generator")({
  head: () => {
    const seo = getToolSeoMeta("ipv6-ula-generator");
    const canonical = "https://iconvault.site/tools/ipv6-ula-generator";
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
  component: Ipv6UlaGenerator,
});

const COUNTS = [1, 5, 10, 20] as const;

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** RFC 4193 ULA: fd00::/8 + 1-bit L (set) + 40-bit random global ID + 16-bit subnet. */
function makeUla(): string {
  const globalId = randomHex(5);
  const subnet = randomHex(2);
  return `fd${globalId.slice(0, 2)}:${globalId.slice(2, 6)}:${globalId.slice(6, 10)}:${subnet}::/64`;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function Ipv6UlaGenerator() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ipv6-ula-generator", isPro);
  const seo = getToolSeo("ipv6-ula-generator");

  const [count, setCount] = useState<number>(5);
  const [prefixes, setPrefixes] = useState<string[]>([]);

  const generate = () => {
    if (!trial.canUse) return;
    setPrefixes(Array.from({ length: count }, makeUla));
    trial.recordUse();
    toast.success(`${count} ULA ${count === 1 ? "prefix" : "prefixes"} generated`);
  };

  const copyAll = () => {
    if (prefixes.length === 0) return;
    void copy(prefixes.join("\n"), "Prefix list");
  };

  return (
    <ToolPageShell toolId="ipv6-ula-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="IPv6 ULA Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">How many prefixes</p>
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
            <p className="mt-1.5 text-xs text-muted-foreground">
              Random 40-bit global IDs per RFC 4193, collision-safe for private networks
            </p>
          </div>
          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Dices className="h-4 w-4" /> Generate
          </ActionButton>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {prefixes.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Dices className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Private IPv6 prefixes, instantly</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                RFC 4193 unique local addresses like fd00::/8 ranges for labs, VPNs and home networks. Uses your browser's secure random generator.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{prefixes.length} generated {prefixes.length === 1 ? "prefix" : "prefixes"}</p>
                <button
                  type="button"
                  onClick={copyAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy all
                </button>
              </div>
              <div className="space-y-2">
                {prefixes.map((p) => (
                  <div key={p} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                    <code className="break-all font-mono text-sm font-bold">{p}</code>
                    <button
                      type="button"
                      onClick={() => copy(p, "Prefix")}
                      className={cn("shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground")}
                      aria-label={`Copy ${p}`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
