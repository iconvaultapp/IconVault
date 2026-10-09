import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, FileArchive, ImageDown, Loader2, X, Crown } from "lucide-react";
import { toast } from "sonner";
import { parseIconId, fetchIconSvg } from "@/lib/iconify";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { usePlan, LIFETIME_PRICE } from "@/hooks/usePlan";
import { brandFilename } from "@/lib/logo-builder";

interface BulkActionBarProps {
  selected: Set<string>;
  onClear: () => void;
  onSelectAll?: () => void;
}

const PNG_SIZES = [64, 128, 256, 512];

const svgToPngBlob = (svg: string, px: number) =>
  new Promise<Blob | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = px;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, px, px);
      canvas.toBlob((b) => resolve(b), "image/png");
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = brandFilename(filename);
  a.click();
  URL.revokeObjectURL(url);
};

export const BulkActionBar = ({ selected, onClear, onSelectAll }: BulkActionBarProps) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [pngSize, setPngSize] = useState(256);
  const { requireAuth } = useRequireAuth();
  const { isPro, bulkRemaining, canBulkDownload, recordBulkDownload } = usePlan();
  const ids = [...selected];
  const unlimited = isPro;

  const copyNames = () => {
    if (!requireAuth("copy icons")) return;
    void navigator.clipboard.writeText(ids.join("\n"));
    toast.success(`Copied ${ids.length} icon names`);
  };

  const exportZip = async (mode: "svg" | "png") => {
    if (!requireAuth(`download ${ids.length} icons`)) return;
    if (!canBulkDownload) {
      toast.error("Free plan limit reached", {
        description: `You've used all 7 free bulk downloads. Go Lifetime ($${LIFETIME_PRICE} one-time) for unlimited bulk downloads.`,
      });
      return;
    }
    setBusy(mode);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      // Bounded concurrency: 8 workers drain a shared queue instead of one
      // serial fetch per icon. Results are collected by index and added to
      // the ZIP in order, so the archive is identical to the serial version.
      const CONCURRENCY = 8;
      const fetched: Array<{ id: string; svg: string } | null> = new Array(ids.length).fill(null);
      let next = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, ids.length) }, async () => {
        while (next < ids.length) {
          const i = next++;
          const { prefix, name } = parseIconId(ids[i] as string);
          try {
            const svg = await fetchIconSvg(prefix, name);
            fetched[i] = { id: ids[i] as string, svg };
          } catch {
            /* skip icons that fail to fetch */
          }
        }
      });
      await Promise.all(workers);
      let ok = 0;
      for (const entry of fetched) {
        if (!entry) continue;
        const { prefix, name } = parseIconId(entry.id);
        try {
          if (mode === "svg") {
            zip.file(`${prefix}/${name}.svg`, entry.svg);
            ok++;
          } else {
            const blob = await svgToPngBlob(entry.svg, pngSize);
            if (blob) {
              zip.file(`${prefix}/${name}-${pngSize}.png`, blob);
              ok++;
            }
          }
        } catch {
          /* skip icons that fail to convert */
        }
      }
      if (ok === 0) {
        toast.error("Nothing could be exported - try again");
        return;
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveBlob(blob, mode === "svg" ? `iconvault-${ok}-svg.zip` : `iconvault-${ok}-png-${pngSize}.zip`);
      await recordBulkDownload({ iconCount: ok, format: mode });
      toast.success(`Exported ${ok} ${mode.toUpperCase()} icons`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-[4.5rem] z-40 px-4 sm:bottom-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface/95 p-3 shadow-lift backdrop-blur">
        {!unlimited && (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs">
            {canBulkDownload ? (
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{bulkRemaining}</span> of 7 free bulk
                downloads left
              </span>
            ) : (
              <span className="text-muted-foreground">
                Free bulk downloads used up - upgrade to Pro Yearly for unlimited downloads.
              </span>
            )}
            <Link
              to="/pro"
              className="focus-ring ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground"
            >
              <Crown className="h-3.5 w-3.5" /> Lifetime - $${LIFETIME_PRICE} one-time
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm">
          <span className="font-semibold text-foreground">{ids.length}</span>{" "}
          <span className="text-muted-foreground">selected</span>
        </span>

        {onSelectAll && (
          <button
            onClick={onSelectAll}
            className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/40 hover:text-primary"
          >
            Select all
          </button>
        )}

        <button
          onClick={copyNames}
          disabled={ids.length === 0}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          <Copy className="h-3.5 w-3.5" /> Copy names
        </button>

        <button
          onClick={() => void exportZip("svg")}
          disabled={ids.length === 0 || busy !== null}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          {busy === "svg" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileArchive className="h-3.5 w-3.5" />}
          SVG zip
        </button>

        <div className="inline-flex items-center gap-1 rounded-full border border-border p-0.5">
          <select
            value={pngSize}
            onChange={(e) => setPngSize(Number(e.target.value))}
            aria-label="PNG size"
            className="rounded-full bg-transparent px-2 py-1 font-mono text-xs outline-none"
          >
            {PNG_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
          <button
            onClick={() => void exportZip("png")}
            disabled={ids.length === 0 || busy !== null}
            className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
          >
            {busy === "png" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageDown className="h-3.5 w-3.5" />}
            PNG pack
          </button>
        </div>

        <button
          onClick={onClear}
          aria-label="Clear selection"
          className="focus-ring grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionBar;
