// /tools/image-to-base64 - Turn an image into a Base64 data URI, 100% in-browser.
// No upload, no watermark. Copy the result straight into HTML or CSS.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, FileImage, FileUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/image-to-base64";
import toolSeoMeta from "@/lib/tool-seo-meta-data/image-to-base64";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { canvasToBlob, fileToDataUrl, formatBytes, loadImageFile } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/image-to-base64")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/image-to-base64";
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
  component: ImageToBase64,
});

const ENCODINGS = [
  { id: "original", label: "Keep original", hint: "Same format as the file" },
  { id: "webp", label: "WebP", hint: "Much smaller" },
  { id: "jpeg", label: "JPEG", hint: "Much smaller" },
] as const;

type Encoding = (typeof ENCODINGS)[number]["id"];

function ImageToBase64() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-to-base64", isPro);
  const seo = toolSeo;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [encoding, setEncoding] = useState<Encoding>("original");
  const [result, setResult] = useState<{ uri: string; bytes: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const pickFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, [previewUrl]);

  const encode = useCallback(async () => {
    if (!file || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      let uri: string;
      if (encoding === "original") {
        uri = await fileToDataUrl(file);
      } else {
        const img = await loadImageFile(file);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        if (encoding === "jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        const blob = await canvasToBlob(canvas, encoding === "jpeg" ? "image/jpeg" : "image/webp", 0.9);
        uri = await fileToDataUrl(blob);
      }
      setResult({ uri, bytes: new TextEncoder().encode(uri).length });
      trial.recordUse();
      toast.success("Image encoded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not encode that image.");
    } finally {
      setBusy(false);
    }
  }, [file, busy, trial, encoding]);

  const copy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.uri);
      toast.success("Copied to clipboard");
    } catch {
      outputRef.current?.select();
      setError("Copy failed: select the text manually and press Ctrl+C.");
    }
  }, [result]);

  return (
    <ToolPageShell toolId="image-to-base64" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image to Base64" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{file ? file.name : "Drop an image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {file ? formatBytes(file.size) : "PNG, JPG, WebP, GIF or BMP"}
            </p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Encoding</p>
            <div className="space-y-2">
              {ENCODINGS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { setEncoding(e.id); setResult(null); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition",
                    encoding === e.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("text-sm font-bold", encoding === e.id ? "text-primary" : "text-foreground")}>{e.label}</span>
                  <span className="text-xs text-muted-foreground">{e.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">WebP and JPEG can be much smaller than the original file.</p>
          </div>

          <ActionButton busy={busy} disabled={!file || !trial.canUse} onClick={encode}>
            <RefreshCw className="h-4 w-4" /> {busy ? "Encoding…" : "Encode image"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              {previewUrl ? (
                <>
                  <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                    <img src={previewUrl} alt="Source" className="max-h-56 rounded" />
                  </div>
                  <p className="mt-4 font-semibold">Ready to encode</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Press "Encode image" and the data URI appears here, ready to copy.
                  </p>
                </>
              ) : (
                <>
                  <FileImage className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-semibold">Your image appears here</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    A data URI embeds the image directly in HTML or CSS: no separate file to host.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  Data URI <span className="ml-1 font-normal text-muted-foreground">({formatBytes(result.bytes)})</span>
                </p>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
              </div>
              <textarea
                ref={outputRef}
                readOnly
                value={result.uri}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="h-full min-h-[280px] w-full flex-1 resize-none rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground outline-none focus:border-primary"
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
