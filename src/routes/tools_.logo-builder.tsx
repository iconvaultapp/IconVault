import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Crown,
  Download,
  Dices,
  Image as ImageIcon,
  Loader2,
  Search,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchIcons, loadIconData } from "@/lib/iconify";
import {
  DEFAULT_LOGO_CONFIG,
  GRADIENT_PRESETS,
  SOLID_PRESETS,
  buildLogoSvg,
  downloadBlob,
  downloadLogoKit,
  svgToPngBlob,
  type BgType,
  type LogoConfig,
  type LogoIcon,
} from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getToolSeo } from "@/lib/tool-seo";
import { toast } from "sonner";

/* ---------------------------------- bits ---------------------------------- */

const Slider = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) => (
  <label className="block">
    <div className="mb-1.5 flex items-center justify-between text-[13px]">
      <span className="font-medium text-foreground/80">{label}</span>
      <span className="tabular-nums text-muted-foreground">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary"
    />
  </label>
);

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between py-1.5 text-[13px]"
  >
    <span className="font-medium text-foreground/80">{label}</span>
    <span
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </span>
  </button>
);

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[13px] font-medium text-foreground/80">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs uppercase text-muted-foreground">{value}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0.5"
      />
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-b border-border/60 px-4 py-4 last:border-0">
    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const SHAPES: { name: string; radius: number }[] = [
  { name: "Squircle", radius: 28 },
  { name: "Circle", radius: 50 },
  { name: "Rounded", radius: 16 },
  { name: "Square", radius: 0 },
];

/* ---------------------------------- page ---------------------------------- */

export const Route = createFileRoute("/tools_/logo-builder")({
  head: () => ({
    meta: [
      { title: "Logo Builder - Free Favicon & App Icon Maker | IconVault" },
      {
        name: "description",
        content:
          "Turn any of 421,020 icons into a logo: style the tile, add a wordmark, export PNG, SVG and a full favicon + app-icon kit.",
      },
      { property: "og:title", content: "Logo Builder - Free Favicon & App Icon Maker | IconVault" },
      {
        property: "og:description",
        content:
          "Turn any of 421,020 icons into a logo: style the tile, add a wordmark, export PNG, SVG and a full favicon + app-icon kit.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/tools/logo-builder" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Logo Builder - Free Favicon & App Icon Maker | IconVault" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/tools/logo-builder" }],
  }),
  component: LogoBuilderPage,
});

