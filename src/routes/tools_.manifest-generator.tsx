// /tools/manifest-generator - PWA web app manifest builder: name, colors,
// display, start URL, icon upload (generates real 192px + 512px PNGs via
// canvas), shortcuts. Live manifest.json with copy + download. 100% client.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileUp, Plus, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/manifest-generator")({
  head: () => {
    const seo = getToolSeoMeta("manifest-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ManifestGeneratorTool,
});

const DISPLAYS = ["standalone", "fullscreen", "minimal-ui", "browser"] as const;
const ORIENTATIONS = ["any", "portrait", "landscape", "natural"] as const;

interface Shortcut {
  id: number;
  name: string;
  url: string;
}

let shortcutId = 1;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
    img.src = url;
  });
}

function resizePng(img: HTMLImageElement, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("Canvas not available.")); return; }
    // cover-crop to square
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - s) / 2;
    const sy = (img.naturalHeight - s) / 2;
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed."))), "image/png");
  });
}

function Field({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0f766e"}
          onChange={(e) => onChange(e.target.value)}
          className="h-[42px] w-12 shrink-0 cursor-pointer rounded-xl border border-border bg-background p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0f766e"
          spellCheck={false}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

function ManifestGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("manifest-generator", isPro);
  const seo = getToolSeo("manifest-generator");

  const [name, setName] = useState("My App");
  const [shortName, setShortName] = useState("App");
  const [description, setDescription] = useState("");
  const [startUrl, setStartUrl] = useState("/");
  const [scope, setScope] = useState("/");
  const [display, setDisplay] = useState<(typeof DISPLAYS)[number]>("standalone");
  const [orientation, setOrientation] = useState<(typeof ORIENTATIONS)[number]>("any");
  const [themeColor, setThemeColor] = useState("#0f766e");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgName, setImgName] = useState("");
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const manifest = useMemo(() => {
    const m: Record<string, unknown> = {
      name: name.trim() || "My App",
      short_name: shortName.trim() || undefined,
      description: description.trim() || undefined,
      start_url: startUrl.trim() || "/",
      scope: scope.trim() || "/",
      display,
      orientation: orientation === "any" ? undefined : orientation,
      background_color: bgColor.trim() || undefined,
      theme_color: themeColor.trim() || undefined,
      icons: img
        ? [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ]
        : undefined,
      shortcuts: shortcuts.length
        ? shortcuts.map((s) => ({ name: s.name.trim() || "Shortcut", url: s.url.trim() || "/" }))
        : undefined,
    };
    // drop undefined
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(m)) if (v !== undefined) clean[k] = v;
    return JSON.stringify(clean, null, 2) + "\n";
  }, [name, shortName, description, startUrl, scope, display, orientation, themeColor, bgColor, img, shortcuts]);

  const acceptFile = async (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose a PNG, JPG or WebP image.");
      return;
    }
    try {
      const loaded = await loadImage(f);
      setImg(loaded);
      setImgName(f.name);
      toast.success(`Icon loaded (${loaded.naturalWidth}x${loaded.naturalHeight}px)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  const downloadManifest = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([manifest], { type: "application/manifest+json" }), "manifest.json");
    trial.recordUse();
    toast.success("manifest.json downloaded");
  };

  const downloadIcon = async (size: 192 | 512) => {
    if (!img || !trial.canUse || busy) return;
    setBusy(true);
    try {
      const blob = await resizePng(img, size);
      downloadBlob(blob, `icon-${size}.png`);
      trial.recordUse();
      toast.success(`icon-${size}.png downloaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Icon export failed.");
    } finally {
      setBusy(false);
    }
  };

  const copyManifest = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(manifest);
      trial.recordUse();
      toast.success("manifest.json copied");
    } catch {
      toast.error("Copy failed, select the text manually.");
    }
  };

  const addShortcut = () => setShortcuts((s) => [...s, { id: shortcutId++, name: "", url: "" }]);

  return (
    <ToolPageShell toolId="manifest-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="PWA Manifest" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
            <Smartphone className="h-4 w-4" /> App details
          </p>

          <Field label="Name" value={name} onChange={setName} placeholder="My Awesome App" />
          <Field label="Short name" value={shortName} onChange={setShortName} placeholder="App" hint="Shown under the home-screen icon." />
          <Field label="Description" value={description} onChange={setDescription} placeholder="What the app does" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start URL" value={startUrl} onChange={setStartUrl} placeholder="/" />
            <Field label="Scope" value={scope} onChange={setScope} placeholder="/" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Display</label>
              <select
                value={display}
                onChange={(e) => setDisplay(e.target.value as (typeof DISPLAYS)[number])}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {DISPLAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as (typeof ORIENTATIONS)[number])}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Theme color" value={themeColor} onChange={setThemeColor} />
            <ColorField label="Background color" value={bgColor} onChange={setBgColor} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">App icon</p>
            <div
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-4 transition hover:border-primary/40"
            >
              {img ? (
                <img src={img.src} alt="App icon" className="h-12 w-12 rounded-lg" />
              ) : (
                <FileUp className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-semibold">{imgName || "Upload icon PNG"}</p>
                <p className="text-xs text-muted-foreground">
                  {img ? `${img.naturalWidth}x${img.naturalHeight}px - generates 192 and 512 PNGs below` : "Square PNG works best, 512px or larger"}
                </p>
              </div>
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
            </div>
            {img && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!trial.canUse || busy}
                  onClick={() => void downloadIcon(192)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> icon-192.png
                </button>
                <button
                  type="button"
                  disabled={!trial.canUse || busy}
                  onClick={() => void downloadIcon(512)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> icon-512.png
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Shortcuts <span className="text-muted-foreground">(optional)</span></p>
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div key={s.id} className="flex gap-2">
                  <input
                    value={s.name}
                    onChange={(e) => setShortcuts((all) => all.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
                    placeholder="Shortcut name"
                    className="w-2/5 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={s.url}
                    onChange={(e) => setShortcuts((all) => all.map((x) => (x.id === s.id ? { ...x, url: e.target.value } : x)))}
                    placeholder="/shortcuts/new"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShortcuts((all) => all.filter((x) => x.id !== s.id))}
                    aria-label="Remove shortcut"
                    className="rounded-xl border border-border px-2.5 text-muted-foreground transition hover:border-red-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addShortcut}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add shortcut
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <p className="text-sm font-bold">manifest.json <span className="font-normal text-muted-foreground">- live</span></p>
          </div>
          <pre className="max-h-[560px] overflow-auto p-5 font-mono text-[13px] leading-relaxed">{manifest}</pre>
          <div className="flex flex-wrap gap-2 border-t border-border p-5">
            <ActionButton disabled={!trial.canUse} onClick={downloadManifest}>
              <Download className="h-4 w-4" /> Download manifest.json
            </ActionButton>
            <button
              type="button"
              disabled={!trial.canUse}
              onClick={copyManifest}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          {!isPro && (
            <p className="px-5 pb-4 text-xs text-muted-foreground">
              Link it from your HTML head: <code className="rounded bg-muted px-1 font-mono">&lt;link rel="manifest" href="/manifest.json"&gt;</code>
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
