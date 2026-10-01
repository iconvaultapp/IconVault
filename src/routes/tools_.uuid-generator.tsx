// /tools/uuid-generator - bulk UUID v4 generator using crypto.randomUUID.
// 100% client-side, cryptographically secure.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Dices } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/uuid-generator")({
  head: () => {
    const seo = getToolSeoMeta("uuid-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: UuidGeneratorTool,
});

const COUNTS = [1, 10, 50, 100] as const;

type UuidVersion = "v4" | "v7";

/** RFC 9562 UUID v7: 48-bit unix millis (big-endian), version nibble 7,
 *  variant bits 10, 74 random bits from crypto.getRandomValues. */
function uuidv7(): string {
  const timeHex = Date.now().toString(16).padStart(12, "0");
  const rand = new Uint8Array(10);
  crypto.getRandomValues(rand);
  const hex = [...rand].map((b) => b.toString(16).padStart(2, "0")).join("");
  const g1 = timeHex.slice(0, 8);
  const g2 = timeHex.slice(8, 12);
  const g3 = "7" + hex.slice(0, 3);
  const g4 = (((parseInt(hex.slice(3, 4), 16) & 0x3) | 0x8).toString(16)) + hex.slice(4, 7);
  const g5 = hex.slice(7, 19);
  return `${g1}-${g2}-${g3}-${g4}-${g5}`;
}

function formatUuid(u: string, upper: boolean, noDashes: boolean): string {
  const s = noDashes ? u.replace(/-/g, "") : u;
  return upper ? s.toUpperCase() : s;
}

function UuidGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("uuid-generator", isPro);
  const seo = getToolSeo("uuid-generator");

  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [upper, setUpper] = useState(false);
  const [noDashes, setNoDashes] = useState(false);

  const generate = () => {
    if (!trial.canUse) return;
    try {
      const make = version === "v4" ? () => crypto.randomUUID() : uuidv7;
      const out = Array.from({ length: count }, () => formatUuid(make(), upper, noDashes));
      setUuids(out);
      setCopied(null);
      trial.recordUse();
    } catch {
      toast.error("Your browser does not support UUID generation.");
    }
  };

  const copyOne = (u: string) => {
    navigator.clipboard
      .writeText(u)
      .then(() => {
        setCopied(u);
        toast.success("UUID copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const copyAll = () => {
    navigator.clipboard
      .writeText(uuids.join("\n"))
      .then(() => toast.success(`${uuids.length} UUIDs copied`))
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="uuid-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="UUID Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <span className="mb-2 block text-[13px] font-medium text-foreground/80">How many?</span>
            <div className="grid grid-cols-4 gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCount(c)}
                  className={`rounded-xl border py-2.5 font-mono text-sm font-bold transition ${
                    count === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-[13px] font-medium text-foreground/80">Version</span>
            <div className="inline-flex rounded-xl bg-muted/60 p-1" role="group" aria-label="UUID version">
              {(["v4", "v7"] as UuidVersion[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersion(v)}
                  className={`rounded-lg px-5 py-2 font-mono text-sm font-bold uppercase transition ${
                    version === v
                      ? "bg-card text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {version === "v4" ? "Random (RFC 4122)" : "Time-ordered (RFC 9562)"}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground/80">
              <input
                type="checkbox"
                checked={upper}
                onChange={(e) => setUpper(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              UPPERCASE
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground/80">
              <input
                type="checkbox"
                checked={noDashes}
                onChange={(e) => setNoDashes(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              No dashes
            </label>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Dices className="h-4 w-4" /> Generate {count} {version.toUpperCase()}{count === 1 ? "" : "s"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - generated with crypto.randomUUID, never stored or sent.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {uuids.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Dices className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your UUIDs appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Version 4 (random) or version 7 (time-ordered) UUIDs, generated with the
                browser's cryptographic random generator.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">{uuids.length} UUID{uuids.length === 1 ? "" : "s"} generated</p>
                <button
                  type="button" onClick={copyAll}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  <Copy className="h-4 w-4" /> Copy all
                </button>
              </div>
              <div className="max-h-80 space-y-1.5 overflow-auto">
                {uuids.map((u) => (
                  <div
                    key={u}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs"
                  >
                    <span className="break-all">{u}</span>
                    <button
                      type="button" onClick={() => copyOne(u)} aria-label={`Copy ${u}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Copy className={`h-3.5 w-3.5 ${copied === u ? "text-emerald-500" : ""}`} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
