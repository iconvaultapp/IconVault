// IconVault v56 - CSS device-frame preview plus canvas PNG export for /mockups.
// Preview geometry mirrors src/lib/mockup-frames.ts (layoutFor) so what you
// see is what the PNG export draws. The frame CSS itself is original
// IconVault code in mockup-frames.css; no third-party frame CSS is used.
// Exports go through src/lib/download-guard.ts (signup before download).

import "./mockup-frames.css";
import { downloadWithGate } from "@/lib/download-guard";
import {
  fitRect,
  layoutFor,
  roundedRectPath,
  type BgPreset,
  type MockupFrame,
} from "@/lib/mockup-frames";

export interface MockupDeviceFrameProps {
  frame: MockupFrame;
  colorBody: string;
  imageSrc?: string | null;
  fit?: "cover" | "contain";
  screenWidth?: number;
  background?: string;
  padding?: number;
}

function defaultScreenWidth(frame: MockupFrame): number {
  switch (frame.category) {
    case "Phones":
      return 260;
    case "Tablets":
      return 320;
    case "Watches":
      return 180;
    default:
      return 480;
  }
}

function Placeholder() {
  return (
    <div className="iv-mockup-placeholder" aria-hidden="true">
      <div className="iv-mockup-placeholder-bar" style={{ width: "55%", height: 10 }} />
      <div className="iv-mockup-placeholder-bar-soft" style={{ width: "80%", height: 8 }} />
      <div className="iv-mockup-placeholder-bar-soft" style={{ width: "65%", height: 8 }} />
      <div className="iv-mockup-placeholder-card" />
      <div className="iv-mockup-placeholder-bar" style={{ width: "40%", height: 12 }} />
    </div>
  );
}

