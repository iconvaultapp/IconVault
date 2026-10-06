// /tools/random-port - Generate random usable TCP/UDP ports, optionally
// excluding well-known ports 0-1023. No duplicates. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/random-port";
import toolSeoMeta from "@/lib/tool-seo-meta-data/random-port";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/random-port")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/random-port";
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
  component: RandomPort,
});

const COUNTS = [1, 5, 10, 20, 50] as const;

function randPort(min: number, max: number): number {
  const range = max - min + 1;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return min + (bytes![0]! % range);
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function RandomPort() {
  const { isPro } = usePlan();
  const trial = useToolTrial("random-port", isPro);
  const seo = toolSeo;

  const [count, setCount] = useState<number>(10);
  const [excludeWellKnown, setExcludeWellKnown] = useState(true);
  const [ports, setPorts] = useState<number[]>([]);

  const generate = () => {
    if (!trial.canUse) return;
    const min = excludeWellKnown ? 1024 : 0;
    const max = 65535;
    const picked = new Set<number>();
    while (picked.size < count) picked.add(randPort(min, max));
    setPorts([...picked].sort((a, b) => a - b));
    trial.recordUse();
    toast.success(`${count} random ${count === 1 ? "port" : "ports"} generated`);
  };

  return (
    <ToolPageShell toolId="random-port" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Random Port" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">How many ports</p>
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

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
            <span>Exclude well-known ports (0-1023)</span>
            <button
              type="button"
              role="switch"
              aria-checked={excludeWellKnown}
              onClick={() => setExcludeWellKnown((v) => !v)}
              className={cn("relative h-6 w-11 shrink-0 rounded-full transition", excludeWellKnown ? "bg-primary" : "bg-muted")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", excludeWellKnown ? "left-[22px]" : "left-0.5")} />
            </button>
          </label>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Shuffle className="h-4 w-4" /> Generate
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Uses your browser's secure random generator. No port is picked twice in one batch.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {ports.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Shuffle className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Free ports for your next service</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Random usable TCP/UDP ports with no duplicates, handy for dev servers, containers and test setups.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{ports.length} ports</p>
                <button
                  type="button"
                  onClick={() => copy(ports.join(", "), "Port list")}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy all
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {ports.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => copy(String(p), `Port ${p}`)}
                    className="rounded-xl border border-border px-3 py-3 text-center transition hover:border-primary/60 hover:bg-primary/5"
                  >
                    <span className="font-mono text-lg font-bold">{p}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click any port to copy it.</p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
