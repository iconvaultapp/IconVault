// /tools/pinyin-converter - convert Chinese text to Pinyin with tone marks,
// tone numbers or no tones. Segmented char-by-char output. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Languages } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/pinyin-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/pinyin-converter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/pinyin-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/pinyin-converter";
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
  component: PinyinConverterTool,
});

type ToneStyle = "symbol" | "num" | "none";

const TONE_STYLES: { id: ToneStyle; label: string; example: string }[] = [
  { id: "symbol", label: "Tone marks", example: "hàn yǔ" },
  { id: "num", label: "Tone numbers", example: "han4 yu3" },
  { id: "none", label: "No tones", example: "han yu" },
];

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

let pinyinPromise: Promise<typeof import("pinyin-pro")> | null = null;

function loadPinyin(): Promise<typeof import("pinyin-pro")> {
  if (!pinyinPromise) pinyinPromise = import("pinyin-pro");
  return pinyinPromise;
}

async function toPinyin(text: string, tone: ToneStyle): Promise<string> {
  const mod = await loadPinyin();
  const segs: string[] = [];
  for (const ch of text) {
    if (CJK_RE.test(ch)) {
      const arr = mod.pinyin(ch, { toneType: tone, type: "array" }) as string[];
      segs.push(arr[0] ? `${ch}(${arr[0]})` : ch);
    } else {
      segs.push(ch);
    }
  }
  return segs.join("");
}

function PinyinConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pinyin-converter", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [tone, setTone] = useState<ToneStyle>("symbol");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convert = async () => {
    if (!input.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      setOutput(await toPinyin(input, tone));
      setCopied(false);
      trial.recordUse();
      toast.success("Converted to Pinyin");
    } catch {
      setError("Could not load the Pinyin dictionary. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        toast.success("Pinyin copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="pinyin-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Pinyin Converter" left={trial.left} />

      <div className="mb-6">
        <span className="mb-3 block text-sm font-bold">Tone style</span>
        <div className="flex flex-wrap gap-2">
          {TONE_STYLES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm transition",
                tone === t.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span className={cn("block font-bold", tone === t.id ? "text-primary" : "text-foreground")}>
                {t.label}
              </span>
              <span className="block font-mono text-xs text-muted-foreground">{t.example}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Chinese text</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入中文，例如：你好世界"
            spellCheck={false}
            className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 text-[15px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Pinyin output</span>
            <button
              type="button"
              onClick={copy}
              disabled={!output}
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
              className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 text-[15px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Languages className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="px-6 text-sm font-semibold text-muted-foreground">
                Each character is shown with its Pinyin in brackets, e.g. 你(nǐ)好(hǎo)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <ActionButton busy={busy} disabled={!input.trim() || !trial.canUse} onClick={convert}>
          {busy ? "Loading dictionary…" : "Convert to Pinyin"}
        </ActionButton>
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - runs fully in your browser.
          </p>
        )}
      </div>

      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        The Pinyin dictionary is loaded on demand the first time you convert (a few hundred KB), then cached.
        Pinyin reflects the most common reading of each character; characters with multiple readings use the default one.
      </p>
    </ToolPageShell>
  );
}
