// /tools/pdf-toolkit - Merge, split, rotate, watermark and reorder PDF pages,
// 100% in your browser. No upload, no server.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, FileText, ArrowUp, ArrowDown, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/tools_/pdf-toolkit")({
  head: () => {
    const seo = getToolSeoMeta("pdf-toolkit");
    const canonical = "https://iconvault.site/tools/pdf-toolkit";
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
  component: PdfToolkitTool,
});

type PdfFile = { id: number; name: string; bytes: Uint8Array; pages: number };

let nextId = 1;

/** Parse "1-3, 5" into a sorted list of 1-based page numbers, clamped to total. */
function parseRanges(input: string, total: number): number[] {
  const pages = new Set<number>();
  for (const part of input.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const m = t.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Math.max(1, parseInt(m[1] ?? "", 10));
      const b = Math.min(total, parseInt(m[2] ?? "", 10));
      for (let p = a; p <= b; p++) pages.add(p);
    } else if (/^\d+$/.test(t)) {
      const p = parseInt(t, 10);
      if (p >= 1 && p <= total) pages.add(p);
    } else {
      throw new Error(`Could not understand "${t}". Use page numbers like 1-3, 5.`);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

function PdfToolkitTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pdf-toolkit", isPro);
  const seo = getToolSeo("pdf-toolkit");

  const [files, setFiles] = useState<PdfFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Split / rotate / watermark / reorder state
  const [activeId, setActiveId] = useState<number | null>(null);
  const [splitInput, setSplitInput] = useState("1-3");
  const [rotatePages, setRotatePages] = useState("all");
  const [rotateAngle, setRotateAngle] = useState("90");
  const [wmText, setWmText] = useState("DRAFT");
  const [wmOpacity, setWmOpacity] = useState([0.25]);
  const [wmSize, setWmSize] = useState("72");
  const [wmPos, setWmPos] = useState("diagonal");
  const [order, setOrder] = useState<number[]>([]);

  const active = files.find((f) => f.id === activeId) ?? null;

  const acceptFiles = useCallback(async (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (arr.length === 0) {
      setError("Please choose PDF files.");
      return;
    }
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const loaded: PdfFile[] = [];
      for (const f of arr) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const doc = await PDFDocument.load(bytes);
        loaded.push({ id: nextId++, name: f.name, bytes, pages: doc.getPageCount() });
      }
      setFiles((p) => {
        const next = [...p, ...loaded];
        const first = next[0];
        if (activeId === null && first) setActiveId(first.id);
        return next;
      });
      toast.success(`${loaded.length} PDF${loaded.length === 1 ? "" : "s"} loaded`);
    } catch {
      setError("One of those files could not be read. Encrypted PDFs are not supported.");
    }
  }, [activeId]);

  const moveFile = (id: number, dir: -1 | 1) => {
    setFiles((p) => {
      const i = p.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.length) return p;
      const next = [...p];
      const a = next[i];
      const b = next[j];
      if (a === undefined || b === undefined) return p;
      next[i] = a;
      next[j] = b;
      return next;
    });
  };

  const downloadResult = useCallback(async (bytes: Uint8Array, name: string) => {
    const part = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    downloadBlob(new Blob([part], { type: "application/pdf" }), name);
    trial.recordUse();
    toast.success("PDF downloaded");
  }, [trial]);

  const doMerge = useCallback(async () => {
    if (files.length < 2 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await PDFDocument.load(f.bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      await downloadResult(await out.save(), "merged.pdf");
    } catch {
      setError("Merging failed. One of the PDFs may be encrypted.");
    } finally {
      setBusy(false);
    }
  }, [files, busy, trial, downloadResult]);

  const doSplit = useCallback(async () => {
    if (!active || busy || !trial.canUse) return;
    let ranges: number[];
    try {
      ranges = parseRanges(splitInput, active.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bad page range.");
      return;
    }
    if (ranges.length === 0) {
      setError("No pages selected. Example: 1-3, 5");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(active.bytes);
      // Group consecutive pages into one file per range.
      const groups: number[][] = [];
      for (const p of ranges) {
        const last = groups[groups.length - 1];
        const prev = last?.[last.length - 1];
        if (last && prev !== undefined && p === prev + 1) last.push(p);
        else groups.push([p]);
      }
      for (const [i, group] of groups.entries()) {
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, group.map((p) => p - 1));
        pages.forEach((p) => out.addPage(p));
        await downloadResult(await out.save(), `${active.name.replace(/\.pdf$/i, "")}-part${i + 1}.pdf`);
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch {
      setError("Splitting failed.");
    } finally {
      setBusy(false);
    }
  }, [active, splitInput, busy, trial, downloadResult]);

  const doRotate = useCallback(async () => {
    if (!active || busy || !trial.canUse) return;
    let targets: number[];
    try {
      targets = rotatePages.trim().toLowerCase() === "all" || rotatePages.trim() === ""
        ? Array.from({ length: active.pages }, (_, i) => i + 1)
        : parseRanges(rotatePages, active.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bad page selection.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const doc = await PDFDocument.load(active.bytes);
      const delta = parseInt(rotateAngle, 10);
      for (const p of targets) {
        const page = doc.getPage(p - 1);
        page.setRotation(degrees((page.getRotation().angle + delta) % 360));
      }
      await downloadResult(await doc.save(), active.name.replace(/\.pdf$/i, "") + "-rotated.pdf");
    } catch {
      setError("Rotation failed.");
    } finally {
      setBusy(false);
    }
  }, [active, rotatePages, rotateAngle, busy, trial, downloadResult]);

  const doWatermark = useCallback(async () => {
    if (!active || busy || !trial.canUse || !wmText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
      const doc = await PDFDocument.load(active.bytes);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const size = Math.max(12, parseInt(wmSize, 10) || 72);
      for (const page of doc.getPages()) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(wmText, size);
        let x = (width - textWidth) / 2;
        let y = (height - size) / 2;
        let rotation = degrees(0);
        if (wmPos === "diagonal") rotation = degrees(45);
        else if (wmPos === "top-left") { x = 40; y = height - 60; }
        else if (wmPos === "top-right") { x = width - textWidth - 40; y = height - 60; }
        else if (wmPos === "bottom-left") { x = 40; y = 60; }
        else if (wmPos === "bottom-right") { x = width - textWidth - 40; y = 60; }
        page.drawText(wmText, { x, y, size, font, color: rgb(0.5, 0.5, 0.5), opacity: wmOpacity[0] ?? 0.25, rotate: rotation });
      }
      await downloadResult(await doc.save(), active.name.replace(/\.pdf$/i, "") + "-watermarked.pdf");
    } catch {
      setError("Watermark failed.");
    } finally {
      setBusy(false);
    }
  }, [active, wmText, wmOpacity, wmSize, wmPos, busy, trial, downloadResult]);

  const initOrder = useCallback(() => {
    if (active) setOrder(Array.from({ length: active.pages }, (_, i) => i + 1));
  }, [active]);

  const movePage = (page: number, dir: -1 | 1) => {
    setOrder((o) => {
      const i = o.indexOf(page);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const next = [...o];
      const a = next[i];
      const b = next[j];
      if (a === undefined || b === undefined) return o;
      next[i] = a;
      next[j] = b;
      return next;
    });
  };

  const doReorder = useCallback(async () => {
    if (!active || busy || !trial.canUse || order.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(active.bytes);
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, order.map((p) => p - 1));
      pages.forEach((p) => out.addPage(p));
      await downloadResult(await out.save(), active.name.replace(/\.pdf$/i, "") + "-reordered.pdf");
    } catch {
      setError("Reorder failed.");
    } finally {
      setBusy(false);
    }
  }, [active, order, busy, trial, downloadResult]);

  return (
    <ToolPageShell toolId="pdf-toolkit" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="PDF Toolkit" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void acceptFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">Drop PDFs here</p>
            <p className="mt-1 text-xs text-muted-foreground">Runs in your browser, nothing is uploaded</p>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => { if (e.target.files) void acceptFiles(e.target.files); }} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[13px]">Loaded PDFs</Label>
              {files.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setActiveId(f.id); setOrder([]); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                    activeId === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{f.pages}p</span>
                  <span
                    role="button"
                    tabIndex={0}
                    title="Remove"
                    onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((x) => x.id !== f.id)); if (activeId === f.id) setActiveId(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setFiles((p) => p.filter((x) => x.id !== f.id)); } }}
                    className="rounded p-1 text-muted-foreground hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 text-sm font-medium text-red-500">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free operations left.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <Tabs defaultValue="merge">
            <TabsList className="mb-5 flex flex-wrap">
              <TabsTrigger value="merge">Merge</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
              <TabsTrigger value="rotate">Rotate</TabsTrigger>
              <TabsTrigger value="watermark">Watermark</TabsTrigger>
              <TabsTrigger value="reorder">Reorder</TabsTrigger>
            </TabsList>

            <TabsContent value="merge" className="space-y-4">
              <p className="text-sm text-muted-foreground">Combine PDFs in the order below. Use the arrows to reorder.</p>
              {files.map((f, i) => (
                <div key={f.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                  <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.pages} pages</span>
                  <button type="button" onClick={() => moveFile(f.id, -1)} className="rounded p-1 hover:bg-muted" title="Move up"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => moveFile(f.id, 1)} className="rounded p-1 hover:bg-muted" title="Move down"><ArrowDown className="h-4 w-4" /></button>
                </div>
              ))}
              <ActionButton busy={busy} disabled={files.length < 2 || !trial.canUse} onClick={doMerge}>
                <Download className="h-4 w-4" /> {busy ? "Merging…" : "Merge and download"}
              </ActionButton>
              {files.length < 2 && <p className="text-xs text-muted-foreground">Load at least 2 PDFs to merge.</p>}
            </TabsContent>

            <TabsContent value="split" className="space-y-4">
              {!active ? (
                <p className="text-sm text-muted-foreground">Load a PDF first, then select it on the left.</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{active.name}</span> has {active.pages} pages. Each consecutive range becomes its own downloaded file.
                  </p>
                  <div className="max-w-xs space-y-2">
                    <Label>Page ranges</Label>
                    <Input value={splitInput} onChange={(e) => setSplitInput(e.target.value)} placeholder="1-3, 5" />
                    <p className="text-xs text-muted-foreground">Example: 1-3, 5 keeps pages 1, 2, 3 in one file and page 5 in another.</p>
                  </div>
                  <ActionButton busy={busy} disabled={!trial.canUse} onClick={doSplit}>
                    <Download className="h-4 w-4" /> {busy ? "Splitting…" : "Split and download"}
                  </ActionButton>
                </>
              )}
            </TabsContent>

            <TabsContent value="rotate" className="space-y-4">
              {!active ? (
                <p className="text-sm text-muted-foreground">Load a PDF first, then select it on the left.</p>
              ) : (
                <>
                  <div className="grid max-w-md gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Pages (all or like 1-3, 5)</Label>
                      <Input value={rotatePages} onChange={(e) => setRotatePages(e.target.value)} placeholder="all" />
                    </div>
                    <div className="space-y-2">
                      <Label>Angle</Label>
                      <Select value={rotateAngle} onValueChange={setRotateAngle}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="90">90 degrees</SelectItem>
                          <SelectItem value="180">180 degrees</SelectItem>
                          <SelectItem value="270">270 degrees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ActionButton busy={busy} disabled={!trial.canUse} onClick={doRotate}>
                    <Download className="h-4 w-4" /> {busy ? "Rotating…" : "Rotate and download"}
                  </ActionButton>
                </>
              )}
            </TabsContent>

            <TabsContent value="watermark" className="space-y-4">
              {!active ? (
                <p className="text-sm text-muted-foreground">Load a PDF first, then select it on the left.</p>
              ) : (
                <>
                  <div className="grid max-w-lg gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Watermark text</Label>
                      <Input value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder="DRAFT" />
                    </div>
                    <div className="space-y-2">
                      <Label>Font size (pt)</Label>
                      <Input value={wmSize} onChange={(e) => setWmSize(e.target.value)} inputMode="numeric" />
                    </div>
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select value={wmPos} onValueChange={setWmPos}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diagonal">Diagonal across page</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="top-left">Top left</SelectItem>
                          <SelectItem value="top-right">Top right</SelectItem>
                          <SelectItem value="bottom-left">Bottom left</SelectItem>
                          <SelectItem value="bottom-right">Bottom right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Opacity: {Math.round((wmOpacity[0] ?? 0.25) * 100)}%</Label>
                      <Slider value={wmOpacity} onValueChange={setWmOpacity} min={0.05} max={1} step={0.05} />
                    </div>
                  </div>
                  <ActionButton busy={busy} disabled={!trial.canUse || !wmText.trim()} onClick={doWatermark}>
                    <Download className="h-4 w-4" /> {busy ? "Applying…" : "Add watermark and download"}
                  </ActionButton>
                </>
              )}
            </TabsContent>

            <TabsContent value="reorder" className="space-y-4">
              {!active ? (
                <p className="text-sm text-muted-foreground">Load a PDF first, then select it on the left.</p>
              ) : order.length === 0 ? (
                <ActionButton busy={false} disabled={!trial.canUse} onClick={initOrder}>
                  Load {active.pages} pages to reorder
                </ActionButton>
              ) : (
                <>
                  <div className="grid max-w-md gap-1.5">
                    {order.map((p, i) => (
                      <div key={p} className="flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm">
                        <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                        <span className="flex-1">Page {p}</span>
                        <button type="button" onClick={() => movePage(p, -1)} className="rounded p-1 hover:bg-muted" title="Move up"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => movePage(p, 1)} className="rounded p-1 hover:bg-muted" title="Move down"><ArrowDown className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                  <ActionButton busy={busy} disabled={!trial.canUse} onClick={doReorder}>
                    <Download className="h-4 w-4" /> {busy ? "Reordering…" : "Download reordered PDF"}
                  </ActionButton>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ToolPageShell>
  );
}
