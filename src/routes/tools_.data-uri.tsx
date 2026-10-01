// /tools/data-uri - Convert any file to a data URI with img-tag and CSS
// background snippets. 100% in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileUp, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/data-uri")({
  head: () => {
    const seo = getToolSeoMeta("data-uri");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: DataUriTool,
});

function readAsDataURL(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Could not read ${f.name}`));
    r.readAsDataURL(f);
  });
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function DataUriTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("data-uri", isPro);
  const seo = getToolSeo("data-uri");

  const [fileName, setFileName] = useState("");
  const [mime, setMime] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [uri, setUri] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(
    async (f: File) => {
      if (busy || !trial.canUse) return;
      setBusy(true);
      setError(null);
      try {
        const dataUrl = await readAsDataURL(f);
        setFileName(f.name);
        setMime(f.type || "application/octet-stream");
        setFileSize(f.size);
        setUri(dataUrl);
        setShowFull(false);
        trial.recordUse();
        toast.success("Data URI generated");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that file.");
      } finally {
        setBusy(false);
      }
    },
    [busy, trial],
  );

  const copyText = useCallback(async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed in this browser.");
    }
  }, []);

  const download = useCallback(() => {
    if (!uri) return;
    downloadBlob(new Blob([uri], { type: "text/plain" }), `${fileName || "file"}.data-uri.txt`);
    toast.success("Data URI downloaded");
  }, [uri, fileName]);

  const imgSnippet = uri ? `<img src="${uri}" alt="${fileName.replace(/"/g, "")}">` : "";
  const cssSnippet = uri ? `background-image: url("${uri}");` : "";
  const overhead = fileSize > 0 ? Math.round(((uri.length - fileSize) / fileSize) * 100) : 0;
  const isImage = mime.startsWith("image/");

  return (
    <ToolPageShell toolId="data-uri" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Data URI Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) void acceptFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{fileName || "Drop any file"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Images, fonts, SVGs, PDFs, anything</p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void acceptFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => inputRef.current?.click()}>
            <Link2 className="h-4 w-4" /> {busy ? "Encoding..." : "Choose a file"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left. Files never leave your device.
            </p>
          )}
          {fileSize > 1024 * 1024 && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              This file is over 1 MB. Data URIs grow about 33% larger than the file, so consider
              hosting big assets instead of inlining them.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4">
          {!uri ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
              <Link2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your data URI appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a file and get a ready-to-paste data URI plus img-tag and CSS snippets.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold">{fileName}</span>
                  <span className="text-muted-foreground">{mime}</span>
                  <span className="text-muted-foreground">
                    {fmtBytes(fileSize)} to {fmtBytes(uri.length)} (about {overhead}% overhead)
                  </span>
                </div>
                {isImage && (
                  <div className="mb-3 flex justify-center rounded-xl border border-border bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-6">
                    <img src={uri} alt={fileName} className="max-h-48 rounded" />
                  </div>
                )}
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Data URI</p>
                <pre className="max-h-40 overflow-auto break-all rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {showFull ? uri : uri.slice(0, 600) + (uri.length > 600 ? "..." : "")}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(uri, "Data URI")}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/40"
                  >
                    <Copy className="h-4 w-4" /> Copy URI
                  </button>
                  <button
                    type="button"
                    onClick={download}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/40"
                  >
                    <Download className="h-4 w-4" /> Download .txt
                  </button>
                  {uri.length > 600 && (
                    <button
                      type="button"
                      onClick={() => setShowFull((v) => !v)}
                      className="rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      {showFull ? "Collapse" : "Show full"}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-2 text-[13px] font-medium text-foreground/80">HTML img tag</p>
                <pre className="max-h-32 overflow-auto break-all rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {imgSnippet.slice(0, 500) + (imgSnippet.length > 500 ? "..." : "")}
                </pre>
                <button
                  type="button"
                  onClick={() => copyText(imgSnippet, "img tag")}
                  className="mt-3 flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy img tag
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-2 text-[13px] font-medium text-foreground/80">CSS background</p>
                <pre className="max-h-32 overflow-auto break-all rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {cssSnippet.slice(0, 500) + (cssSnippet.length > 500 ? "..." : "")}
                </pre>
                <button
                  type="button"
                  onClick={() => copyText(cssSnippet, "CSS snippet")}
                  className="mt-3 flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy CSS
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
