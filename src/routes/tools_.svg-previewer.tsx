// /tools/svg-previewer - Paste raw SVG, get instant validated preview with zoom,
// background toggle and .svg download. 100% in-browser.

import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileImage, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/svg-previewer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/svg-previewer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/svg-previewer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/svg-previewer";
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
  component: SvgPreviewTool,
});

type Bg = "checker" | "white" | "dark";

function validateSvg(code: string): { ok: boolean; error?: string } {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Nothing to preview yet." };
  const doc = new DOMParser().parseFromString(trimmed, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    const msg = parserError.textContent?.replace(/\s+/g, " ").trim().slice(0, 220) ?? "Invalid XML.";
    return { ok: false, error: `Not valid SVG: ${msg}` };
  }
  if (doc.documentElement.nodeName.toLowerCase() !== "svg") {
    return { ok: false, error: "The root element is not <svg>. Wrap your markup in an <svg> tag." };
  }
  return { ok: true };
}

function SvgPreviewTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("svg-previewer", isPro);
  const seo = toolSeo;

  const [code, setCode] = useState("");
  const [zoom, setZoom] = useState(100);
  const [bg, setBg] = useState<Bg>("checker");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validation = useMemo(() => validateSvg(code), [code]);

  const loadFromFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = () => setCode(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Could not read that file.");
    reader.readAsText(f);
  }, []);

  const download = useCallback(() => {
    if (!validation.ok || !trial.canUse) return;
    downloadBlob(new Blob([code.trim()], { type: "image/svg+xml" }), "image.svg");
    trial.recordUse();
    toast.success("SVG downloaded");
  }, [code, validation.ok, trial]);

  const copyCode = useCallback(async () => {
    if (!validation.ok || !trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      trial.recordUse();
      toast.success("SVG code copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  }, [code, validation.ok, trial]);

  const bgClass =
    bg === "checker"
      ? "bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:24px_24px]"
      : bg === "white" ? "bg-white" : "bg-zinc-900";

  return (
    <ToolPageShell toolId="svg-previewer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SVG Previewer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Paste your SVG markup</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40"
            >
              <Upload className="h-3.5 w-3.5" /> Load .svg file
            </button>
            <input
              ref={fileRef} type="file" accept=".svg,image/svg+xml" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFromFile(f); }}
            />
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="#14b8a6"/>\n</svg>'}
            className="h-64 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed focus:border-primary/60 focus:outline-none"
          />

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Zoom</p>
              <span className="text-[13px] font-bold text-primary">{zoom}%</span>
            </div>
            <input
              type="range" min={10} max={400} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Preview background</p>
            <div className="flex gap-2">
              {(["checker", "white", "dark"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBg(b)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold capitalize transition",
                    bg === b ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <ActionButton disabled={!validation.ok || !trial.canUse} onClick={download}>
              <Download className="h-4 w-4" /> Download .svg
            </ActionButton>
            <ActionButton disabled={!validation.ok || !trial.canUse} onClick={copyCode}>
              <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-[13px] font-medium text-foreground/80">Live preview</p>
          {!code.trim() ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
              <FileImage className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your SVG appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Paste markup on the left and the preview renders instantly with validation.
              </p>
            </div>
          ) : !validation.ok ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-red-500/40 bg-red-500/5 p-6 text-center">
              <p className="font-semibold text-red-500">SVG error</p>
              <p className="mt-1 max-w-md font-mono text-xs text-red-400">{validation.error}</p>
            </div>
          ) : (
            <div className={cn("flex min-h-[340px] items-center justify-center overflow-auto rounded-xl border border-border p-6", bgClass)}>
              <div
                style={{ width: `${zoom}%`, maxWidth: "100%" }}
                dangerouslySetInnerHTML={{ __html: code.trim() }}
              />
            </div>
          )}
          {validation.ok && code.trim() && (
            <p className="mt-2 text-xs text-emerald-500 font-medium">Valid SVG markup.</p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
