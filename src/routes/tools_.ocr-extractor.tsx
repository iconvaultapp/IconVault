// /tools/ocr-extractor - Extract text from images with on-device OCR (Tesseract.js).
// English, progress bar, copy + .txt download. Runs fully locally - first run downloads
// the language model once, then it is cached.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileText, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ocr-extractor")({
  head: () => {
    const seo = getToolSeoMeta("ocr-extractor");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: OcrTool,
});

function OcrTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ocr-extractor", isPro);
  const seo = getToolSeo("ocr-extractor");

  const [previewUrl, setPreviewUrl] = useState("");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const workerRef = useRef<any>(null);

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    fileRef.current = f;
    setPreviewUrl((u) => { if (u) URL.revokeObjectURL(u); return URL.createObjectURL(f); });
    setName(f.name.replace(/\.[^.]+$/, ""));
    setText("");
    setProgress(0);
    setStatus("");
    setError(null);
  }, []);

  const runOcr = useCallback(async () => {
    const f = fileRef.current;
    if (!f || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setText("");
    setProgress(0);
    try {
      const { createWorker } = await import("tesseract.js");
      if (!workerRef.current) {
        setStatus("Loading the English language model (first run only)...");
        workerRef.current = await createWorker("eng", 1, {
          logger: (m: any) => {
            if (m.status === "recognizing text") setProgress(Math.round((m.progress ?? 0) * 100));
            else if (m.status) setStatus(m.status === "loading tesseract core" ? "Loading OCR engine..." : "Loading the English language model (first run only)...");
          },
        });
      }
      setStatus("Reading text from the image...");
      const { data } = await workerRef.current.recognize(f);
      const out = String(data?.text ?? "").trim();
      setText(out);
      setProgress(100);
      setStatus("");
      trial.recordUse();
      if (!out) toast("No text found", { description: "The OCR engine could not find any readable text in this image." });
      else toast.success("Text extracted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed. Try a clearer image.");
    } finally {
      setBusy(false);
    }
  }, [busy, trial]);

  const copyText = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Text copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  }, [text]);

  const downloadTxt = useCallback(() => {
    if (!text || !trial.canUse) return;
    downloadBlob(new Blob([text], { type: "text/plain" }), `${name || "ocr"}.txt`);
    trial.recordUse();
    toast.success("Text file downloaded");
  }, [text, name, trial]);

  return (
    <ToolPageShell toolId="ocr-extractor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="OCR Extractor" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{name || "Drop an image with text"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Screenshots, scans and photos all work</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />
          </div>

          <ActionButton busy={busy} disabled={!previewUrl || !trial.canUse} onClick={runOcr}>
            <FileText className="h-4 w-4" /> {busy ? "Reading…" : "Extract text"}
          </ActionButton>

          {busy && (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{status || "Working..."} {progress > 0 && `${progress}%`}</p>
            </div>
          )}

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free extractions left - your image never leaves this device.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            OCR runs locally in your browser. The first run downloads the English language model once, then it is cached for instant use.
          </p>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            {!previewUrl ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Upload an image to extract its text</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  The image preview and the extracted text appear here.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <img src={previewUrl} alt="Source" className="max-h-56 rounded-lg" />
              </div>
            )}
          </div>

          {text !== "" && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Extracted text</p>
                <div className="flex gap-2">
                  <button
                    type="button" onClick={copyText}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button" onClick={downloadTxt}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40"
                  >
                    <Download className="h-3.5 w-3.5" /> .txt
                  </button>
                </div>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-sm leading-relaxed">
                {text || "No readable text found in this image."}
              </pre>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
