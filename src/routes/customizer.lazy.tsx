import { useEffect, useMemo, useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Link2, Search } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { fetchIconSvg, parseIconId, searchIcons } from "@/lib/iconify";
import { downloadWithGate } from "@/lib/download-guard";

export const Route = createLazyFileRoute("/customizer")({
  component: Page,
});

/** Apply size + stroke overrides to a fetched SVG string. */
function restyle(svg: string, size: number, stroke: number): string {
  let out = svg.replace(/<svg([^>]*)>/i, (_m, attrs: string) => {
    let a = String(attrs).replace(/\s(width|height)="[^"]*"/gi, "");
    return `<svg${a} width="${size}" height="${size}">`;
  });
  if (/stroke-width="[^"]*"/.test(out)) {
    out = out.replace(/stroke-width="[^"]*"/g, `stroke-width="${stroke}"`);
  } else {
    out = out.replace(/<svg([^>]*)>/i, (_m, attrs: string) => `<svg${attrs} stroke-width="${stroke}">`);
  }
  return out;
}

function Page() {
  const search = Route.useSearch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(search.icon);
  const [color, setColor] = useState(search.color ?? "#6366f1");
  const [size, setSize] = useState(search.size ?? 128);
  const [stroke, setStroke] = useState(search.stroke ?? 1.8);
  const [bg, setBg] = useState<string | undefined>(search.bg);
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      void searchIcons(query, 24).then((r) => {
        if (!cancelled) {
          setResults(r.icons ?? []);
          setSearching(false);
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    if (!selected) {
      setSvg("");
      return;
    }
    const { prefix, name } = parseIconId(selected);
    let cancelled = false;
    void fetchIconSvg(prefix, name, { color })
      .then((raw) => {
        if (!cancelled) setSvg(restyle(raw, size, stroke));
      })
      .catch(() => {
        if (!cancelled) setSvg("");
      });
    return () => {
      cancelled = true;
    };
  }, [selected, color, size, stroke]);

  const previewUrl = useMemo(() => {
    if (!svg) return "";
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [svg]);

  const shareLink = () => {
    if (!selected) return "";
    const params = new URLSearchParams({ icon: selected, color, size: String(size), stroke: String(stroke) });
    if (bg) params.set("bg", bg);
    return `${window.location.origin}/customizer?${params.toString()}`;
  };

  const copyShare = async () => {
    const link = shareLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied("share");
      toast.success("Share link copied — opening it restores this exact icon.");
      setTimeout(() => setCopied(""), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const copySvg = async () => {
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
      setCopied("svg");
      toast.success("SVG code copied (copy is free for everyone).");
      setTimeout(() => setCopied(""), 2000);
    } catch {
      toast.error("Could not copy SVG code");
    }
  };

  const downloadSvgFile = () => {
    if (!svg || !selected) return;
    const { prefix, name } = parseIconId(selected);
    if (downloadWithGate(new Blob([svg], { type: "image/svg+xml" }), `${prefix}-${name}.svg`)) {
      toast.success("SVG downloaded");
    }
  };

  const downloadPngFile = () => {
    if (!svg || !selected) return;
    const { prefix, name } = parseIconId(selected);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
      }
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (blob && downloadWithGate(blob, `${prefix}-${name}-${size}.png`)) {
          toast.success("PNG downloaded");
        }
      }, "image/png");
    };
    img.onerror = () => toast.error("PNG export failed — try the SVG instead");
    img.src = previewUrl;
  };

  return (
    <PageShell
      eyebrow="Customizer"
      title="Icon customizer"
      description="Pick any icon from the library, change its color, size and stroke width, and share it. Previews and share links are free for everyone; file downloads need a free account."
    >
      <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons by name… (e.g. arrow, home, heart)"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
          {results.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {results.map((id) => {
                const { prefix, name } = parseIconId(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelected(id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center hover:border-primary ${selected === id ? "border-primary bg-accent" : "border-border bg-card"}`}
                  >
                    <img
                      src={`/api/icon/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}?width=40&height=40`}
                      alt={name}
                      width={40}
                      height={40}
                      loading="lazy"
                    />
                    <span className="w-full truncate text-[11px]">{name}</span>
                  </button>
                );
              })}
            </div>
          )}
          {query.trim() && !searching && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No icons found for that search.</p>
          )}
          {!selected && (
            <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Search above and pick an icon to customize it here.
            </p>
          )}
        </section>

        <aside className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Preview</h2>
          <div
            className="flex min-h-[220px] items-center justify-center rounded-xl border border-border"
            style={{ background: bg ?? "transparent" }}
          >
            {svg ? (
              <img src={previewUrl} alt={selected ?? "Customized icon"} width={size} height={size} style={{ width: size, height: size }} />
            ) : (
              <span className="text-sm text-muted-foreground">No icon selected</span>
            )}
          </div>
          {selected && <p className="truncate text-xs text-muted-foreground">{selected}</p>}

          <label className="block text-sm">
            Color
            <span className="mt-1 flex items-center gap-2">
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#6366f1"} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" />
              <input value={color} onChange={(e) => setColor(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </span>
            <span className="text-xs text-muted-foreground">Applies to icons drawn with currentColor.</span>
          </label>

          <label className="block text-sm">
            Size: {size}px
            <input type="range" min={16} max={512} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-1 w-full" />
          </label>

          <label className="block text-sm">
            Stroke width: {stroke}
            <input type="range" min={0.5} max={4} step={0.1} value={stroke} onChange={(e) => setStroke(Number(e.target.value))} className="mt-1 w-full" />
            <span className="text-xs text-muted-foreground">Applies to stroke-based icons; filled icons ignore it.</span>
          </label>

          <label className="block text-sm">
            Background (optional)
            <span className="mt-1 flex items-center gap-2">
              <input type="color" value={bg ?? "#ffffff"} onChange={(e) => setBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" />
              <button type="button" onClick={() => setBg(undefined)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                Transparent
              </button>
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={copySvg} disabled={!svg} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40">
              {copied === "svg" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy SVG
            </button>
            <button type="button" onClick={downloadSvgFile} disabled={!svg} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40">
              <Download className="h-4 w-4" /> SVG
            </button>
            <button type="button" onClick={downloadPngFile} disabled={!svg} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40">
              <Download className="h-4 w-4" /> PNG
            </button>
            <button type="button" onClick={copyShare} disabled={!selected} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40">
              {copied === "share" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} Copy share link
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            A share link restores this exact icon, color, size, stroke and background for anyone who
            opens it — viewing it is free; downloading from it needs a free account.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
