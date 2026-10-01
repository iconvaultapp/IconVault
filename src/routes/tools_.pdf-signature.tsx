// /tools/pdf-signature - Draw a signature and place it on any page of a PDF,
// or add a typed text annotation. 100% in your browser. Honest note: this is
// an electronic signature for informal use, not a certified digital signature.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, PenLine, Eraser, Undo2, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/tools_/pdf-signature")({
  head: () => {
    const seo = getToolSeoMeta("pdf-signature");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PdfSignatureTool,
});

type LoadedPdf = { name: string; bytes: Uint8Array; pages: number; width: number; height: number };

function PdfSignatureTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pdf-signature", isPro);
  const seo = getToolSeo("pdf-signature");

  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [page, setPage] = useState("1");
  const [posX, setPosX] = useState([80]);
  const [posY, setPosY] = useState([80]);
  const [scale, setScale] = useState([1]);
  const [typed, setTyped] = useState("");
  const [typedSize, setTypedSize] = useState("24");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [placed, setPlaced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);

  const acceptFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) {
      setError("Please choose a PDF file.");
      return;
    }
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = new Uint8Array(await f.arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      const first = doc.getPage(0).getSize();
      setPdf({ name: f.name, bytes, pages: doc.getPageCount(), width: first.width, height: first.height });
      setPage("1");
      setPlaced(false);
      toast.success("PDF loaded");
    } catch {
      setError("Could not read that PDF. Encrypted PDFs are not supported.");
    }
  }, []);

  // --- Signature canvas ---
  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    history.current = [];
    setHasInk(false);
  }, []);

  const undoStroke = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx || history.current.length === 0) return;
    history.current.pop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const prev = history.current[history.current.length - 1];
    if (prev) ctx.putImageData(prev, 0, 0);
    else setHasInk(false);
  }, []);

  const posFromEvent = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const ctx = getCtx();
    if (!ctx) return;
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const canvas = canvasRef.current!;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 30) history.current.shift();
    last.current = posFromEvent(e);
    setHasInk(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    const p = posFromEvent(e);
    if (ctx && last.current) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  };

  const onPointerUp = () => {
    drawing.current = false;
    last.current = null;
  };

  // --- Position preview geometry (page shown at fixed 220px height) ---
  const PREVIEW_H = 220;
  const previewW = pdf ? (pdf.width / pdf.height) * PREVIEW_H : 160;
  const sigBaseW = pdf ? Math.min(pdf.width * 0.45, 260) : 200;
  const sigW = sigBaseW * (scale[0] ?? 1);
  const sigH = sigW * (140 / 560); // canvas aspect
  const sigLeftPct = pdf ? ((posX[0] ?? 0) / pdf.width) * 100 : 0;
  const sigBottomPct = pdf ? ((posY[0] ?? 0) / pdf.height) * 100 : 0;

  const place = useCallback(async () => {
    if (!pdf || busy || !trial.canUse) return;
    const pageNum = Math.min(Math.max(parseInt(page, 10) || 1, 1), pdf.pages);
    const canvas = canvasRef.current;
    const useDrawn = hasInk && canvas;
    if (!useDrawn && !typed.trim()) {
      setError("Draw a signature or type a name first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdf.bytes);
      const pg = doc.getPage(pageNum - 1);
      const { width: pw, height: ph } = pg.getSize();
      const x = Math.min(Math.max(posX[0] ?? 0, 0), pw - 20);
      const y = Math.min(Math.max(posY[0] ?? 0, 0), ph - 20);
      if (useDrawn && canvas) {
        const png = await doc.embedPng(canvas.toDataURL("image/png"));
        const w = sigBaseW * (scale[0] ?? 1);
        const h = w * (canvas.height / canvas.width);
        pg.drawImage(png, { x, y, width: w, height: h });
      }
      if (typed.trim()) {
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const size = Math.max(8, parseInt(typedSize, 10) || 24);
        pg.drawText(typed.trim(), { x, y: y + (useDrawn && canvas ? sigW * (canvas.height / canvas.width) + 8 : 0), size, font, color: rgb(0.1, 0.1, 0.1) });
      }
      const out = await doc.save();
      downloadBlob(new Blob([out as unknown as BlobPart], { type: "application/pdf" }), pdf.name.replace(/\.pdf$/i, "") + "-signed.pdf");
      setPlaced(true);
      trial.recordUse();
      toast.success("Signed PDF downloaded");
    } catch {
      setError("Signing failed.");
    } finally {
      setBusy(false);
    }
  }, [pdf, page, busy, trial, hasInk, typed, typedSize, posX, posY, scale, sigBaseW, sigW]);

  useEffect(() => () => { setPlaced(false); }, [posX, posY, scale, page]);

  return (
    <ToolPageShell toolId="pdf-signature" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="PDF Signature" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-muted-foreground">
          This adds an <span className="font-semibold text-foreground">electronic signature for informal use</span> (a drawn image or typed name on the page). It is not a certified digital signature and carries no cryptographic proof of identity.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{pdf?.name || "Drop a PDF"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Runs in your browser, nothing is uploaded</p>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          {pdf && (
            <>
              <div className="space-y-2">
                <Label>Page (1 to {pdf.pages})</Label>
                <Select value={page} onValueChange={setPage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {Array.from({ length: pdf.pages }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>Page {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Position X: {Math.round(posX[0] ?? 0)} pt</Label>
                <Slider value={posX} onValueChange={setPosX} min={0} max={Math.round(pdf.width)} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Position Y (from bottom): {Math.round(posY[0] ?? 0)} pt</Label>
                <Slider value={posY} onValueChange={setPosY} min={0} max={Math.round(pdf.height)} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Signature size: {Math.round((scale[0] ?? 1) * 100)}%</Label>
                <Slider value={scale} onValueChange={setScale} min={0.3} max={2} step={0.05} />
              </div>
              <ActionButton busy={busy} disabled={!trial.canUse} onClick={place}>
                <Download className="h-4 w-4" /> {busy ? "Placing…" : "Place signature and download"}
              </ActionButton>
              {placed && <p className="text-xs text-emerald-600">Signature placed. Adjust and download again if needed.</p>}
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free signatures left.
                </p>
              )}
            </>
          )}
          {error && (
            <p className="flex items-start gap-2 text-sm font-medium text-red-500">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Tabs defaultValue="draw">
              <TabsList className="mb-4">
                <TabsTrigger value="draw">Draw signature</TabsTrigger>
                <TabsTrigger value="type">Type name</TabsTrigger>
              </TabsList>
              <TabsContent value="draw" className="space-y-3">
                <div className="rounded-xl border border-border bg-white">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={140}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                    className="h-32 w-full cursor-crosshair touch-none rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={undoStroke} disabled={!hasInk} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40">
                    <Undo2 className="h-4 w-4" /> Undo
                  </button>
                  <button type="button" onClick={clearCanvas} disabled={!hasInk} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40">
                    <Eraser className="h-4 w-4" /> Clear
                  </button>
                </div>
              </TabsContent>
              <TabsContent value="type" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <div className="space-y-2">
                    <Label>Full name</Label>
                    <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Jane Cooper" />
                  </div>
                  <div className="space-y-2">
                    <Label>Font size (pt)</Label>
                    <Input value={typedSize} onChange={(e) => setTypedSize(e.target.value)} inputMode="numeric" />
                  </div>
                </div>
                {typed && <p className="font-serif text-3xl italic">{typed}</p>}
                <p className="text-xs text-muted-foreground">The typed name is placed as plain text under (or instead of) your drawn signature.</p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <PenLine className="h-4 w-4 text-primary" /> Placement preview
            </h2>
            {!pdf ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Load a PDF to preview where your signature will land.</p>
            ) : (
              <div className="flex justify-center">
                <div className="relative rounded-lg border border-border bg-white shadow-sm" style={{ width: previewW, height: PREVIEW_H }}>
                  <span className="absolute left-2 top-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Page {page}</span>
                  <div
                    className="absolute rounded border-2 border-dashed border-primary bg-primary/10"
                    style={{
                      left: `${sigLeftPct}%`,
                      bottom: `${sigBottomPct}%`,
                      width: `${(sigW / pdf.width) * 100}%`,
                      height: `${(sigH / pdf.height) * 100}%`,
                      minHeight: 12,
                    }}
                  >
                    <span className="absolute -top-5 left-0 whitespace-nowrap font-mono text-[10px] text-primary">signature</span>
                  </div>
                </div>
              </div>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">Preview is proportional to the real page. Coordinates are in PDF points, measured from the bottom-left corner.</p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
