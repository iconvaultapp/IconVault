// /tools/image-to-pdf - Combine images into a PDF, 100% in-browser.
// No upload, no watermark. Images are centered and scaled to fit, never stretched or cropped.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileImage, FileText, FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/image-to-pdf";
import toolSeoMeta from "@/lib/tool-seo-meta-data/image-to-pdf";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, formatBytes, loadImageFile } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/image-to-pdf")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/image-to-pdf";
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
  component: ImageToPdf,
});

type Item = { id: number; file: File; name: string; size: number; url: string };

let nextId = 1;

const PAGE_SIZES = [
  { id: "fit", label: "Fit image", hint: "Each page matches its image" },
  { id: "a4", label: "A4", hint: "595 x 842 px" },
  { id: "letter", label: "Letter", hint: "612 x 792 px" },
] as const;

const MARGINS = [
  { id: "none", label: "None", px: 0 },
  { id: "small", label: "Small", px: 24 },
  { id: "large", label: "Large", px: 48 },
] as const;

const A4 = { w: 595.28, h: 841.89 };
const LETTER = { w: 612, h: 792 };

function ImageToPdf() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-to-pdf", isPro);
  const seo = toolSeo;

  const [items, setItems] = useState<Item[]>([]);
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("fit");
  const [margin, setMargin] = useState<"none" | "small" | "large">("none");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    const picked = list.filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) {
      setError("Please choose image files (JPG, PNG, WebP, GIF or BMP).");
      return;
    }
    setItems((p) => [...p, ...picked.map((f) => ({ id: nextId++, file: f, name: f.name, size: f.size, url: URL.createObjectURL(f) }))]);
    setError(null);
  }, []);

  const removeItem = (id: number) =>
    setItems((p) => {
      const gone = p.find((i) => i.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return p.filter((i) => i.id !== id);
    });

  const create = useCallback(async () => {
    if (items.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const { jsPDF } = await import("jspdf");
      const marginPx = MARGINS.find((m) => m.id === margin)!.px;

      const images = await Promise.all(
        items.map(async (item) => {
          const img = await loadImageFile(item.file);
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext("2d")!.drawImage(img, 0, 0);
            c.toBlob(
              (b) => {
                if (!b) return reject(new Error("Could not encode " + item.name));
                const r = new FileReader();
                r.onload = () => resolve(String(r.result));
                r.onerror = () => reject(new Error("Could not read " + item.name));
                r.readAsDataURL(b);
              },
              item.file.type === "image/png" ? "image/png" : "image/jpeg",
              0.92,
            );
          });
          return { img, dataUrl, format: item.file.type === "image/png" ? "PNG" : "JPEG" };
        }),
      );

      const pages = images.map(({ img }) => {
        if (pageSize === "a4") return { w: A4.w, h: A4.h };
        if (pageSize === "letter") return { w: LETTER.w, h: LETTER.h };
        return { w: img.naturalWidth, h: img.naturalHeight };
      });

      const doc = new jsPDF({ unit: "px", format: [pages[0]!.w, pages[0]!.h] });
      for (const [idx, { img, dataUrl, format }] of images.entries()) {
        const { w: pw, h: ph } = pages[idx]!;
        if (idx > 0) doc.addPage([pw, ph]);
        // Scale to fit inside the page minus margin, never stretching or cropping.
        const s = Math.min((pw - marginPx * 2) / img.naturalWidth, (ph - marginPx * 2) / img.naturalHeight, 1);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        const x = (pw - dw) / 2;
        const y = (ph - dh) / 2;
        doc.addImage(dataUrl, format, x, y, dw, dh);
      }

      const blob = doc.output("blob");
      downloadBlob(blob, `${baseName(items[0]!.name)}${items.length > 1 ? "-images" : ""}.pdf`);
      trial.recordUse();
      toast.success(`PDF with ${images.length} page${images.length > 1 ? "s" : ""} downloaded`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the PDF.");
    } finally {
      setBusy(false);
    }
  }, [items, busy, trial, pageSize, margin]);

  return (
    <ToolPageShell toolId="image-to-pdf" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image to PDF" left={trial.left} />

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
            <p className="text-sm font-semibold">{items.length > 0 ? `${items.length} image${items.length > 1 ? "s" : ""} added` : "Drop image files"}</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, GIF or BMP. Each becomes one page.</p>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Page size</p>
            <div className="grid grid-cols-3 gap-2">
              {PAGE_SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPageSize(s.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center transition",
                    pageSize === s.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("block text-sm font-bold", pageSize === s.id ? "text-primary" : "text-foreground")}>{s.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Margin</p>
            <div className="grid grid-cols-3 gap-2">
              {MARGINS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMargin(m.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-bold transition",
                    margin === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={items.length === 0 || !trial.canUse} onClick={create}>
            <Download className="h-4 w-4" /> {busy ? "Building PDF…" : "Create PDF"}
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
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your pages appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Images stay in the order you add them and are centered on the page, never stretched or cropped.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                  <img src={item.url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{idx + 1}</span>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
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
