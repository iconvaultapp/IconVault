// /mockups - mockup tool plus static mockup templates gallery.
// Tool: upload a screenshot (FileReader, client side only, nothing is sent
// to a server), pick a CSS device frame, preview it, export a PNG with a
// client side canvas. Every download on this page goes through the v55
// download guard (signup before download): template zips via
// ZipDownloadButton, tool PNGs via exportMockupPng in mockup-device-frame.

import { useMemo, useRef, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Download, Image as ImageIcon, Search, Upload } from "lucide-react";
import PageShell from "@/components/PageShell";
import { ZipDownloadButton } from "@/components/V55Download";
import { MockupDeviceFrame, exportMockupPng, loadImage } from "@/components/mockup-device-frame";
import { BG_PRESETS, type BgPreset } from "@/lib/mockup-frames";
import {
  FRAMES,
  FRAMES_TOTAL,
  MOCKUPS,
  MOCKUP_CATEGORIES,
  MOCKUPS_TOTAL,
} from "@/lib/mockups-data";

export const Route = createLazyFileRoute("/mockups")({
  component: Page,
});

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600" viewBox="0 0 900 1600"><rect width="900" height="1600" fill="#f7f4ee"/><rect width="900" height="120" fill="#0d7a68"/><circle cx="90" cy="60" r="30" fill="#ffffff"/><rect x="140" y="48" width="200" height="24" rx="12" fill="#ffffff"/><rect x="80" y="200" width="500" height="52" rx="10" fill="#1c1c1e"/><rect x="80" y="280" width="380" height="52" rx="10" fill="#1c1c1e"/><rect x="80" y="380" width="740" height="24" rx="12" fill="#9ca3af"/><rect x="80" y="420" width="620" height="24" rx="12" fill="#d1d5db"/><rect x="80" y="500" width="240" height="64" rx="32" fill="#0d7a68"/><rect x="80" y="640" width="740" height="300" rx="20" fill="#ffffff"/><rect x="80" y="980" width="740" height="300" rx="20" fill="#ffffff"/><rect x="120" y="680" width="400" height="22" rx="11" fill="#0d7a68"/><rect x="120" y="1020" width="400" height="22" rx="11" fill="#0d7a68"/></svg>`;
const SAMPLE_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SAMPLE_SVG)}`;

const FRAME_CATEGORIES = ["Phones", "Tablets", "Laptops", "Desktops", "Watches", "Browsers"] as const;

function miniWidth(category: string): number {
  switch (category) {
    case "Phones":
      return 110;
    case "Tablets":
      return 180;
    case "Watches":
      return 130;
    default:
      return 250;
  }
}

function Page() {
  const [imageSrc, setImageSrc] = useState<string>(SAMPLE_SRC);
  const [imageName, setImageName] = useState("Sample screenshot");
  const [frameCategory, setFrameCategory] = useState<string>("Phones");
  const [frameId, setFrameId] = useState("iphone-pro");
  const [colorBody, setColorBody] = useState("#1c1c1e");
  const [bgId, setBgId] = useState("mint");
  const [customBg, setCustomBg] = useState("#0d7a68");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [paddingPct, setPaddingPct] = useState(8);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const framesInCategory = useMemo(
    () => FRAMES.filter((f) => f.category === frameCategory),
    [frameCategory],
  );
  const frame = FRAMES.find((f) => f.id === frameId) ?? framesInCategory[0] ?? FRAMES[0]!;
  const bgPreset: BgPreset =
    bgId === "custom"
      ? { id: "custom", name: "Custom", css: customBg, canvas: null }
      : (BG_PRESETS.find((b) => b.id === bgId) ?? BG_PRESETS[0]!);
  const bgCss = bgId === "custom" ? customBg : bgPreset.css;

  const selectFrame = (id: string) => {
    const next = FRAMES.find((f) => f.id === id);
    if (!next) return;
    setFrameId(id);
    const firstColor = next.colors[0];
    if (firstColor && !next.colors.some((c) => c.body === colorBody)) {
      setColorBody(firstColor.body);
    }
  };

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageSrc(reader.result);
        setImageName(file.name);
        setExportMsg("");
      }
    };
    reader.readAsDataURL(file);
  };

  const onExport = async () => {
    setBusy(true);
    setExportMsg("");
    try {
      const img = await loadImage(imageSrc);
      const ran = await exportMockupPng({
        image: img,
        frame,
        colorBody,
        bg: bgPreset,
        customBg,
        fit,
        paddingPct,
        scale,
      });
      setExportMsg(
        ran
          ? "PNG downloaded."
          : "Sign in to finish the download. It will resume automatically after you sign in.",
      );
    } catch {
      setExportMsg("Export failed. Try a different image file.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCKUPS.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (q && !(t.title + " " + t.slug + " " + t.category).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  return (
    <PageShell
      eyebrow="Mockups"
      title="Mockup tool and free mockup templates"
      description={`Turn a screenshot into a device mockup right here, or start from one of ${MOCKUPS_TOTAL} original HTML mockup templates. Your screenshot never leaves your browser. Previews are free; downloads need a free account.`}
    >
      <div className="mx-auto max-w-6xl space-y-10">
        {/* ---------------- Mockup tool ---------------- */}
        <section aria-label="Mockup tool" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Mockup tool</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a screenshot, pick a frame, then export a PNG. A sample screenshot is loaded so you can try it right away.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-border bg-surface-2 p-4">
              <MockupDeviceFrame
                frame={frame}
                colorBody={colorBody}
                imageSrc={imageSrc}
                fit={fit}
                background={bgCss}
                padding={24}
              />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {frame.name} · {imageName}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Upload className="h-4 w-4" /> Upload screenshot
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageSrc(SAMPLE_SRC);
                    setImageName("Sample screenshot");
                    setExportMsg("");
                  }}
                  className="ml-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Use sample
                </button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Read with FileReader on your device. No server upload.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Device frame ({FRAMES_TOTAL} frames)</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {FRAME_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setFrameCategory(c);
                        const first = FRAMES.find((f) => f.category === c);
                        if (first) selectFrame(first.id);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        frameCategory === c ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <select
                  value={frame.id}
                  onChange={(e) => selectFrame(e.target.value)}
                  className="mt-2 w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm"
                  aria-label="Pick a device frame"
                >
                  {framesInCategory.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {frame.colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      title={c.name}
                      aria-label={`Frame colour ${c.name}`}
                      onClick={() => setColorBody(c.body)}
                      className={`h-8 w-8 rounded-full border-2 ${colorBody === c.body ? "border-primary" : "border-border"}`}
                      style={{ background: c.body }}
                    />
                  ))}
                  <span className="self-center text-xs text-muted-foreground">
                    {frame.colors.find((c) => c.body === colorBody)?.name ?? "Frame colour"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">Background</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {BG_PRESETS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBgId(b.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        bgId === b.id ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBgId("custom")}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      bgId === "custom" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {bgId === "custom" && (
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="mt-2 h-10 w-16 rounded border border-border bg-card p-1"
                    aria-label="Custom background colour"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="text-sm font-medium">
                  Fit
                  <select
                    value={fit}
                    onChange={(e) => setFit(e.target.value === "contain" ? "contain" : "cover")}
                    className="mt-1 w-full rounded-full border border-border bg-card px-3 py-2 text-sm font-normal"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Padding
                  <select
                    value={paddingPct}
                    onChange={(e) => setPaddingPct(Number(e.target.value))}
                    className="mt-1 w-full rounded-full border border-border bg-card px-3 py-2 text-sm font-normal"
                  >
                    <option value={0}>None</option>
                    <option value={8}>Small</option>
                    <option value={16}>Large</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Export size
                  <select
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="mt-1 w-full rounded-full border border-border bg-card px-3 py-2 text-sm font-normal"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                  </select>
                </label>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => void onExport()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> {busy ? "Preparing…" : "Export PNG"}
                </button>
                {exportMsg && <p className="mt-2 text-xs text-muted-foreground">{exportMsg}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  Downloads need a free account. If you are not signed in, you will be asked to sign in and the download resumes automatically.
                  For background, padding and shadow controls, see the full{" "}
                  <Link to="/tools/mockup-studio" className="font-medium text-primary hover:underline">
                    Mockup Studio
                  </Link>{" "}
                  tool.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Static templates gallery ---------------- */}
        <section aria-label="Mockup templates gallery">
          <h2 className="text-xl font-semibold">Mockup templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {MOCKUPS_TOTAL} original single-file HTML templates. Preview each one, then download the files. No PSD files, no third-party mockup sites.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search mockup templates…"
                className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm"
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {MOCKUP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Showing {filtered.length} of {MOCKUPS_TOTAL} templates · all free downloads (free account needed)
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => {
              const tFrame = FRAMES.find((f) => f.id === t.frame) ?? FRAMES[0]!;
              return (
                <article key={t.slug} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                  {t.category === "branding" ? (
                    <div className="flex h-72 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
                      <MockupDeviceFrame frame={tFrame} colorBody="#1c1c1e" screenWidth={miniWidth(tFrame.category)} padding={8} />
                    </div>
                  )}
                  <h3 className="mt-4 text-base font-semibold">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.source} · {t.license} · {t.category}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{t.note}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <a
                      href={`/mockups/${t.slug}/${t.entry}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
                    >
                      Open full preview
                    </a>
                    <ZipDownloadButton slug={t.slug} files={t.files} basePath="/mockups" label="Download .zip" />
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No mockup templates match that search.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">About these mockups</h2>
          <p className="mt-2">
            All {MOCKUPS_TOTAL} templates are original IconVault HTML and CSS, drawn without images, fonts or files from outside sources, so each one works
            offline as a single file. Device frames in the tool are original IconVault CSS rendering the frame geometry in the site&apos;s own frame catalog.
            No PSD file was downloaded or re-listed here, and no file from any mockup site is included. The frame sources checked during this work were
            marvelapp/devices.css (MIT, verified from its LICENSE file) and css-device-frames (MIT reported, repository LICENSE file not directly read), and
            neither was copied into this project.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
