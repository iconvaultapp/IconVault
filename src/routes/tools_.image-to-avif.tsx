// /tools/image-to-avif - Convert any image to next-gen AVIF, 100% in-browser.
// No upload, no watermark. Bulk support with per-file or ZIP download.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileImage, FileUp, PackageOpen, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, canvasToBlob, formatBytes, loadImageFile } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/image-to-avif")({
  head: () => {
    const seo = getToolSeoMeta("image-to-avif");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ImageToAvif,
});

type Item = {
  id: number;
  file: File;
  name: string;
  size: number;
  status: "ready" | "done" | "error";
};

let nextId = 1;

function ImageToAvif() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-to-avif", isPro);
  const seo = getToolSeo("image-to-avif");

  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    const picked = list.filter((f) => f.type.startsWith("image/") && f.type !== "image/avif");
    if (picked.length === 0) {
      setError("Please choose image files (PNG, JPG, GIF, BMP or WebP).");
      return;
    }
    setItems((p) => [...p, ...picked.map((f) => ({ id: nextId++, file: f, name: f.name, size: f.size, status: "ready" as const }))]);
    setError(null);
  }, []);

  const removeItem = (id: number) => setItems((p) => p.filter((i) => i.id !== id));

  const convert = useCallback(async () => {
    if (items.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      // Probe AVIF encoding support first: canvasToBlob returns null when unsupported.
      const probe = document.createElement("canvas");
      probe.width = 2;
      probe.height = 2;
      probe.getContext("2d")!.fillStyle = "#000";
      probe.getContext("2d")!.fillRect(0, 0, 2, 2);
      try {
        await canvasToBlob(probe, "image/avif", 0.9);
      } catch {
        throw new Error("This browser cannot encode AVIF - try Chrome.");
      }

      const outputs: { blob: Blob; name: string }[] = [];
      for (const item of items) {
        try {
          const img = await loadImageFile(item.file);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          const b = await canvasToBlob(canvas, "image/avif", quality / 100);
          outputs.push({ blob: b, name: `${baseName(item.name)}.avif` });
          setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: "done" } : i)));
        } catch {
          setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: "error" } : i)));
        }
      }
      if (outputs.length === 0) throw new Error("Could not convert those files. Try different ones.");
      if (outputs.length === 1) {
        downloadBlob(outputs[0]!.blob, outputs[0]!.name);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const o of outputs) zip.file(o.name, o.blob);
        const zipped = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipped, "image-to-avif.zip");
      }
      trial.recordUse();
      toast.success(outputs.length === 1 ? "AVIF downloaded" : `${outputs.length} AVIFs downloaded as ZIP`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }, [items, busy, trial, quality]);

  return (
    <ToolPageShell toolId="image-to-avif" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image to AVIF" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{items.length > 0 ? `${items.length} file${items.length > 1 ? "s" : ""} added` : "Drop image files"}</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF, BMP or WebP, as many as you like</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/bmp,image/webp" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="img-avif-q" className="text-[13px] font-medium text-foreground/80">AVIF quality</label>
              <span className="text-sm font-bold text-primary">{quality}%</span>
            </div>
            <input
              id="img-avif-q"
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">AVIF beats WebP on size at the same visual quality. Encoding needs a modern browser.</p>
          </div>

          <ActionButton busy={busy} disabled={items.length === 0 || !trial.canUse} onClick={convert}>
            <Download className="h-4 w-4" /> {busy ? "Converting…" : `Convert ${items.length > 0 ? `(${items.length})` : ""}`}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileImage className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your images appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                AVIF is the smallest modern format, supported by all major browsers. Everything runs in your browser.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <PackageOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size)}
                      {item.status === "done" && <span className="ml-2 font-semibold text-green-500">Converted</span>}
                      {item.status === "error" && <span className="ml-2 font-semibold text-red-500">Failed</span>}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${item.name}`}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
