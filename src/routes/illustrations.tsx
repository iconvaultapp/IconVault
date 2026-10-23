import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Moon, Search, Sun, X } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import IllustrationArt from "@/components/IllustrationArt";
import {
  ILLUSTRATIONS,
  ILLUSTRATION_PACKS,
  loadIllustrationSvg,
  packOf,
  recolorSvg,
  sizeSvg,
  type IllustrationEntry,
  type IllustrationPackId,
} from "@/lib/illustrations-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/illustrations")({
  head: () => ({
    meta: [
      { title: "Free SVG Illustrations - Recolor, Resize & Download | IconVault" },
      {
        name: "description",
        content:
          "386 free open-source SVG illustrations from 5 packs for websites and apps. Recolor them to your brand, resize, and download as SVG or PNG. MIT and CC0 licensed.",
      },
      { property: "og:title", content: "Free SVG Illustrations | IconVault" },
      {
        property: "og:description",
        content: "Recolor, resize and download 386 free SVG illustrations from 5 open-source packs.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/illustrations" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/illustrations" }],
  }),
  component: Page,
});

type Theme = "light" | "dark";
type PackFilter = "all" | IllustrationPackId;

const PAGE_SIZE = 48;

const SWATCHES: Array<{ name: string; hex: string }> = [
  { name: "Flowbite Blue", hex: "#2563eb" },
  { name: "Verdigris", hex: "#0d7a68" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Emerald", hex: "#059669" },
  { name: "Slate", hex: "#334155" },
];

const themeFor = (entry: IllustrationEntry, theme: Theme): Theme =>
  theme === "dark" && entry.dark ? "dark" : "light";

const downloadBlob = (name: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

function ColorControls({
  color,
  setColor,
}: {
  color: string;
  setColor: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SWATCHES.map((s) => (
        <button
          key={s.hex}
          type="button"
          onClick={() => setColor(s.hex)}
          className={cn(
            "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-transform hover:scale-110",
            color === s.hex ? "ring-foreground/70" : "ring-transparent",
          )}
          style={{ backgroundColor: s.hex }}
          aria-label={`Color: ${s.name}`}
          title={s.name}
        />
      ))}
      <label
        className="relative ml-1 grid h-8 w-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border text-xs text-muted-foreground"
        title="Custom color"
      >
        +
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Custom color"
        />
      </label>
      <span className="ml-1 font-mono text-xs uppercase text-muted-foreground">{color}</span>
    </div>
  );
}

function EditorModal({
  entry,
  theme,
  setTheme,
  color,
  setColor,
  onClose,
}: {
  entry: IllustrationEntry;
  theme: Theme;
  setTheme: (t: Theme) => void;
  color: string;
  setColor: (hex: string) => void;
  onClose: () => void;
}) {
  const [size, setSize] = useState(1024);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const pack = packOf(entry);
  const activeTheme = themeFor(entry, theme);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const buildSvg = async (): Promise<string> => {
    const raw = await loadIllustrationSvg(entry, activeTheme);
    return sizeSvg(recolorSvg(entry, raw, color), size);
  };

  const downloadSvg = async () => {
    setBusy(true);
    try {
      const svg = await buildSvg();
      downloadBlob(`${entry.slug}.svg`, new Blob([svg], { type: "image/svg+xml" }));
      toast.success("SVG downloaded");
    } finally {
      setBusy(false);
    }
  };

  const downloadPng = async () => {
    setBusy(true);
    try {
      const svg = await buildSvg();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("render failed"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) {
        downloadBlob(`${entry.slug}.png`, blob);
        toast.success("PNG downloaded");
      }
    } catch {
      toast.error("PNG export failed - try the SVG instead");
    } finally {
      setBusy(false);
    }
  };

  const copySvg = async () => {
    const svg = await buildSvg();
    await navigator.clipboard.writeText(svg);
    setCopied(true);
    toast.success("SVG code copied");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.title} editor`}
    >
      <div
        className="surface-card max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{entry.title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Free SVG illustration · {pack.license} license · by {pack.byline}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={cn(
            "mt-5 grid place-items-center rounded-2xl px-6 py-8 ring-1 ring-inset ring-border/60",
            activeTheme === "dark" ? "bg-[#111928]" : "bg-[image:var(--gradient-hero)]",
          )}
        >
          <IllustrationArt
            entry={entry}
            theme={activeTheme}
            color={color}
            className="h-64 w-full max-w-md"
            title={entry.title}
          />
        </div>

        <div className="mt-5 space-y-4">
          {pack.ramp ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Color
              </p>
              <ColorControls color={color} setColor={setColor} />
            </div>
          ) : (
            <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              This pack ships in its original colors - download it as-is, in any size.
            </p>
          )}

          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Size · {size}px
              </p>
              <input
                type="range"
                min={256}
                max={2048}
                step={64}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-52 accent-[var(--primary)]"
                aria-label="Export size in pixels"
              />
            </div>
            {entry.dark && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Variant
                </p>
                <div className="flex overflow-hidden rounded-full border border-border">
                  {(["light", "dark"] as Theme[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={cn(
                        "flex items-center gap-1.5 px-3.5 py-1.5 text-sm capitalize transition-colors",
                        activeTheme === t
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {t === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={downloadSvg}
              disabled={busy}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> SVG
            </button>
            <button
              type="button"
              onClick={downloadPng}
              disabled={busy}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> PNG
            </button>
            <button
              type="button"
              onClick={copySvg}
              disabled={busy}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              Copy SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [query, setQuery] = useState("");
  const [packFilter, setPackFilter] = useState<PackFilter>("all");
  const [theme, setTheme] = useState<Theme>("light");
  const [color, setColor] = useState("#2563eb");
  const [selected, setSelected] = useState<IllustrationEntry | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, packFilter]);

  const packCounts = useMemo(() => {
    const counts = new Map<IllustrationPackId, number>();
    for (const e of ILLUSTRATIONS) counts.set(e.pack, (counts.get(e.pack) ?? 0) + 1);
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ILLUSTRATIONS.filter((e) => {
      if (packFilter !== "all" && e.pack !== packFilter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.slug.includes(q) ||
        packOf(e).label.toLowerCase().includes(q)
      );
    });
  }, [query, packFilter]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <PageShell fullWidth>
      <Reveal>
        <div className="text-center">
          <p className="eyebrow">{ILLUSTRATIONS.length} free illustrations</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Free SVG <span className="text-gradient">illustrations</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-muted-foreground">
            Five open-source packs in one gallery. Pick a color, choose a size, download as
            SVG or PNG - free for personal and commercial use.
          </p>
        </div>
      </Reveal>

      <Reveal delay={70}>
        <div className="surface-card mt-8 flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search illustrations…"
                className="focus-ring w-full rounded-full border border-border bg-surface py-2.5 pl-11 pr-4 text-sm"
                aria-label="Search illustrations"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <ColorControls color={color} setColor={setColor} />
              <div className="flex overflow-hidden rounded-full border border-border">
                {(["light", "dark"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 text-sm capitalize transition-colors",
                      theme === t
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
            <button
              type="button"
              onClick={() => setPackFilter("all")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                packFilter === "all"
                  ? "bg-primary font-medium text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted",
              )}
            >
              All packs · {ILLUSTRATIONS.length}
            </button>
            {ILLUSTRATION_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPackFilter(p.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  packFilter === p.id
                    ? "bg-primary font-medium text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {p.label} · {packCounts.get(p.id) ?? 0}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((entry, i) => {
          const t = themeFor(entry, theme);
          const pack = packOf(entry);
          return (
            <Reveal key={`${entry.pack}:${entry.slug}`} delay={Math.min((i % PAGE_SIZE) * 15, 300)} className="h-full">
              <button
                type="button"
                onClick={() => setSelected(entry)}
                className="surface-card lift-hover focus-ring group block h-full w-full p-4 text-left"
                aria-label={`Customize ${entry.title}`}
              >
                <span
                  className={cn(
                    "grid h-44 place-items-center overflow-hidden rounded-xl px-4 ring-1 ring-inset ring-border/50",
                    t === "dark" ? "bg-[#111928]" : "bg-[image:var(--gradient-hero)]",
                  )}
                >
                  <IllustrationArt
                    entry={entry}
                    theme={t}
                    color={color}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate font-display text-[0.95rem] font-semibold tracking-tight">
                    {entry.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                    SVG
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {pack.label} · {pack.license}
                </span>
              </button>
            </Reveal>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          No illustrations match “{query}”.
        </p>
      )}

      {visibleCount < filtered.length && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="focus-ring rounded-full border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            Show more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      <p className="mt-10 text-center text-sm leading-relaxed text-muted-foreground">
        Illustration packs:{" "}
        {ILLUSTRATION_PACKS.map((p, i) => (
          <span key={p.id}>
            {i > 0 && " · "}
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {p.label}
            </a>{" "}
            by {p.byline} ({p.license})
          </span>
        ))}
      </p>

      {selected && (
        <EditorModal
          entry={selected}
          theme={theme}
          setTheme={setTheme}
          color={color}
          setColor={setColor}
          onClose={() => setSelected(null)}
        />
      )}
    </PageShell>
  );
}

export default Page;