export function MockupDeviceFrame({
  frame,
  colorBody,
  imageSrc,
  fit = "cover",
  screenWidth,
  background,
  padding = 16,
}: MockupDeviceFrameProps) {
  const screenW = screenWidth ?? defaultScreenWidth(frame);
  const unit = layoutFor(frame, screenW);
  const bezelH = unit.totalH - unit.baseH - unit.standH;
  const isDarkBody = colorBody.toLowerCase() === "#1c1c1e" || colorBody.toLowerCase() === "#2c2c2e";
  const screenR = Math.max(0, unit.radius - unit.bezel);

  return (
    <div className="iv-mockup-stage" style={{ background: background ?? "transparent", padding }}>
      <div>
        <div
          className="iv-mockup-device"
          style={{
            width: unit.totalW,
            height: bezelH,
            background: colorBody,
            borderRadius: unit.radius,
            paddingTop: unit.chromeH + unit.bezel,
            paddingLeft: unit.bezel,
            paddingRight: unit.bezel,
            paddingBottom: unit.bezel,
            boxSizing: "border-box",
          }}
        >
          {frame.chrome === "browser" && (
            <div
              className={`iv-mockup-browserbar${isDarkBody ? " iv-mockup-browserbar-dark" : ""}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: unit.chromeH,
                borderRadius: `${unit.radius}px ${unit.radius}px 0 0`,
              }}
            >
              <span className="iv-mockup-dot" style={{ background: "#ff5f57" }} />
              <span className="iv-mockup-dot" style={{ background: "#febc2e" }} />
              <span className="iv-mockup-dot" style={{ background: "#28c840" }} />
              <span className="iv-mockup-url" />
            </div>
          )}
          <div
            className={`iv-mockup-screen iv-mockup-screen-${fit}`}
            style={{ width: unit.screenW, height: unit.screenH, borderRadius: screenR }}
          >
            {imageSrc ? (
              <img src={imageSrc} alt="" />
            ) : (
              <Placeholder />
            )}
            {frame.notch === "dynamic-island" && (
              <span
                className="iv-mockup-island"
                style={{ width: unit.screenW * 0.32, height: Math.max(10, unit.screenW * 0.055) }}
              />
            )}
            {frame.notch === "notch" && (
              <span
                className="iv-mockup-notch"
                style={{ width: unit.screenW * 0.42, height: Math.max(10, unit.screenW * 0.05) }}
              />
            )}
            {frame.notch === "punch-hole" && (
              <span
                className="iv-mockup-punch"
                style={{ width: Math.max(8, unit.screenW * 0.05), height: Math.max(8, unit.screenW * 0.05) }}
              />
            )}
          </div>
          {frame.chrome === "crown" && <span className="iv-mockup-crown" />}
        </div>
        {frame.chrome === "laptop-base" && (
          <div className="iv-mockup-base" style={{ width: unit.totalW * 1.14, height: unit.baseH }}>
            <div className="iv-mockup-base-notch" />
          </div>
        )}
        {frame.chrome === "stand" && (
          <div>
            <div className="iv-mockup-stand-neck" style={{ width: unit.totalW * 0.12, height: unit.standH * 0.7 }} />
            <div className="iv-mockup-stand-foot" style={{ width: unit.totalW * 0.45, height: unit.standH * 0.3 }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Load an image element from a data URL or URL (used by the PNG export). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

export interface ExportMockupOptions {
  image: HTMLImageElement;
  frame: MockupFrame;
  colorBody: string;
  bg: BgPreset;
  customBg: string;
  fit: "cover" | "contain";
  paddingPct: number;
  scale: number;
}

function isDarkHex(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return false;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

/**
 * Draw the framed mockup to a canvas and download it through the download
 * guard. Returns true when the download ran now, false when it was parked
 * for after-login resume (the sign-in prompt is requested by the guard).
 */
export async function exportMockupPng(opts: ExportMockupOptions): Promise<boolean> {
  const { image, frame, colorBody, bg, customBg, fit, paddingPct, scale } = opts;
  const unit = layoutFor(frame, 1000);
  const pad = Math.round((1000 * paddingPct) / 100);
  const bezelH = unit.totalH - unit.baseH - unit.standH;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((unit.totalW + pad * 2) * scale));
  canvas.height = Math.max(1, Math.round((unit.totalH + pad * 2) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.scale(scale, scale);
  const ox = pad;
  const oy = pad;
  const fullW = unit.totalW + pad * 2;
  const fullH = unit.totalH + pad * 2;

  const bgFill = bg.id === "custom" ? { type: "solid" as const, color: customBg } : bg.canvas;
  if (bgFill) {
    if (bgFill.type === "solid") {
      ctx.fillStyle = bgFill.color;
      ctx.fillRect(0, 0, fullW, fullH);
    } else {
      const rad = (bgFill.angle * Math.PI) / 180;
      const gx = Math.cos(rad);
      const gy = Math.sin(rad);
      const grad = ctx.createLinearGradient(
        fullW * (0.5 - gx / 2),
        fullH * (0.5 - gy / 2),
        fullW * (0.5 + gx / 2),
        fullH * (0.5 + gy / 2),
      );
      grad.addColorStop(0, bgFill.from);
      grad.addColorStop(1, bgFill.to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, fullW, fullH);
    }
  }

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  roundedRectPath(ctx, ox, oy, unit.totalW, bezelH, unit.radius);
  ctx.fillStyle = colorBody;
  ctx.fill();
  ctx.restore();

  if (frame.chrome === "browser") {
    const dark = isDarkHex(colorBody);
    ctx.fillStyle = dark ? "#2c2c2e" : "#ececf0";
    ctx.fillRect(ox, oy, unit.totalW, unit.chromeH);
    const dots = ["#ff5f57", "#febc2e", "#28c840"];
    dots.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(ox + 18 + i * 20, oy + unit.chromeH / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    });
    roundedRectPath(ctx, ox + 70, oy + unit.chromeH / 2 - 10, unit.totalW - 90, 20, 10);
    ctx.fillStyle = dark ? "#48484a" : "#ffffff";
    ctx.fill();
  }

  const sx = ox + unit.screenX;
  const sy = oy + unit.screenY;
  const scrR = Math.max(0, unit.radius - unit.bezel);
  ctx.save();
  roundedRectPath(ctx, sx, sy, unit.screenW, unit.screenH, scrR);
  ctx.clip();
  if (fit === "contain") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx, sy, unit.screenW, unit.screenH);
  }
  const f = fitRect(image.naturalWidth, image.naturalHeight, unit.screenW, unit.screenH, fit);
  ctx.drawImage(image, f.sx, f.sy, f.sw, f.sh, sx + f.dx, sy + f.dy, f.dw, f.dh);
  ctx.restore();

  ctx.fillStyle = "#000000";
  if (frame.notch === "dynamic-island") {
    const w = unit.screenW * 0.32;
    const h = Math.max(10, unit.screenW * 0.055);
    roundedRectPath(ctx, sx + (unit.screenW - w) / 2, sy + unit.screenH * 0.025, w, h, h / 2);
    ctx.fill();
  } else if (frame.notch === "notch") {
    const w = unit.screenW * 0.42;
    const h = Math.max(10, unit.screenW * 0.05);
    roundedRectPath(ctx, sx + (unit.screenW - w) / 2, sy, w, h, h / 2);
    ctx.fill();
  } else if (frame.notch === "punch-hole") {
    const d = Math.max(8, unit.screenW * 0.05);
    ctx.beginPath();
    ctx.arc(sx + unit.screenW / 2, sy + unit.screenH * 0.03 + d / 2, d / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (frame.chrome === "laptop-base") {
    const botW = unit.totalW * 1.14;
    const by = oy + bezelH;
    ctx.beginPath();
    ctx.moveTo(ox, by);
    ctx.lineTo(ox + unit.totalW, by);
    ctx.lineTo(ox + (unit.totalW + botW) / 2, by + unit.baseH);
    ctx.lineTo(ox + (unit.totalW - botW) / 2, by + unit.baseH);
    ctx.closePath();
    ctx.fillStyle = "#c9c9ce";
    ctx.fill();
  }
  if (frame.chrome === "stand") {
    const sy2 = oy + bezelH;
    ctx.fillStyle = "#b9b9be";
    ctx.fillRect(ox + unit.totalW * 0.44, sy2, unit.totalW * 0.12, unit.standH * 0.7);
    roundedRectPath(
      ctx,
      ox + unit.totalW * 0.275,
      sy2 + unit.standH * 0.7,
      unit.totalW * 0.45,
      unit.standH * 0.3,
      6,
    );
    ctx.fillStyle = "#c9c9ce";
    ctx.fill();
  }
  if (frame.chrome === "crown") {
    ctx.fillStyle = "#8a8a8e";
    ctx.fillRect(ox + unit.totalW, oy + bezelH * 0.3, 8, bezelH * 0.18);
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;
  return downloadWithGate(blob, `mockup-${frame.id}.png`);
}
