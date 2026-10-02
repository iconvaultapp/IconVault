// /tools/string-obfuscator - mask text items: keep first N / last N chars,
// presets for emails and phone numbers. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/string-obfuscator")({
  head: () => {
    const seo = getToolSeoMeta("string-obfuscator");
    const canonical = "https://iconvault.site/tools/string-obfuscator";
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
  component: StringObfuscatorTool,
});

type Mode = "general" | "email" | "phone";

const MASK_CHARS = ["*", "#", "•", "x", "_"];

function maskGeneral(item: string, firstN: number, lastN: number, maskChar: string): string {
  const chars = [...item];
  const n = chars.length;
  if (n === 0) return "";
  if (n <= firstN + lastN) return item;
  const head = chars.slice(0, firstN).join("");
  const tail = lastN > 0 ? chars.slice(n - lastN).join("") : "";
  return `${head}${maskChar.repeat(n - firstN - lastN)}${tail}`;
}

function maskEmail(item: string): string {
  const at = item.lastIndexOf("@");
  if (at <= 0 || at === item.length - 1) return item;
  const local = item.slice(0, at);
  const domain = item.slice(at + 1);
  return `${local.charAt(0)}***@${domain}`;
}

function maskPhone(item: string, maskChar: string): string {
  const chars = [...item];
  if (chars.length <= 4) return item;
  return `${maskChar.repeat(chars.length - 4)}${chars.slice(-4).join("")}`;
}

function StringObfuscatorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("string-obfuscator", isPro);
  const seo = getToolSeo("string-obfuscator");

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("general");
  const [firstN, setFirstN] = useState(1);
  const [lastN, setLastN] = useState(4);
  const [maskChar, setMaskChar] = useState("*");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    return input
      .split("\n")
      .map((line) => {
        if (mode === "email") return maskEmail(line);
        if (mode === "phone") return maskPhone(line, maskChar);
        return maskGeneral(line, firstN, lastN, maskChar);
      })
      .join("\n");
  }, [input, mode, firstN, lastN, maskChar]);

  const setPreset = (m: Mode) => {
    setMode(m);
    if (m === "email") {
      setFirstN(1);
      setLastN(0);
    }
    if (m === "phone") {
      setFirstN(0);
      setLastN(4);
    }
  };

  const copy = () => {
    if (!output || !trial.canUse) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        trial.recordUse();
        toast.success("Masked list copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const numInput = (label: string, value: number, onChange: (v: number) => void) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={32}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(32, Number(e.target.value) || 0)))}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );

  return (
    <ToolPageShell toolId="string-obfuscator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="String Masker" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Text items (one per line)</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"john.doe@gmail.com\n+1-555-0123\nSecret API key 12345"}
            spellCheck={false}
            className="h-72 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Masked output</span>
            <button
              type="button"
              onClick={copy}
              disabled={!output || !trial.canUse}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {output ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <EyeOff className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                Type some items and the masked version appears here
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <span className="mb-3 block text-sm font-bold">Masking mode</span>
        <div className="mb-5 inline-flex gap-1 rounded-xl bg-muted p-1">
          {(
            [
              { id: "general", label: "General" },
              { id: "email", label: "Email preset" },
              { id: "phone", label: "Phone preset" },
            ] as { id: Mode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPreset(m.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-bold transition",
                mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={cn(mode !== "general" && "opacity-40")}>
            <div className="grid grid-cols-2 gap-3">
              {numInput("Keep first N chars", firstN, setFirstN)}
              {numInput("Keep last N chars", lastN, setLastN)}
            </div>
            {mode !== "general" && (
              <p className="mt-1 text-xs text-muted-foreground">Preset controls visibility automatically.</p>
            )}
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Mask character</span>
            <div className="flex gap-2">
              {MASK_CHARS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setMaskChar(c)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border font-mono text-lg font-bold transition",
                    maskChar === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-bold text-foreground">Examples</p>
            <p className="font-mono">john.doe@gmail.com → j***@gmail.com</p>
            <p className="font-mono">+1-555-0123 → ********0123</p>
            <p className="font-mono">API key (1/4) → A**********2345</p>
          </div>
        </div>

        {!isPro && (
          <p className="mt-4 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs in your browser, nothing is uploaded.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
