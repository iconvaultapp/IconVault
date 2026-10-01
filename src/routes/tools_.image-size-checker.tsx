// /tools/image-size-checker - Inspect images: dimensions, format, file
// size and aspect ratio. No processing, no options, no changes: just the
// facts. 100% in-browser, files never leave the device.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileUp, RotateCcw, Ruler } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, formatBytes } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/image-size-checker")({
  head: () => {
    const seo = getToolSeoMeta("image-size-checker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ImageSizeCheckerTool,
});

interface Item {
  id: number;
  name: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

let nextId = 1;

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

function aspectRatio(w: number, h: number): string {
  const g = gcd(w, h);
  const a = w / g;
  const b = h / g;
  if (a <= 64 && b <= 64) return `${a}:${b}`;
  return `${(w / h).toFixed(2)}:1`;
}

function guessFormat(file: File): string {
  const t = file.type.toLowerCase();
  if (t === "image/jpeg") return "JPEG";
  if (t === "image/png") return "PNG";
  if (t === "image/webp") return "WebP";
  if (t === "image/gif") return "GIF";
  if (t === "image/avif") return "AVIF";
  if (t === "image/bmp") return "BMP";
  const ext = file.name.split(".").pop()?.toUpperCase();
  return ext && ext.length <= 5 ? ext : "Image";
}

function ImageSizeCheckerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-size-checker", isPro);
  const seo = getToolSeo("image-size-checker");

  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 50);
      if (list.length === 0) {
        setError("Please choose image files.");
        return;
      }
      setError(null);
      const inspected: Item[] = [];
      for (const f of list) {
        try {
          const img = await loadImageFile(f);
          inspected.push({
            id: nextId++,
            name: f.name,
            url: URL.createObjectURL(f),
            width: img.naturalWidth,
            height: img.naturalHeight,
            format: guessFormat(f),
            bytes: f.size,
          });
        } catch {
          setError(`Could not read ${f.name}.`);
        }
      }
      if (inspected.length > 0) {
        setItems((p) => [...p, ...inspected]);
        trial.recordUse();
        toast.success(`Inspected ${inspected.length} image${inspected.length === 1 ? "" : "s"}`);
      }
    },
    [trial],
  );

  const reset = useCallback(() => {
    setItems((p) => {
      p.forEach((i) => URL.revokeObjectURL(i.url));
      return [];
    });
    setError(null);
  }, []);

  return (
    <ToolPageShell toolId="image-size-checker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Size Checker" left={trial.left} />

      <div className="space-y-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void acceptFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-4 py-10 text-center transition",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
          )}
        >
          <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">
            {items.length === 0 ? "Drop images here to inspect them" : "Add more images"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dimensions, format, file size and aspect ratio, instantly. Up to 50 files.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) void acceptFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free checks left - files never leave your device.
          </p>
        )}
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}

        {items.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-border bg-card text-center">
            <Ruler className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">Nothing inspected yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Drop a batch of images above and get a clean table of their true pixel dimensions and sizes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 pt-4">
              <p className="text-sm font-semibold text-muted-foreground">
                {items.length} image{items.length === 1 ? "" : "s"} inspected
              </p>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Start over
              </button>
            </div>
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">File</th>
                  <th className="px-3 py-3 font-semibold">Dimensions</th>
                  <th className="px-3 py-3 font-semibold">Aspect ratio</th>
                  <th className="px-3 py-3 font-semibold">Format</th>
                  <th className="px-3 py-3 font-semibold">File size</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={it.url} alt={it.name} className="h-10 w-10 rounded-lg object-cover" />
                        <span className="max-w-[220px] truncate font-semibold">{it.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold">
                      {it.width} × {it.height} px
                    </td>
                    <td className="px-3 py-3 font-mono">{aspectRatio(it.width, it.height)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold">{it.format}</span>
                    </td>
                    <td className="px-3 py-3 font-mono">{formatBytes(it.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
