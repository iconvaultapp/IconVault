// /tools/unicode-escapes - Text to Unicode escape formats and back (U+XXXX, \uXXXX, \UXXXXXXXX, &#x;).

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/unicode-escapes")({
  head: () => {
    const seo = getToolSeoMeta("unicode-escapes");
    const canonical = "https://iconvault.site/tools/unicode-escapes";
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
  component: EscapesTool,
});

type Format = "uplus" | "backslash-u" | "backslash-U" | "html-hex";

const FORMATS: { key: Format; label: string; example: string }[] = [
  { key: "uplus", label: "U+XXXX", example: "U+0041 U+03C0" },
  { key: "backslash-u", label: "\\uXXXX", example: "\\u0041 \\u03C0" },
  { key: "backslash-U", label: "\\UXXXXXXXX", example: "\\U00000041" },
  { key: "html-hex", label: "&#x...;", example: "&#x41; &#x3C0;" },
];

const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");
const hex8 = (n: number) => n.toString(16).toUpperCase().padStart(8, "0");

function encode(text: string, format: Format): string {
  const cps = Array.from(text).map((ch) => ch.codePointAt(0) ?? 0);
  switch (format) {
    case "uplus":
      return cps.map((cp) => `U+${hex4(cp)}`).join(" ");
    case "backslash-u":
      return cps
        .map((cp) => {
          if (cp <= 0xffff) return `\\u${hex4(cp)}`;
          const hi = 0xd800 + ((cp - 0x10000) >> 10);
          const lo = 0xdc00 + ((cp - 0x10000) & 0x3ff);
          return `\\u${hex4(hi)}\\u${hex4(lo)}`;
        })
        .join("");
    case "backslash-U":
      return cps.map((cp) => `\\U${hex8(cp)}`).join("");
    case "html-hex":
      return cps.map((cp) => `&#x${cp.toString(16).toUpperCase()};`).join("");
  }
}

function decode(text: string): string {
  let out = text;
  out = out.replace(/\\U([0-9A-Fa-f]{8})/g, (_, h: string) => {
    const cp = parseInt(h, 16);
    return cp <= 0x10ffff ? String.fromCodePoint(cp) : _;
  });
  out = out.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  out = out.replace(/U\+([0-9A-Fa-f]{4,6})/g, (_, h: string) => {
    const cp = parseInt(h, 16);
    return cp <= 0x10ffff ? String.fromCodePoint(cp) : _;
  });
  out = out.replace(/&#x([0-9A-Fa-f]+);/g, (_, h: string) => {
    const cp = parseInt(h, 16);
    return cp <= 0x10ffff ? String.fromCodePoint(cp) : _;
  });
  return out;
}

function EscapesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("unicode-escapes", isPro);
  const seo = getToolSeo("unicode-escapes");

  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [format, setFormat] = useState<Format>("backslash-u");
  const [input, setInput] = useState("Hello π 👋");

  const output = useMemo(
    () => (mode === "encode" ? encode(input, format) : decode(input)),
    [input, mode, format],
  );

  const copy = async () => {
    if (!trial.canUse || !output) return;
    try {
      await navigator.clipboard.writeText(output);
      trial.recordUse();
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="unicode-escapes" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Unicode Escapes" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border p-1">
            {(
              [
                ["encode", "Text to escapes"],
                ["decode", "Escapes to text"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setMode(mode === "encode" ? "decode" : "encode"); setInput(output); }}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:border-primary/50"
          >
            <ArrowLeftRight className="h-4 w-4" /> Swap
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={!trial.canUse || !output}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50 disabled:opacity-40"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
        </div>

        {mode === "encode" && (
          <div className="mb-4">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Escape format</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormat(f.key)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition",
                    format === f.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("block font-mono text-sm font-bold", format === f.key && "text-primary")}>{f.label}</span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">{f.example}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">
              {mode === "encode" ? "Text" : "Escaped text (any of the 4 formats)"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={7}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Result</label>
            <textarea
              value={output}
              readOnly
              rows={7}
              className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 font-mono text-sm outline-none"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {mode === "encode"
            ? "Astral characters (emoji) become surrogate pairs in \\uXXXX and full code points in the other formats."
            : "Decodes \\UXXXXXXXX, \\uXXXX, U+XXXX and &#x...; - formats can be mixed in one input."}
          {!isPro && ` ${trial.left} of ${TOOL_TRIAL_LIMIT} free copies left.`}
        </p>
      </div>
    </ToolPageShell>
  );
}
