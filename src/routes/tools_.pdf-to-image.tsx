// /tools/pdf-to-image - Turn PDF pages into JPG or PNG images, 100% in-browser.
// No upload, no watermark. Choose pages and resolution; one image or a ZIP of many.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileImage, FileUp, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, canvasToBlob, formatBytes } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/pdf-to-image")({
  head: () => {
    const seo = getToolSeoMeta("pdf-to-image");
    const canonical = "https://iconvault.site/tools/pdf-to-image";
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
  component: PdfToImage,
});

const DPIS = [72, 150, 300] as const;

/** Parse "1-3, 5" into a sorted list of 1-based page numbers, capped at pageCount. */
function parsePages(input: string, pageCount: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const set = new Set<number>();
  for (const part of trimmed.split(",")) {
    const m = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Math.min(Number(m[1]), Number(m[2]));
      const b = Math.max(Number(m[1]), Number(m[2]));
      for (let n = a; n <= b; n++) if (n >= 1 && n <= pageCount) set.add(n);
    } else if (/^\d+$/.test(part.trim())) {
      const n = Number(part.trim());
      if (n >= 1 && n <= pageCount) set.add(n);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function PdfToImage() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pdf-to-image", isPro);
  const seo = getToolSeo("pdf-to-image");

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [dpi, setDpi] = useState<number>(150);
  const [pagesInput, setPagesInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) {
      setError("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs";
      const buf = new Uint8Array(await f.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      setPageCount(pdf.numPages);
      setFile(f);
      setPagesInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that PDF.");
    } finally {
      setBusy(false);
    }
  }, []);

  const convert = useCallback(async () => {
    if (!file || busy || !trial.canUse || pageCount === 0) return;
    setBusy(true);
    setError(null);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs";
      const buf = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const selected = parsePages(pagesInput, pdf.numPages);
      if (selected.length === 0) throw new Error("No valid pages selected. Try something like 1-3, 5.");

      const mime = format === "jpeg" ? "image/jpeg" : "image/png";
      const ext = format === "jpeg" ? "jpg" : "png";
      const outputs: { blob: Blob; name: string }[] = [];
      for (const n of selected) {
        const page = await pdf.getPage(n);
        const vp = page.getViewport({ scale: dpi / 72 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d")!;
        if (format === "jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
        const b = await canvasToBlob(canvas, mime, format === "jpeg" ? 0.92 : undefined);
        outputs.push({ blob: b, name: `${baseName(file.name)}-p${n}.${ext}` });
      }

      if (outputs.length === 1) {
        downloadBlob(outputs[0]!.blob, outputs[0]!.name);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const o of outputs) zip.file(o.name, o.blob);
        const zipped = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipped, `${baseName(file.name)}-pages.zip`);
      }
      trial.recordUse();
      toast.success(outputs.length === 1 ? "Page image downloaded" : `${outputs.length} page images downloaded as ZIP`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not render those pages.");
    } finally {
      setBusy(false);
    }
  }, [file, busy, trial, pageCount, format, dpi, pagesInput]);

  return (
    <ToolPageShell toolId="pdf-to-image" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="PDF to Image" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void pickFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{file ? file.name : "Drop a PDF file"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pageCount > 0 ? `${pageCount} page${pageCount > 1 ? "s" : ""} found` : "One PDF at a time"}
            </p>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickFile(f); e.target.value = ""; }} />
          </div>

          {pageCount > 0 && (
            <>
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Image format</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["jpeg", "png"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-sm font-bold uppercase transition",
                        format === f
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {f === "jpeg" ? "JPG" : "PNG"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Resolution</p>
                <div className="grid grid-cols-3 gap-2">
                  {DPIS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDpi(d)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-sm font-bold transition",
                        dpi === d
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {d} DPI
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">300 DPI is print quality, 72 DPI is screen quality.</p>
              </div>

              <div>
                <label htmlFor="pdf-pages" className="mb-2 block text-[13px] font-medium text-foreground/80">Pages</label>
                <input
                  id="pdf-pages"
                  type="text"
                  value={pagesInput}
                  onChange={(e) => setPagesInput(e.target.value)}
                  placeholder="1-3, 5"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Leave empty for all {pageCount} pages.</p>
              </div>
            </>
          )}

          <ActionButton busy={busy} disabled={!file || pageCount === 0 || !trial.canUse} onClick={convert}>
            <Download className="h-4 w-4" /> {busy ? "Rendering…" : "Download images"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!file ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileImage className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your PDF appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Each page renders as a separate image. Everything runs in your browser.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {pageCount} page{pageCount > 1 ? "s" : ""} - {formatBytes(file.size)}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Rendering as {format === "jpeg" ? "JPG" : "PNG"} at {dpi} DPI
                {pagesInput.trim() ? `, pages ${pagesInput.trim()}` : ", all pages"}.
              </p>
              {file && (
                <button
                  type="button"
                  onClick={() => { setFile(null); setPageCount(0); setPagesInput(""); }}
                  className="mt-1 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Remove file
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
