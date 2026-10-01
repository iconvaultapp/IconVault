// Icon search + pick, shared by the canvas tools (OG generator, thumbnail
// maker). Searches the full IconVault library and returns the picked icon's
// SVG string.

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { searchIcons, loadIconData } from "@/lib/iconify";
import { iconDataToSvg } from "@/lib/icon-svg";

export interface PickedIcon {
  id: string;
  svg: string;
}

export default function IconStickerPicker({
  onPick,
  picked,
  onClear,
}: {
  onPick: (icon: PickedIcon) => void;
  picked: PickedIcon | null;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await searchIcons(query.trim(), 24);
        setResults(r.icons);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        results.map(async (id) => {
          const [prefix, ...rest] = id.split(":");
          try {
            const data = await loadIconData(prefix ?? "", rest.join(":"));
            next[id] = iconDataToSvg(data, { color: "currentColor" });
          } catch {
            /* skip */
          }
        }),
      );
      if (!cancelled) setSvgs(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [results]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 421,020 icons…"
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      {picked && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="inline-block h-6 w-6 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: picked.svg }} />
            {picked.id}
          </span>
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground" aria-label="Remove icon">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {results.length > 0 && (
        <div className="mt-2 grid max-h-44 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border border-border bg-card p-2">
          {results.map((id) => (
            <button
              key={id}
              type="button"
              title={id}
              onClick={() => svgs[id] && onPick({ id, svg: svgs[id] })}
              className="flex aspect-square items-center justify-center rounded-lg p-1.5 text-foreground transition hover:bg-primary/10"
            >
              {svgs[id] ? (
                <span className="[&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svgs[id] }} />
              ) : (
                <span className="h-5 w-5 animate-pulse rounded bg-muted" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Draw an SVG string onto a canvas 2d context. */
export function drawSvgToCanvas(
  ctx: CanvasRenderingContext2D,
  svg: string,
  x: number,
  y: number,
  w: number,
  h: number,
): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, w, h);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });
}
