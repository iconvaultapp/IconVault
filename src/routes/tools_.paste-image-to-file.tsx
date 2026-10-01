// /tools/paste-image-to-file - Paste an image from your clipboard and save it as a file.
// 100% in-browser. Supports Ctrl+V pasting, drag-drop and browsing.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardPaste, Download, FileImage } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { canvasToBlob, fillBackground, loadImageFile } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/paste-image-to-file")({
  head: () => {
    const seo = getToolSeoMeta("paste-image-to-file");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PasteImageToFile,
});

const FORMATS = [
  { id: "png", label: "PNG", mime: "image/png", ext: "png" },
  { id: "jpeg", label: "JPG", mime: "image/jpeg", ext: "jpg" },
  { id: "webp", label: "WebP", mime: "image/webp", ext: "webp" },
] as const;

type FormatId = (typeof FORMATS)[number]["id"];

function defaultName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `pasted-image-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function PasteImageToFile() {
  const { isPro } = usePlan();
  const trial = useToolTrial("paste-image-to-file", isPro);
  const seo = getToolSeo("paste-image-to-file");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [name, setName] = useState(defaultName);
  const [formatId, setFormatId] = useState<FormatId>("png");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("That does not look like an image.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImg(loaded);
      setPreviewUrl(URL.createObjectURL(f));
      setDims({ w: loaded.naturalWidth, h: loaded.naturalHeight });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, [previewUrl]);

  // Global paste listener: press Ctrl+V anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.items ?? [])
        .find((it) => it.type.startsWith("image/"))
        ?.getAsFile();
      if (f) {
        e.preventDefault();
        void acceptFile(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [acceptFile]);

  const download = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const fmt = FORMATS.find((f) => f.id === formatId)!;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      if (formatId === "jpeg") fillBackground(canvas, "#ffffff");
      const blob = await canvasToBlob(canvas, fmt.mime, formatId === "png" ? undefined : 0.92);
      const clean = (name.trim() || defaultName()).replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${clean}.${fmt.ext}`);
      trial.recordUse();
      toast.success("Image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, formatId, name]);

  return (
    <ToolPageShell toolId="paste-image-to-file" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Paste Image to File" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <ClipboardPaste className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{img ? "Image pasted" : "Press Ctrl+V to paste"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Or drop a file here, or click to browse</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }} />
          </div>

          <div>
            <label htmlFor="paste-name" className="mb-2 block text-[13px] font-medium text-foreground/80">File name</label>
            <input
              id="paste-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Save as</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormatId(f.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-bold transition",
                    formatId === f.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> {busy ? "Saving…" : "Download image"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free saves left - everything stays on your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileImage className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Nothing pasted yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Copy any image (screenshot, photo, meme) and press Ctrl+V anywhere on this page. It never leaves your device.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={previewUrl} alt="Pasted" className="max-h-72 rounded" />
              </div>
              <p className="text-sm text-muted-foreground">
                {dims.w} x {dims.h} px
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
