// /tools/sprite-sheet-generator - Combine multiple images into one PNG sprite sheet plus the
// matching CSS classes. 100% in-browser. No upload, no watermark.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileUp, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/sprite-sheet-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/sprite-sheet-generator";
import { loadImageFile, canvasToBlob, baseName } from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sprite-sheet-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/sprite-sheet-generator";
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
  component: SpriteTool,
});

type Sprite = { img: HTMLImageElement; name: string };
type Cell = { sprite: Sprite; x: number; y: number; w: number; h: number };

function sanitize(name: string): string {
  return (
    baseName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sprite"
  );
}

function SpriteTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sprite-sheet-generator", isPro);
  const seo = toolSeo;

  const [sprites, setSprites] = useState<Sprite[]>([]);
  const [layout, setLayout] = useState<"grid" | "packed">("grid");
  const [columns, setColumns] = useState("");
  const [padding, setPadding] = useState("0");
  const [retina, setRetina] = useState(false);
  const [prefix, setPrefix] = useState("sprite");
  const [css, setCss] = useState("");
  const [preview, setPreview] = useState("");
  const [built, setBuilt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please choose image files.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const loaded: Sprite[] = [];
      for (const f of list) {
        const img = await loadImageFile(f);
        loaded.push({ img, name: f.name });
      }
      setSprites((p) => [...p, ...loaded]);
      setBuilt(false);
      setCss("");
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read those images.");
    } finally {
      setBusy(false);
    }
  }, [trial]);

  const remove = (i: number) => {
    setSprites((p) => p.filter((_, idx) => idx !== i));
    setBuilt(false);
    setCss("");
  };

  const build = useCallback(async () => {
    if (sprites.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const pad = Math.max(0, parseInt(padding, 10) || 0);
      const cellW = Math.max(...sprites.map((s) => s.img.naturalWidth));
      const cellH = Math.max(...sprites.map((s) => s.img.naturalHeight));

      let cells: Cell[] = [];
      let sheetW = 0;
      let sheetH = 0;
      if (layout === "grid") {
        const colText = columns.trim();
        const cols = colText ? Math.max(1, parseInt(colText, 10) || 1) : Math.ceil(Math.sqrt(sprites.length));
        sprites.forEach((s, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          cells.push({ sprite: s, x: col * (cellW + pad) + pad / 2, y: row * (cellH + pad) + pad / 2, w: s.img.naturalWidth, h: s.img.naturalHeight });
        });
        const rows = Math.ceil(sprites.length / cols);
        sheetW = cols * cellW + (cols + 1) * pad;
        sheetH = rows * cellH + (rows + 1) * pad;
      } else {
        // Packed rows: fill each row until the widest row width, like a gallery shelf.
        const rows: Sprite[][] = [[]];
        const rowWidths: number[] = [0];
        let maxRowW = 0;
        const target = Math.ceil(Math.sqrt(sprites.length)) * (cellW + pad);
        for (const s of sprites) {
          const w = s.img.naturalWidth + pad;
          const li = rows.length - 1;
          if (rowWidths[li]! + w > target && rows[li]!.length > 0) {
            rows.push([]);
            rowWidths.push(0);
          }
          const i = rows.length - 1;
          rows[i]!.push(s);
          rowWidths[i]! += w;
          maxRowW = Math.max(maxRowW, rowWidths[i]!);
        }
        let y = pad;
        rows.forEach((row) => {
          let x = pad;
          let rowH = 0;
          for (const s of row) {
            cells.push({ sprite: s, x, y, w: s.img.naturalWidth, h: s.img.naturalHeight });
            x += s.img.naturalWidth + pad;
            rowH = Math.max(rowH, s.img.naturalHeight);
          }
          y += rowH + pad;
        });
        sheetW = maxRowW + pad;
        sheetH = y;
      }

      const draws: { canvas: HTMLCanvasElement; scale: number }[] = [];
      const scales = retina ? [1, 2] : [1];
      for (const scale of scales) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(sheetW * scale);
        canvas.height = Math.round(sheetH * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.scale(scale, scale);
        for (const c of cells) {
          // Center the sprite inside its cell area.
          ctx.drawImage(c.sprite.img, c.x, c.y, c.w, c.h);
        }
        draws.push({ canvas, scale });
      }

      const safePrefix = prefix.trim().replace(/[^a-zA-Z0-9-_]/g, "") || "sprite";
      const sheetFile = `${safePrefix}.png`;

      // CSS: background-position offsets against the 1x sheet.
      let cssText = `.${safePrefix} {\n  display: inline-block;\n  background-image: url('${sheetFile}');\n  background-repeat: no-repeat;\n}\n`;
      const names = new Map<string, number>();
      for (const c of cells) {
        let slug = sanitize(c.sprite.name);
        const n = names.get(slug) ?? 0;
        names.set(slug, n + 1);
        if (n > 0) slug = `${slug}-${n + 1}`;
        const w = retina ? c.w / 2 : c.w;
        const h = retina ? c.h / 2 : c.h;
        const x = retina ? c.x / 2 : c.x;
        const y = retina ? c.y / 2 : c.y;
        cssText += `\n.${safePrefix}-${slug} {\n  width: ${Math.round(w)}px;\n  height: ${Math.round(h)}px;\n  background-position: -${Math.round(x)}px -${Math.round(y)}px;\n}`;
        if (retina) {
          cssText += `\n@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {\n  .${safePrefix}-${slug} {\n    background-size: ${Math.round(sheetW / 2)}px ${Math.round(sheetH / 2)}px;\n  }\n}\n`;
        }
      }
      setCss(cssText);

      // Download PNG(s) + CSS.
      const main = draws[0]!;
      if (draws.length === 1) {
        const blob = await canvasToBlob(main.canvas, "image/png");
        downloadBlob(blob, sheetFile);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        const second = draws[1]!;
        zip.file(sheetFile, await canvasToBlob(main.canvas, "image/png"));
        zip.file(`${safePrefix}@2x.png`, await canvasToBlob(second.canvas, "image/png"));
        zip.file(`${safePrefix}.css`, cssText);
        const out = await zip.generateAsync({ type: "blob" });
        downloadBlob(out, `${safePrefix}-sprites.zip`);
      }
      if (draws.length === 1) {
        downloadBlob(new Blob([cssText], { type: "text/css" }), `${safePrefix}.css`);
      }
      setPreview(main.canvas.toDataURL("image/png"));
      setBuilt(true);
      trial.recordUse();
      toast.success("Sprite sheet built");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build failed.");
    } finally {
      setBusy(false);
    }
  }, [sprites, layout, columns, padding, retina, prefix, busy, trial]);

  const copyCss = () => {
    void navigator.clipboard.writeText(css).then(() => toast.success("CSS copied"));
  };

  return (
    <ToolPageShell toolId="sprite-sheet-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Sprite Sheet Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) void acceptFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{sprites.length ? `${sprites.length} images added` : "Drop images here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Each file becomes one sprite, named after the file. Files never leave your device.</p>
            <input ref={inputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { if (e.target.files?.length) void acceptFiles(e.target.files); }} />
          </div>

          {sprites.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sprites.map((s, i) => (
                <div key={i} className="relative rounded-lg border border-border p-1.5">
                  <img src={s.img.src} alt={s.name} className="h-10 w-10 object-contain" />
                  <button
                    type="button" onClick={(e) => { e.stopPropagation(); remove(i); }}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    aria-label={`Remove ${s.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Layout</p>
            <div className="flex gap-2">
              {(["grid", "packed"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayout(l)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition",
                    layout === l ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {l === "grid" ? "Grid" : "Packed rows"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Columns</label>
              <input
                value={columns} onChange={(e) => setColumns(e.target.value.replace(/\D/g, ""))}
                placeholder="auto" inputMode="numeric"
                disabled={layout !== "grid"}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-40"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Blank = square-ish auto</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Padding (px)</label>
              <input
                value={padding} onChange={(e) => setPadding(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input type="checkbox" checked={retina} onChange={(e) => setRetina(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
            <span>
              <span className="font-semibold">Retina 2x</span>
              <span className="block text-xs text-muted-foreground">Outputs 1x and 2x sheets, CSS at half size</span>
            </span>
          </label>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">CSS class prefix</label>
            <input
              value={prefix} onChange={(e) => setPrefix(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <ActionButton busy={busy} disabled={sprites.length === 0 || !trial.canUse} onClick={build}>
            <Download className="h-4 w-4" /> {busy ? "Building…" : "Build sprite sheet"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free builds left - everything runs in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            {!built ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your sprite sheet appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add images, pick a layout, and build. The PNG and matching CSS download together.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-semibold">Sheet preview</p>
                <div className="max-w-full overflow-auto rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                  <img src={preview} alt="Sprite sheet preview" className="max-h-72" />
                </div>
              </div>
            )}
          </div>
          {built && css && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Generated CSS</p>
                <button
                  type="button" onClick={copyCss}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-primary/60"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <textarea
                readOnly value={css} rows={12}
                className="w-full rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
