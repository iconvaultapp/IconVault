import { useEffect, useState } from "react";
import { X, Copy, Check, Download, Heart, FolderPlus, Share2, Plus } from "lucide-react";
import { toast } from "sonner";
import { parseIconId, getIconSvgUrl, fetchIconSvg } from "@/lib/iconify";
import { useFavourites } from "@/hooks/useFavourites";
import { useCollections } from "@/hooks/useCollections";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { brandFilename } from "@/lib/logo-builder";

interface IconifyDetailProps {
  iconId: string;
  onClose: () => void;
  onAddToRecent?: (id: string) => void;
}

const PRESET_COLORS = [
  "#7C3AED",
  "#111827",
  "#FFFFFF",
  "#E4572E",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#64748B",
];

const SIZES = [16, 20, 24, 32, 48, 64, 128, 256, 512, 1024];
const PNG_SIZES = [16, 32, 64, 128, 256, 512, 1024];

/**
 * Count distinct paint colours in an SVG. Multi-colour sets (Twemoji, emoji
 * families, etc.) carry their own palette - forcing a single recolour on them
 * destroys the artwork, so they default to "original colours" mode.
 */
function countDistinctColors(svg: string): number {
  const colors = new Set<string>();
  const collect = (v: string) => {
    const norm = v.trim().toLowerCase();
    if (norm && norm !== "none" && norm !== "transparent" && norm !== "currentcolor") {
      colors.add(norm);
    }
  };
  let m: RegExpExecArray | null;
  const attrRe = /(?:fill|stroke)="([^"]+)"/gi;
  while ((m = attrRe.exec(svg))) {
    if (m[1]) collect(m[1]);
  }
  const styleRe = /(?:fill|stroke)\s*:\s*([^;"']+)/gi;
  while ((m = styleRe.exec(svg))) {
    if (m[1]) collect(m[1]);
  }
  return colors.size;
}

export const IconifyDetail = ({ iconId, onClose, onAddToRecent }: IconifyDetailProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [size, setSize] = useState(48);
  const [color, setColor] = useState("#7C3AED");
  const [useOriginal, setUseOriginal] = useState(false);
  const [isMultiColor, setIsMultiColor] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [coloredSvg, setColoredSvg] = useState<string | null>(null);
  const [tab, setTab] = useState<"copy" | "download" | "collections">("copy");
  const [newColName, setNewColName] = useState("");
  const { isFavourite, toggleFavourite } = useFavourites();
  const { requireAuth } = useRequireAuth();
  const { collections, createCollection, addToCollection } = useCollections();
  const { prefix, name } = parseIconId(iconId);
  const fav = isFavourite(iconId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    setSvgContent(null);
    setColoredSvg(null);
    setUseOriginal(false);
    setIsMultiColor(false);
    fetchIconSvg(prefix, name)
      .then((svg) => {
        if (!svg) return;
        setSvgContent(svg);
        // Multi-colour artwork keeps its own palette by default; the user can
        // still force a single colour from the swatches below.
        const multi = countDistinctColors(svg) > 1;
        setIsMultiColor(multi);
        setUseOriginal(multi);
      })
      .catch(() => undefined);
    onAddToRecent?.(iconId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, name]);

  useEffect(() => {
    if (!svgContent) return;
    if (useOriginal) {
      setColoredSvg(svgContent);
      return;
    }
    let colored = svgContent
      .replace(/currentColor/gi, color)
      .replace(/fill="(?!none)[^"]*"/gi, `fill="${color}"`)
      .replace(/stroke="(?!none)[^"]*"/gi, `stroke="${color}"`);
    colored = colored.replace(/<svg([^>]*)>/, (_m, attrs: string) => {
      const cleaned = attrs.replace(/\s*fill="[^"]*"/gi, "").replace(/\s*color="[^"]*"/gi, "");
      return `<svg${cleaned}>`;
    });
    setColoredSvg(colored);
  }, [svgContent, color, useOriginal]);

  const copyText = (text: string, label: string) => {
    if (!requireAuth("copy icon code")) return;
    void navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopied(null), 1800);
  };

  const svgDataUrl = coloredSvg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coloredSvg)}`
    : getIconSvgUrl(prefix, name, { width: size, height: size });

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const embedUrl = (extra: string) =>
    `${siteOrigin}${getIconSvgUrl(prefix, name)}${extra}`;

  const colorAttr = (fmt: "prop" | "param") =>
    useOriginal ? "" : fmt === "prop" ? ` color="${color}"` : `?color=${color.replace("#", "%23")}`;

  const snippets: { label: string; code: string }[] = [
    { label: "Icon name", code: iconId },
    { label: "Raw SVG", code: coloredSvg ?? "Loading…" },
    {
      label: "React",
      code: `import { Icon } from '@iconify/react';\n\n<Icon icon="${iconId}" width="${size}" height="${size}"${colorAttr("prop")} />`,
    },
    {
      label: "Vue",
      code: `<template>\n  <Icon icon="${iconId}" width="${size}" height="${size}"${colorAttr("prop")} />\n</template>`,
    },
    {
      label: "HTML",
      code: `<img src="${embedUrl(`${colorAttr("param")}${useOriginal ? "?" : "&"}width=${size}&height=${size}`)}" alt="${name}" />`,
    },
    {
      label: "CSS",
      code: `background-image: url("${embedUrl(colorAttr("param"))}");`,
    },
  ];

  const downloadSvg = () => {
    if (!coloredSvg) return;
    if (!requireAuth("download this icon")) return;
    const blob = new Blob([coloredSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = brandFilename(`${name}.svg`);
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SVG downloaded");
  };

  const downloadPng = (px: number) => {
    if (!coloredSvg) return;
    if (!requireAuth("download this icon")) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = px;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, px, px);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = brandFilename(`${name}-${px}.png`);
      a.click();
      toast.success(`PNG ${px}px downloaded`);
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coloredSvg)}`;
  };

  const copyShare = () => {
    void navigator.clipboard.writeText(`${window.location.origin}/icon/${prefix}/${name}`);
    toast.success("Share link copied");
  };

  const handleCreateAndAdd = async () => {
    if (!newColName.trim()) return;
    const col = await createCollection(newColName.trim());
    if (col) {
      await addToCollection(col.id, iconId);
      setNewColName("");
    }
  };

  const lightSwatch = color.toLowerCase() === "#ffffff";

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />

      <div className="animate-pop relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-lift sm:rounded-3xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="eyebrow">{prefix}</p>
            <h2 className="truncate font-display text-xl font-semibold">{name}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => void toggleFavourite(iconId)}
              aria-label="Toggle favourite"
              className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:border-accent/50 hover:bg-accent-soft"
            >
              <Heart className={cn("h-4 w-4", fav ? "fill-primary text-primary" : "text-muted-foreground")} />
            </button>
            <button
              onClick={copyShare}
              aria-label="Copy share link"
              className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          {/* Preview panel */}
          <div className="border-b border-border bg-surface-2 p-5 md:border-b-0 md:border-r">
            <div
              className={cn(
                "grid aspect-square w-full place-items-center rounded-2xl border border-border",
                lightSwatch ? "bg-ink" : "bg-surface",
              )}
            >
              <img src={svgDataUrl} alt={name} style={{ width: Math.min(size * 2, 256), height: Math.min(size * 2, 256) }} />
            </div>

            <p className="eyebrow mt-5">Size · {size}px</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-xs transition-colors",
                    size === s
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <p className="eyebrow mt-5">Colour</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isMultiColor && (
                <button
                  onClick={() => setUseOriginal(true)}
                  aria-label="Original colours"
                  title="Original colours"
                  style={{ background: "conic-gradient(#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ef4444)" }}
                  className={cn(
                    "h-7 w-7 rounded-full border transition-transform hover:scale-110",
                    useOriginal ? "border-primary ring-2 ring-primary/30" : "border-border",
                  )}
                />
              )}
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setUseOriginal(false);
                  }}
                  aria-label={`Use colour ${c}`}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "h-7 w-7 rounded-full border transition-transform hover:scale-110",
                    !useOriginal && color.toLowerCase() === c.toLowerCase()
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border",
                  )}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setUseOriginal(false);
                }}
                aria-label="Custom colour"
                className="h-7 w-9 cursor-pointer rounded-md border border-border bg-transparent"
              />
            </div>
          </div>

          {/* Tabs panel */}
          <div className="flex min-w-0 flex-col p-5">
            <div className="flex gap-1 rounded-full border border-border bg-muted/60 p-1">
              {(["copy", "download", "collections"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-sm capitalize transition-all",
                    tab === t ? "bg-surface font-medium text-foreground shadow-soft" : "text-muted-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-4 min-w-0 space-y-3">
              {tab === "copy" &&
                snippets.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="eyebrow">{s.label}</span>
                      <button
                        onClick={() => copyText(s.code, s.label)}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        {copied === s.label ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                        Copy
                      </button>
                    </div>
                    <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {s.code}
                    </pre>
                  </div>
                ))}

              {tab === "download" && (
                <div className="space-y-4">
                  <button
                    onClick={downloadSvg}
                    className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
                  >
                    <Download className="h-4 w-4" /> Download SVG
                  </button>
                  <div>
                    <p className="eyebrow">PNG export</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {PNG_SIZES.map((px) => (
                        <button
                          key={px}
                          onClick={() => downloadPng(px)}
                          className="rounded-xl border border-border bg-surface-2 py-2.5 font-mono text-xs transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          {px}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "collections" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      placeholder="New collection name"
                      className="focus-ring h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm outline-none"
                    />
                    <button
                      onClick={() => void handleCreateAndAdd()}
                      className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
                    >
                      <Plus className="h-4 w-4" /> Create
                    </button>
                  </div>

                  {collections.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No collections yet - create one above to start grouping icons.
                    </p>
                  ) : (
                    collections.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => void addToCollection(c.id, iconId)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary-soft"
                      >
                        <span className="min-w-0 truncate font-medium">{c.name}</span>
                        <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconifyDetail;