function LogoBuilderPage() {
  const { isPro } = usePlan();
  const { requireAuth } = useRequireAuth();
  const [cfg, setCfg] = useState<LogoConfig>(DEFAULT_LOGO_CONFIG);
  const [icon, setIcon] = useState<LogoIcon | null>(null);
  const [query, setQuery] = useState("rocket");
  const [results, setResults] = useState<{ prefix: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingIcon, setLoadingIcon] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState<null | "png" | "svg" | "zip">(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = useCallback(
    <K extends keyof LogoConfig>(k: K, v: LogoConfig[K]) =>
      setCfg((c) => ({ ...c, [k]: v })),
    [],
  );

  const pickIcon = useCallback(async (prefix: string, name: string) => {
    setLoadingIcon(true);
    try {
      const data = await loadIconData(prefix, name);
      if (data) setIcon({ prefix, name, body: data.body, width: data.width ?? 24, height: data.height ?? 24 });
      else toast.error("Could not load that icon - try another.");
    } finally {
      setLoadingIcon(false);
    }
  }, []);

  // Default icon on mount.
  useEffect(() => {
    void pickIcon("tabler", "bolt");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced library search.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchIcons(q, 48);
        setResults(
          r.icons.map((id) => {
            const i = id.indexOf(":");
            return { prefix: id.slice(0, i), name: id.slice(i + 1) };
          }),
        );
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const previewSvg = useMemo(() => buildLogoSvg(cfg, icon, 512), [cfg, icon]);

  const shuffle = useCallback(() => {
    const g = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)] ?? GRADIENT_PRESETS[0]!;
    setCfg((c) => ({
      ...c,
      bgType: "gradient",
      bgColor: g.from,
      bgColor2: g.to,
      gradientAngle: [45, 90, 135, 180][Math.floor(Math.random() * 4)] ?? 90,
      radiusPct: [0, 16, 28, 50][Math.floor(Math.random() * 4)] ?? 16,
      rotation: Math.floor(Math.random() * 31) - 15,
    }));
    toast.success("Shuffled a fresh style");
  }, []);

  const guardIcon = () => {
    if (!icon) {
      toast.error("Pick an icon first");
      return false;
    }
    return true;
  };

  const exportPng = async () => {
    if (!guardIcon() || !icon) return;
    setBusy("png");
    try {
      const blob = await svgToPngBlob(buildLogoSvg(cfg, icon, 1024), 1024);
      downloadBlob(blob, "logo-1024.png");
      toast.success("PNG downloaded");
    } catch {
      toast.error("PNG export failed");
    } finally {
      setBusy(null);
    }
  };

  const exportSvg = () => {
    if (!guardIcon() || !icon) return;
    downloadBlob(
      new Blob([buildLogoSvg(cfg, icon, 512)], { type: "image/svg+xml" }),
      "logo.svg",
    );
    toast.success("SVG downloaded");
  };

  const exportZip = async () => {
    if (!guardIcon() || !icon) return;
    if (!requireAuth("download the full logo kit")) return;
    if (!isPro) {
      toast.error("The full logo kit is a Pro feature - $11/mo or $29 once, yours forever.");
      return;
    }
    setBusy("zip");
    try {
      await downloadLogoKit(cfg, icon, cfg.text || icon.name);
      toast.success("Logo kit downloaded");
    } catch {
      toast.error("ZIP export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col bg-background lg:h-screen">
      {/* top bar */}
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-3">
          <Link
            to="/tools"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Tools
          </Link>
          <h1 className="text-[15px] font-bold">Logo Builder</h1>
          {icon && (
            <span className="hidden rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground sm:block">
              {icon.prefix}:{icon.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="hidden w-12 text-center text-xs tabular-nums text-muted-foreground min-[420px]:block">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={shuffle}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            <Dices className="h-4 w-4" /> <span className="hidden min-[420px]:inline">Shuffle</span>
          </button>
          <button
            onClick={exportZip}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy === "zip" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </button>
        </div>
      </header>

      {/* On mobile the three panes stack vertically and the page scrolls;
          on lg+ it's the classic three-column studio layout. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* left: icon picker */}
        <aside className="flex w-full flex-col border-b border-border/60 bg-card lg:w-[248px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 421,020 icons…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-sm outline-none focus:border-primary"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-64 min-h-0 flex-1 overflow-y-auto p-3 lg:max-h-none">
            {searching ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <p className="px-1 py-8 text-center text-sm text-muted-foreground">
                {query ? "No icons found - try another word." : "Type to search the library."}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {results.map((r) => {
                  const active = icon?.prefix === r.prefix && icon?.name === r.name;
                  return (
                    <button
                      key={`${r.prefix}:${r.name}`}
                      title={`${r.prefix}:${r.name}`}
                      onClick={() => void pickIcon(r.prefix, r.name)}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-lg border p-1.5 transition-colors",
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border/60 hover:border-primary/50 hover:bg-muted",
                      )}
                    >
                      <IconThumb prefix={r.prefix} name={r.name} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* center: canvas */}
        <main className="relative flex min-h-[320px] min-w-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.08)_1px,transparent_0)] bg-[size:22px_22px] lg:min-h-0 dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.09)_1px,transparent_0)]">
          {loadingIcon && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div
            style={{ transform: `scale(${zoom})` }}
            className="transition-transform"
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
          {!icon && !loadingIcon && (
            <p className="absolute bottom-6 rounded-full bg-card px-4 py-2 text-sm text-muted-foreground shadow">
              Pick an icon from the left to start building
            </p>
          )}
        </main>

        {/* right: controls */}
        <aside className="w-full overflow-y-auto border-t border-border/60 bg-card lg:w-[300px] lg:shrink-0 lg:border-l lg:border-t-0">
          <Section title="Style presets">
            <div className="grid grid-cols-8 gap-1.5">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g.name}
                  title={g.name}
                  onClick={() => {
                    set("bgType", "gradient");
                    set("bgColor", g.from);
                    set("bgColor2", g.to);
                    set("gradientAngle", g.angle);
                  }}
                  className={cn(
                    "aspect-square rounded-full border-2",
                    cfg.bgType === "gradient" && cfg.bgColor === g.from
                      ? "border-primary"
                      : "border-transparent hover:border-border",
                  )}
                  style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {SOLID_PRESETS.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => {
                    set("bgType", "solid");
                    set("bgColor", c);
                  }}
                  className={cn(
                    "aspect-square rounded-full border-2",
                    cfg.bgType === "solid" && cfg.bgColor === c
                      ? "border-primary"
                      : "border-border hover:border-primary/50",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
              {(["solid", "gradient", "transparent"] as BgType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => set("bgType", t)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-semibold capitalize",
                    cfg.bgType === t ? "bg-background shadow" : "text-muted-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Colors">
            <ColorField label="Background" value={cfg.bgColor} onChange={(v) => set("bgColor", v)} />
            {cfg.bgType === "gradient" && (
              <>
                <ColorField label="Gradient end" value={cfg.bgColor2} onChange={(v) => set("bgColor2", v)} />
                <Slider label="Gradient angle" value={cfg.gradientAngle} min={0} max={360} unit="°" onChange={(v) => set("gradientAngle", v)} />
              </>
            )}
            <Toggle label="Recolor icon" checked={cfg.recolorIcon} onChange={(v) => set("recolorIcon", v)} />
            {cfg.recolorIcon && (
              <ColorField label="Icon color" value={cfg.iconColor} onChange={(v) => set("iconColor", v)} />
            )}
          </Section>

          <Section title="Shape & size">
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
              {SHAPES.map((s) => (
                <button
                  key={s.name}
                  onClick={() => set("radiusPct", s.radius)}
                  className={cn(
                    "rounded-md px-1 py-1.5 text-[11px] font-semibold",
                    cfg.radiusPct === s.radius ? "bg-background shadow" : "text-muted-foreground",
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <Slider label="Corner radius" value={cfg.radiusPct} min={0} max={50} unit="%" onChange={(v) => set("radiusPct", v)} />
            <Slider label="Icon size" value={cfg.iconScale} min={10} max={90} unit="%" onChange={(v) => set("iconScale", v)} />
            <Slider label="Rotation" value={cfg.rotation} min={-180} max={180} unit="°" onChange={(v) => set("rotation", v)} />
            <Slider label="Icon opacity" value={cfg.opacity} min={10} max={100} unit="%" onChange={(v) => set("opacity", v)} />
          </Section>

          <Section title="Effects">
            <Toggle label="Drop shadow" checked={cfg.shadow} onChange={(v) => set("shadow", v)} />
            <Toggle label="Border stroke" checked={cfg.border} onChange={(v) => set("border", v)} />
            {cfg.border && (
              <>
                <ColorField label="Stroke color" value={cfg.borderColor} onChange={(v) => set("borderColor", v)} />
                <Slider label="Stroke width" value={cfg.borderWidth} min={1} max={32} unit="px" onChange={(v) => set("borderWidth", v)} />
              </>
            )}
          </Section>

          <Section title="Wordmark">
            <Toggle label="Show text" checked={cfg.showText} onChange={(v) => set("showText", v)} />
            {cfg.showText && (
              <>
                <div className="relative">
                  <Type className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={cfg.text}
                    onChange={(e) => set("text", e.target.value)}
                    placeholder="Brand name"
                    maxLength={24}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <Slider label="Text size" value={cfg.textSize} min={4} max={16} unit="%" onChange={(v) => set("textSize", v)} />
                <Slider label="Weight" value={cfg.textWeight} min={400} max={900} step={100} onChange={(v) => set("textWeight", v)} />
                <ColorField label="Text color" value={cfg.textColor} onChange={(v) => set("textColor", v)} />
              </>
            )}
          </Section>

          <Section title="Export">
            <button
              onClick={exportPng}
              disabled={busy !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
            >
              {busy === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              PNG · 1024px
            </button>
            <button
              onClick={exportSvg}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              <Download className="h-4 w-4" /> SVG · vector
            </button>
            <button
              onClick={exportZip}
              disabled={busy !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy === "zip" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPro ? (
                <Check className="h-4 w-4" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              Full logo kit (ZIP)
            </button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {isPro
                ? "Pro unlocked - kit includes favicons, app icons, SVG, manifest + HTML snippet."
                : "Kit includes favicons, app icons, manifest + HTML snippet. Pro only - $12/year."}
            </p>
          </Section>
        </aside>
      </div>

      {/* Popular searches: same tag chips every other tool page shows. */}
      <section className="border-t border-border bg-background px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-balance text-xl font-extrabold">Popular searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {getToolSeo("logo-builder").tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Tiny icon thumbnail in the picker grid (uses cached ReliableIcon machinery). */
function IconThumb({ prefix, name }: { prefix: string; name: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadIconData(prefix, name).then((d) => {
      if (!live || !d) return;
      const body = d.body;
      setSvg(
        `<svg viewBox="0 0 ${d.width ?? 24} ${d.height ?? 24}" width="22" height="22">${body}</svg>`,
      );
    });
    return () => {
      live = false;
    };
  }, [prefix, name]);
  if (!svg) return <span className="h-[22px] w-[22px] animate-pulse rounded bg-muted" />;
  return <span className="text-foreground" dangerouslySetInnerHTML={{ __html: svg }} />;
}
