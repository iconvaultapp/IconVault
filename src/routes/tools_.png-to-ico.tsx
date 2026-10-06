// /tools/png-to-ico - Turn a PNG into a real Windows .ico file (16/32/48)
// with PNG-compressed entries, 100% in-browser. No upload, no watermark.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/png-to-ico";
import toolSeoMeta from "@/lib/tool-seo-meta-data/png-to-ico";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/png-to-ico")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/png-to-ico";
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
  component: IcoTool,
});

const ALL_SIZES = [16, 32, 48] as const;

function loadFile(f: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${f.name}`)); };
    img.src = url;
  });
}

/** Build a real ICO file from PNG blobs (PNG-compressed entries work on Vista+). */
async function buildIco(img: HTMLImageElement, sizes: number[]): Promise<Blob> {
  const entries: { size: number; png: Uint8Array }[] = [];
  for (const size of sizes) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error(`Could not encode ${size}px entry`);
    entries.push({ size, png: new Uint8Array(await blob.arrayBuffer()) });
  }

  const count = entries.length;
  const headerSize = 6 + count * 16;
  const total = headerSize + entries.reduce((a, e) => a + e.png.length, 0);
  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // ICO header: reserved(0), type(1 = icon), count
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);

  let offset = headerSize;
  for (const [i, entry] of entries.entries()) {
    const o = 6 + i * 16;
    bytes[o] = entry.size >= 256 ? 0 : entry.size; // 0 means 256
    bytes[o + 1] = entry.size >= 256 ? 0 : entry.size;
    bytes[o + 2] = 0; // color count
    bytes[o + 3] = 0; // reserved
    view.setUint16(o + 4, 1, true); // planes
    view.setUint16(o + 6, 32, true); // bit count
    view.setUint32(o + 8, entry.png.length, true); // image size
    view.setUint32(o + 12, offset, true); // image offset
    bytes.set(entry.png, offset);
    offset += entry.png.length;
  }
  return new Blob([buf], { type: "image/x-icon" });
}

function IcoTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("png-to-ico", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [sizes, setSizes] = useState<number[]>([...ALL_SIZES]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a PNG, JPG or WebP image.");
      return;
    }
    try {
      const loaded = await loadFile(f);
      setImg(loaded);
      setName(f.name.replace(/\.[^.]+$/, ""));
      setPreviewUrl(URL.createObjectURL(f));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const toggleSize = (s: number) =>
    setSizes((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s].sort((a, b) => a - b)));

  const convert = useCallback(async () => {
    if (!img || busy || !trial.canUse || sizes.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const ico = await buildIco(img, sizes);
      downloadBlob(ico, `${name || "favicon"}.ico`);
      trial.recordUse();
      toast.success("ICO file downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, sizes, name]);

  return (
    <ToolPageShell toolId="png-to-ico" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="PNG to ICO" left={trial.left} />

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
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{name || "Drop a PNG image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Square images give the sharpest icons</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Sizes to include</p>
            <div className="flex gap-2">
              {ALL_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSize(s)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    sizes.includes(s)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}px
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              All three is safest - browsers and Windows pick the sharpest fit.
            </p>
          </div>

          <ActionButton busy={busy} disabled={!img || sizes.length === 0 || !trial.canUse} onClick={convert}>
            <Download className="h-4 w-4" /> {busy ? "Building…" : "Download .ico"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your source image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The converter builds a standards-compliant .ico with PNG-compressed entries for Windows Vista and newer.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-6">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-6">
                <img src={previewUrl} alt="Source" className="max-h-56 rounded" />
              </div>
              <div className="flex items-end gap-4">
                {sizes.map((s) => (
                  <div key={s} className="flex flex-col items-center gap-1">
                    <img src={previewUrl} alt={`${s}px`} width={s} height={s} className="rounded" />
                    <span className="text-xs font-bold text-muted-foreground">{s}px</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
