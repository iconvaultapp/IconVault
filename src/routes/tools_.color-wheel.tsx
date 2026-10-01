// /tools/color-wheel - Interactive HSL color wheel with harmony modes,
// tints/shades and copy. 100% client-side.

import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Palette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/color-wheel")({
  head: () => {
    const seo = getToolSeoMeta("color-wheel");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ColorWheel,
});

const HARMONIES: { key: string; label: string; offsets: number[] }[] = [
  { key: "none", label: "None", offsets: [0] },
  { key: "complementary", label: "Complementary", offsets: [0, 180] },
  { key: "analogous", label: "Analogous", offsets: [-30, 0, 30] },
  { key: "triadic", label: "Triadic", offsets: [0, 120, 240] },
  { key: "split", label: "Split-complementary", offsets: [0, 150, 210] },
  { key: "tetradic", label: "Tetradic", offsets: [0, 60, 180, 240] },
  { key: "square", label: "Square", offsets: [0, 90, 180, 270] },
];

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`.toUpperCase();
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    pa
      .map((v, i) => Math.round(v + ((pb[i] ?? 0) - v) * t).toString(16).padStart(2, "0"))
      .join("")
  ).toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const WHEEL = 264;

function ColorWheel() {
  const { isPro } = usePlan();
  const trial = useToolTrial("color-wheel", isPro);
  const seo = getToolSeo("color-wheel");

  const [hue, setHue] = useState(168);
  const [sat, setSat] = useState(72);
  const [light, setLight] = useState(45);
  const [harmony, setHarmony] = useState("complementary");
  const [copied, setCopied] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const base = useMemo(() => hslToHex(hue, sat, light), [hue, sat, light]);

  const palette = useMemo(() => {
    const h = HARMONIES.find((x) => x.key === harmony) ?? HARMONIES[0]!;
    return h.offsets.map((o) => ({ hue: ((hue + o) % 360 + 360) % 360, hex: hslToHex(hue + o, sat, light) }));
  }, [hue, sat, light, harmony]);

  const tintsShades = useMemo(() => {
    const steps: { label: string; hex: string }[] = [];
    for (let i = 4; i >= 1; i--) steps.push({ label: `T${i}`, hex: mixHex(base, "#FFFFFF", i * 0.18) });
    steps.push({ label: "Base", hex: base });
    for (let i = 1; i <= 4; i++) steps.push({ label: `S${i}`, hex: mixHex(base, "#000000", i * 0.18) });
    return steps;
  }, [base]);

  const setFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    setHue(Math.round(((ang + 360) % 360)));
    setSat(Math.round(dist * 100));
  }, []);

  const marker = useMemo(() => {
    const rad = ((hue - 90) * Math.PI) / 180;
    const rr = (sat / 100) * (WHEEL / 2 - 8);
    return { left: WHEEL / 2 + Math.cos(rad) * rr, top: WHEEL / 2 + Math.sin(rad) * rr };
  }, [hue, sat]);

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      toast.error("Could not access the clipboard.");
    }
  };

  const copyPalette = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(palette.map((p) => p.hex).join(", "));
      trial.recordUse();
      toast.success("Palette copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="color-wheel" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Color Wheel" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex justify-center">
            <div
              ref={wheelRef}
              role="slider"
              aria-label="Hue and saturation"
              aria-valuetext={`${Math.round(hue)} degrees, ${Math.round(sat)} percent saturation`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") setHue((h) => (h + 359) % 360);
                if (e.key === "ArrowRight") setHue((h) => (h + 1) % 360);
                if (e.key === "ArrowUp") setSat((s) => Math.min(100, s + 2));
                if (e.key === "ArrowDown") setSat((s) => Math.max(0, s - 2));
              }}
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                setFromPointer(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (dragging.current) setFromPointer(e.clientX, e.clientY);
              }}
              onPointerUp={() => {
                dragging.current = false;
              }}
              className="relative cursor-crosshair touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                width: WHEEL,
                height: WHEEL,
                background:
                  "radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0) 68%), conic-gradient(from 0deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
              }}
            >
              {palette.map((p) => {
                const rad = ((p.hue - 90) * Math.PI) / 180;
                const rr = (sat / 100) * (WHEEL / 2 - 8);
                return (
                  <span
                    key={p.hex + p.hue}
                    className="pointer-events-none absolute h-2 w-2 rounded-full border border-white/80"
                    style={{
                      left: WHEEL / 2 + Math.cos(rad) * rr - 4,
                      top: WHEEL / 2 + Math.sin(rad) * rr - 4,
                      background: p.hex,
                    }}
                  />
                );
              })}
              <span
                className="pointer-events-none absolute h-5 w-5 rounded-full border-[3px] border-white shadow-lg"
                style={{ left: marker.left - 10, top: marker.top - 10, background: base }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground/80">Lightness</span>
              <span className="text-[13px] font-bold tabular-nums">{Math.round(light)}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={95}
              value={light}
              onChange={(e) => setLight(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Base color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={base}
                onChange={(e) => {
                  const hsl = hexToHsl(e.target.value);
                  if (hsl) {
                    setHue(hsl.h);
                    setSat(hsl.s);
                    setLight(hsl.l);
                  }
                }}
                className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
              <input
                value={base}
                spellCheck={false}
                onChange={(e) => {
                  const hsl = hexToHsl(e.target.value.trim());
                  if (hsl) {
                    setHue(hsl.h);
                    setSat(hsl.s);
                    setLight(hsl.l);
                  }
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm uppercase"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Harmony</p>
            <div className="flex flex-wrap gap-2">
              {HARMONIES.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => setHarmony(h.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    harmony === h.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyPalette}>
            <Palette className="h-4 w-4" /> Copy palette hex codes
          </ActionButton>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">
              {HARMONIES.find((h) => h.key === harmony)?.label} palette
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {palette.map((p) => (
                <button
                  key={p.hex + p.hue}
                  type="button"
                  onClick={() => copy(p.hex)}
                  className="group overflow-hidden rounded-xl border border-border text-left transition hover:border-primary/50"
                >
                  <span className="block h-20" style={{ background: p.hex }} />
                  <span className="flex items-center justify-between px-2.5 py-2 font-mono text-xs font-bold">
                    {p.hex}
                    {copied === p.hex ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground opacity-0 transition group-hover:opacity-100">
                        COPY
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Tints and shades</p>
            <div className="grid grid-cols-9 gap-1.5">
              {tintsShades.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => copy(t.hex)}
                  title={`${t.label}: ${t.hex}`}
                  className="group rounded-lg border border-border transition hover:border-primary/50"
                >
                  <span className="block h-14 rounded-t-md" style={{ background: t.hex }} />
                  <span className="block py-1 text-center font-mono text-[10px] font-bold">
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Click any swatch to copy its hex code. Tints mix the base with white, shades with black.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
