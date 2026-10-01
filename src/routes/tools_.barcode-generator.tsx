// /tools/barcode-generator - render CODE128, EAN-13, EAN-8, UPC, Code 39,
// ITF-14 barcodes with JsBarcode. Export as SVG or PNG. 100% client-side.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import JsBarcode from "jsbarcode";
import { Barcode, Copy, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/barcode-generator")({
  head: () => {
    const seo = getToolSeoMeta("barcode-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BarcodeGeneratorTool,
});

type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39" | "ITF14";

const FORMATS: { id: BarcodeFormat; label: string; sample: string; hint: string }[] = [
  { id: "CODE128", label: "Code 128", sample: "ICONVAULT123", hint: "Any printable ASCII text" },
  { id: "EAN13", label: "EAN-13", sample: "590123412345", hint: "12 or 13 digits" },
  { id: "EAN8", label: "EAN-8", sample: "96385074", hint: "7 or 8 digits" },
  { id: "UPC", label: "UPC-A", sample: "03600029145", hint: "11 or 12 digits" },
  { id: "CODE39", label: "Code 39", sample: "ICON-VAULT", hint: "A-Z, 0-9 and - . $ / + % space" },
  { id: "ITF14", label: "ITF-14", sample: "1590123412345", hint: "13 or 14 digits" },
];

/** Returns an error message, or null when the data is valid for the format. */
function validateData(format: BarcodeFormat, data: string): string | null {
  const d = data.trim();
  if (!d) return "Enter data to encode";
  switch (format) {
    case "EAN13":
      return /^\d{12,13}$/.test(d) ? null : "EAN-13 needs 12 or 13 digits";
    case "EAN8":
      return /^\d{7,8}$/.test(d) ? null : "EAN-8 needs 7 or 8 digits";
    case "UPC":
      return /^\d{11,12}$/.test(d) ? null : "UPC needs 11 or 12 digits";
    case "ITF14":
      return /^\d{13,14}$/.test(d) ? null : "ITF-14 needs 13 or 14 digits";
    case "CODE39":
      return /^[A-Z0-9\-.$/+% ]+$/.test(d.toUpperCase())
        ? null
        : "Code 39 allows A-Z, 0-9 and - . $ / + % space only";
    case "CODE128":
      return /^[\x20-\x7E]*$/.test(d) ? null : "Code 128 needs printable ASCII text";
  }
}

interface RenderOpts {
  barWidth: number;
  height: number;
  showText: boolean;
  fontSize: number;
  textMargin: number;
  bgColor: string;
  fgColor: string;
}

function BarcodeGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("barcode-generator", isPro);
  const seo = getToolSeo("barcode-generator");

  const svgRef = useRef<SVGSVGElement>(null);
  const [format, setFormat] = useState<BarcodeFormat>("CODE128");
  const [data, setData] = useState("ICONVAULT123");
  const [barWidth, setBarWidth] = useState(2);
  const [height, setHeight] = useState(100);
  const [showText, setShowText] = useState(true);
  const [fontSize, setFontSize] = useState(20);
  const [textMargin, setTextMargin] = useState(2);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [fgColor, setFgColor] = useState("#000000");

  const payload = (format === "CODE39" ? data.toUpperCase() : data).trim();

  const renderBarcode = (silent: boolean): boolean => {
    const svg = svgRef.current;
    if (!svg) return false;
    if (!payload) {
      svg.innerHTML = "";
      return false;
    }
    if (validateData(format, data)) return false;
    const opts: RenderOpts = { barWidth, height, showText, fontSize, textMargin, bgColor, fgColor };
    try {
      JsBarcode(svg, payload, {
        format,
        width: opts.barWidth,
        height: opts.height,
        displayValue: opts.showText,
        fontSize: opts.fontSize,
        textMargin: opts.textMargin,
        background: opts.bgColor,
        lineColor: opts.fgColor,
        margin: 10,
      });
      return true;
    } catch {
      if (!silent) toast.error(`Invalid data for ${format}`);
      return false;
    }
  };

  // Live preview whenever any option changes (does not consume trial uses).
  useEffect(() => {
    renderBarcode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, data, barWidth, height, showText, fontSize, textMargin, bgColor, fgColor]);

  const changeFormat = (f: BarcodeFormat) => {
    setFormat(f);
    setData(FORMATS.find((x) => x.id === f)?.sample ?? "");
  };

  const generate = () => {
    if (!trial.canUse) return;
    const err = validateData(format, data);
    if (err) {
      toast.error(err);
      return;
    }
    if (renderBarcode(false)) {
      trial.recordUse();
      toast.success("Barcode generated");
    }
  };

  const serializedSvg = (): string | null => {
    const svg = svgRef.current;
    if (!svg || !svg.innerHTML) {
      toast.error("Generate a barcode first");
      return null;
    }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(clone);
  };

  const downloadSvg = () => {
    const text = serializedSvg();
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode-${format.toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SVG downloaded");
  };

  const downloadPng = () => {
    const svg = svgRef.current;
    const text = serializedSvg();
    if (!svg || !text) return;
    const w = parseFloat(svg.getAttribute("width") || "0") || 300;
    const h = parseFloat(svg.getAttribute("height") || "0") || 150;
    const scale = 3;
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("PNG export failed");
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `barcode-${format.toLowerCase()}.png`;
      a.click();
      toast.success("PNG downloaded");
    };
    img.onerror = () => {
      toast.error("PNG export failed");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const copySvg = () => {
    const text = serializedSvg();
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("SVG markup copied"))
      .catch(() => toast.error("Copy failed"));
  };

  const activeFormat = FORMATS.find((f) => f.id === format);

  return (
    <ToolPageShell toolId="barcode-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Barcode Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <span className="mb-2 block text-[13px] font-medium text-foreground/80">Format</span>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => changeFormat(f.id)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                    format === f.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{activeFormat?.hint}</p>
          </div>

          <div>
            <label htmlFor="barcode-data" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Data to encode
            </label>
            <input
              id="barcode-data"
              type="text"
              value={data}
              onChange={(e) => setData(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="barcode-width" className="mb-2 block text-[13px] font-medium text-foreground/80">
                Bar width ({barWidth})
              </label>
              <input
                id="barcode-width"
                type="range"
                min={1}
                max={4}
                step={1}
                value={barWidth}
                onChange={(e) => setBarWidth(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label htmlFor="barcode-height" className="mb-2 block text-[13px] font-medium text-foreground/80">
                Height ({height}px)
              </label>
              <input
                id="barcode-height"
                type="range"
                min={40}
                max={200}
                step={5}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label htmlFor="barcode-fontsize" className="mb-2 block text-[13px] font-medium text-foreground/80">
                Text size ({fontSize}px)
              </label>
              <input
                id="barcode-fontsize"
                type="range"
                min={8}
                max={40}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label htmlFor="barcode-textmargin" className="mb-2 block text-[13px] font-medium text-foreground/80">
                Text margin ({textMargin})
              </label>
              <input
                id="barcode-textmargin"
                type="range"
                min={0}
                max={20}
                step={1}
                value={textMargin}
                onChange={(e) => setTextMargin(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <span>Background</span>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-0.5"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <span>Bars</span>
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-0.5"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground/80">
              <input
                type="checkbox"
                checked={showText}
                onChange={(e) => setShowText(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Show text
            </label>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <RefreshCw className="h-4 w-4" /> Generate barcode
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your browser, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex min-h-[320px] items-center justify-center overflow-x-auto rounded-xl bg-muted/40 p-6">
            <svg ref={svgRef} role="img" aria-label={`${activeFormat?.label} barcode`} />
          </div>
          {!payload && (
            <div className="mt-4 flex flex-col items-center text-center">
              <Barcode className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                Enter data to preview the barcode
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadSvg}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              <Download className="h-4 w-4" /> SVG
            </button>
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
            >
              <Download className="h-4 w-4" /> PNG (3x)
            </button>
            <button
              type="button"
              onClick={copySvg}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
            >
              <Copy className="h-4 w-4" /> Copy SVG
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
