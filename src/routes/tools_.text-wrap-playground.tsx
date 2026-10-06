// /tools/text-wrap-playground - Compare CSS text-wrap: balance vs pretty
// vs stable side by side with live text and size controls. 100% in-browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/text-wrap-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/text-wrap-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/text-wrap-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/text-wrap-playground";
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
  component: TextWrapTool,
});

const DEFAULT_TEXT =
  "The quick brown fox jumps over the lazy dog near the riverbank at sunset while birds circle overhead.";

const MODES = [
  {
    id: "balance",
    name: "balance",
    desc: "Balances every line to roughly equal length. Best for headings and cards.",
    style: { textWrap: "balance" } as const,
  },
  {
    id: "pretty",
    name: "pretty",
    desc: "Like normal wrapping, but avoids orphans on the last line. Best for body copy.",
    style: { textWrap: "pretty" } as const,
  },
  {
    id: "stable",
    name: "stable",
    desc: "Prevents layout shift while editing: later lines never reflow when you type. Newer browsers only.",
    style: { textWrap: "stable" } as const,
  },
] as const;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function TextWrapTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("text-wrap-playground", isPro);
  const seo = toolSeo;

  const [text, setText] = useState(DEFAULT_TEXT);
  const [fontSize, setFontSize] = useState(20);
  const [boxWidth, setBoxWidth] = useState(100);

  const css = `.heading { text-wrap: balance; }\n.body-copy { text-wrap: pretty; }\n.editable { text-wrap: stable; }`;

  const copyCss = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(css);
    if (ok) {
      trial.recordUse();
      toast.success("CSS copied");
    } else {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="text-wrap-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Text Wrap Playground" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <p className="text-sm text-muted-foreground">
          One line of CSS fixes ugly ragged headlines and lonely last words. Drag the width slider to see each
          mode reflow live. <span className="font-mono">stable</span> needs a recent Chrome or Edge, other modes
          degrade to normal wrapping where unsupported.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-5 md:grid-cols-[1fr_220px_220px]">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Sample text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Font size: <span className="font-bold">{fontSize}px</span>
            </label>
            <input
              type="range"
              min={14}
              max={30}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Box width: <span className="font-bold">{boxWidth}%</span>
            </label>
            <input
              type="range"
              min={40}
              max={100}
              value={boxWidth}
              onChange={(e) => setBoxWidth(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {MODES.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-mono font-bold text-primary">text-wrap: {m.name}</h2>
            </div>
            <p className="mb-4 min-h-10 text-xs text-muted-foreground">{m.desc}</p>
            <div className="rounded-xl border border-border bg-background p-4">
              <div style={{ width: `${boxWidth}%` }}>
                <p style={{ ...m.style, fontSize }} className="font-semibold leading-snug">
                  {text || DEFAULT_TEXT}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">The CSS you need</h2>
          <ActionButton busy={false} disabled={!trial.canUse} onClick={copyCss}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
        </div>
        <pre
          className={cn(
            "overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-sky-300",
          )}
        >
          {css}
        </pre>
        {!isPro && (
          <p className="mt-2 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
