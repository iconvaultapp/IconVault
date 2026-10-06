// /tools/color-blindness-simulator - Preview images through 8 color vision
// deficiency simulations via SVG feColorMatrix filters. 100% in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/color-blindness-simulator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/color-blindness-simulator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/color-blindness-simulator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/color-blindness-simulator";
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
  component: ColorBlindnessTool,
});

/** Machado-style feColorMatrix rows (R G B A + offset), one 20-number string per type. */
const SIMS: { id: string; label: string; about: string; matrix: string }[] = [
  {
    id: "original", label: "Original", about: "Unchanged image",
    matrix: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0",
  },
  {
    id: "protanopia", label: "Protanopia", about: "Red-blind: red cone cells missing",
    matrix: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  },
  {
    id: "protanomaly", label: "Protanomaly", about: "Red-weak: shifted red cone sensitivity",
    matrix: "0.817 0.183 0 0 0  0.333 0.667 0 0 0  0 0.125 0.875 0 0  0 0 0 1 0",
  },
  {
    id: "deuteranopia", label: "Deuteranopia", about: "Green-blind: green cone cells missing",
    matrix: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  },
  {
    id: "deuteranomaly", label: "Deuteranomaly", about: "Green-weak: the most common CVD type",
    matrix: "0.8 0.2 0 0 0  0.258 0.742 0 0 0  0 0.142 0.858 0 0  0 0 0 1 0",
  },
  {
    id: "tritanopia", label: "Tritanopia", about: "Blue-blind: blue cone cells missing",
    matrix: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
  },
  {
    id: "tritanomaly", label: "Tritanomaly", about: "Blue-weak: rare, often acquired",
    matrix: "0.967 0.033 0 0 0  0 0.733 0.267 0 0  0 0.183 0.817 0 0  0 0 0 1 0",
  },
  {
    id: "achromatopsia", label: "Achromatopsia", about: "Total color blindness: rod vision only",
    matrix: "0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0",
  },
  {
    id: "achromatomaly", label: "Achromatomaly", about: "Partial color blindness: very low saturation",
    matrix: "0.618 0.32 0.062 0 0  0.163 0.775 0.062 0 0  0.163 0.32 0.516 0 0  0 0 0 1 0",
  },
];

/** Draw a colorful sample image so the tool works without an upload. */
function makeSampleImage(): string {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 400;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 640, 0);
  grad.addColorStop(0, "#ef4444");
  grad.addColorStop(0.25, "#f59e0b");
  grad.addColorStop(0.5, "#22c55e");
  grad.addColorStop(0.75, "#3b82f6");
  grad.addColorStop(1, "#8b5cf6");
  g.fillStyle = grad;
  g.fillRect(0, 0, 640, 400);
  const dots = ["#0f172a", "#f8fafc", "#dc2626", "#16a34a", "#f8fafc", "#0f172a"];
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(80 + i * 96, 120, 42, 0, Math.PI * 2);
    g.fillStyle = dots[i] ?? "#0f172a";
    g.fill();
  }
  g.font = "bold 56px system-ui, sans-serif";
  g.textAlign = "center";
  g.fillStyle = "#f8fafc";
  g.fillText("Aa Bb Cc 123", 320, 250);
  g.font = "bold 34px system-ui, sans-serif";
  g.fillStyle = "#0f172a";
  g.fillText("Red  Green  Blue", 320, 330);
  const bars = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"];
  for (let i = 0; i < 5; i++) {
    g.fillStyle = bars[i] ?? "#ffffff";
    g.fillRect(40 + i * 120, 20, 90, 40);
  }
  return c.toDataURL("image/png");
}

function ColorBlindnessTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("color-blindness-simulator", isPro);
  const seo = toolSeo;

  const [imgUrl, setImgUrl] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState("protanopia");
  const [grid, setGrid] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a PNG, JPG, WebP or GIF image.");
      return;
    }
    if (!trial.canUse) {
      setError(`Free trial used up - ${TOOL_TRIAL_LIMIT} previews per tool. Go Pro for unlimited.`);
      return;
    }
    setImgUrl(URL.createObjectURL(f));
    setName(f.name);
    setError(null);
    trial.recordUse();
    toast.success("Image loaded - pick a simulation below");
  }, [trial]);

  const useSample = useCallback(() => {
    if (!trial.canUse) {
      setError(`Free trial used up - ${TOOL_TRIAL_LIMIT} previews per tool. Go Pro for unlimited.`);
      return;
    }
    setImgUrl(makeSampleImage());
    setName("sample");
    setError(null);
    trial.recordUse();
    toast.success("Sample image loaded");
  }, [trial]);

  const simsToShow = grid ? SIMS : SIMS.filter((s) => s.id === active || s.id === "original");

  return (
    <ToolPageShell toolId="color-blindness-simulator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Color Blindness Simulator" left={trial.left} />

      {/* Hidden SVG filter defs */}
      <svg aria-hidden className="absolute h-0 w-0">
        <defs>
          {SIMS.map((s) => (
            <filter key={s.id} id={`cvd-${s.id}`}>
              <feColorMatrix type="matrix" values={s.matrix} />
            </filter>
          ))}
        </defs>
      </svg>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{name || "Drop an image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP, GIF - stays on your device</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ""; }} />
          </div>

          <ActionButton disabled={!trial.canUse} onClick={useSample}>
            <ImageIcon className="h-4 w-4" /> Use sample image
          </ActionButton>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Simulation</p>
            <div className="grid grid-cols-2 gap-2">
              {SIMS.slice(1).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setActive(s.id); setGrid(false); }}
                  title={s.about}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs font-bold transition",
                    active === s.id && !grid
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setGrid((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
              grid ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/80 hover:border-primary/40",
            )}
          >
            <Eye className="h-4 w-4" /> {grid ? "Grid compare: on" : "Compare all in a grid"}
          </button>

          <p className="text-xs text-muted-foreground">
            Note: this is an approximate simulation, not a medical diagnosis. Individual color vision varies.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free previews left - images never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!imgUrl ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Eye className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">No image yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upload a design, screenshot or photo - or use the sample - to preview it through 8 types of color vision deficiency.
              </p>
            </div>
          ) : (
            <div className={cn("grid gap-4", grid ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
              {simsToShow.map((s) => (
                <figure key={s.id} className="overflow-hidden rounded-xl border border-border">
                  <img src={imgUrl} alt={`${s.label} simulation`} className="block max-h-[420px] w-full object-contain bg-black" style={{ filter: `url(#cvd-${s.id})` }} />
                  <figcaption className="bg-muted/40 px-3 py-2">
                    <p className="text-sm font-bold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.about}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
