// /tools/exam-portal-presets - Make both the photo and the signature files for
// an Indian exam portal in one click (IBPS, SBI, SSC, UPSC, NEET, JEE). 100%
// in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, GraduationCap, Image as ImageIcon, PenLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import {
  loadImageFile,
  drawCover,
  drawContain,
  formatBytes,
  encodeToSize,
} from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/exam-portal-presets")({
  head: () => {
    const seo = getToolSeoMeta("exam-portal-presets");
    const canonical = "https://iconvault.site/tools/exam-portal-presets";
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
  component: PresetsTool,
});

interface SizeRule {
  w: number;
  h: number;
  min: number;
  max: number;
}

interface ExamRule {
  id: string;
  label: string;
  photo: SizeRule;
  sign: SizeRule;
}

const EXAMS: ExamRule[] = [
  { id: "ibps", label: "IBPS", photo: { w: 200, h: 230, min: 20, max: 50 }, sign: { w: 140, h: 60, min: 10, max: 20 } },
  { id: "sbi", label: "SBI", photo: { w: 200, h: 230, min: 20, max: 50 }, sign: { w: 140, h: 60, min: 10, max: 20 } },
  { id: "ssc", label: "SSC", photo: { w: 276, h: 354, min: 20, max: 50 }, sign: { w: 315, h: 157, min: 10, max: 20 } },
  { id: "upsc", label: "UPSC", photo: { w: 420, h: 540, min: 20, max: 300 }, sign: { w: 700, h: 350, min: 20, max: 300 } },
  { id: "neet", label: "NEET UG", photo: { w: 276, h: 354, min: 10, max: 200 }, sign: { w: 350, h: 150, min: 4, max: 30 } },
  { id: "jee", label: "JEE Main", photo: { w: 276, h: 354, min: 10, max: 200 }, sign: { w: 350, h: 150, min: 4, max: 30 } },
  { id: "custom", label: "Custom", photo: { w: 200, h: 230, min: 20, max: 50 }, sign: { w: 140, h: 60, min: 10, max: 20 } },
];

function whiten(src: HTMLCanvasElement, threshold: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, out.width, out.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;
    const lum = (r + g + b) / 3;
    if (lum > threshold) {
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
    }
    px[i + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return out;
}

function trimWhite(src: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = src.getContext("2d")!;
  const d = ctx.getImageData(0, 0, src.width, src.height);
  const px = d.data;
  let minX = src.width, minY = src.height, maxX = -1, maxY = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      const r = px[i]!;
      const g = px[i + 1]!;
      const b = px[i + 2]!;
      if (r < 245 || g < 245 || b < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const crop = document.createElement("canvas");
  crop.width = bw;
  crop.height = bh;
  crop.getContext("2d")!.drawImage(src, minX, minY, bw, bh, 0, 0, bw, bh);
  return crop;
}

const selectCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const numCls =
  "w-24 rounded-lg border border-border bg-background px-2 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

interface Slot {
  img: HTMLImageElement | null;
  name: string;
  url: string;
}

interface MadeFile {
  url: string;
  w: number;
  h: number;
  size: number;
  label: string;
}

function RuleRow({ title, rule }: { title: string; rule: SizeRule }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground">{rule.w} x {rule.h} px, {rule.min} to {rule.max} KB</span>
    </div>
  );
}

function PresetsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("exam-portal-presets", isPro);
  const seo = getToolSeo("exam-portal-presets");

  const [photo, setPhoto] = useState<Slot>({ img: null, name: "", url: "" });
  const [sign, setSign] = useState<Slot>({ img: null, name: "", url: "" });
  const [examId, setExamId] = useState("ibps");
  const [cleanBg, setCleanBg] = useState(true);
  const [photoRule, setPhotoRule] = useState<SizeRule>(EXAMS[0]!.photo);
  const [signRule, setSignRule] = useState<SizeRule>(EXAMS[0]!.sign);
  const [busy, setBusy] = useState(false);
  const [dragSlot, setDragSlot] = useState<"photo" | "sign" | null>(null);
  const [files, setFiles] = useState<MadeFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File, slot: "photo" | "sign") => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      const next: Slot = { img: loaded, name: f.name, url: URL.createObjectURL(f) };
      if (slot === "photo") setPhoto(next);
      else setSign(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const onPaste = (e: React.ClipboardEvent, slot: "photo" | "sign") => {
    const f = e.clipboardData?.files?.[0];
    if (f && f.type.startsWith("image/")) {
      e.preventDefault();
      void acceptFile(f, slot);
      toast.success("Image pasted");
    }
  };

  const pickExam = (id: string) => {
    setExamId(id);
    const rule = EXAMS.find((x) => x.id === id)!;
    setPhotoRule({ ...rule.photo });
    setSignRule({ ...rule.sign });
  };

  const isCustom = examId === "custom";

  const makeFiles = useCallback(async () => {
    if (!photo.img || !sign.img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      // Photo: center-crop to the portal size.
      const pRule = photoRule;
      const { blob: pBlob, width: pw, height: ph } = await encodeToSize(
        (canvas) => {
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          drawCover(ctx, photo.img!, photo.img!.naturalWidth, photo.img!.naturalHeight, 0, 0, canvas.width, canvas.height);
        },
        "image/jpeg",
        pRule.max * 1024,
        pRule.w,
        pRule.h,
      );
      const pMin = pRule.min * 1024;
      if (pMin > 0 && pBlob.size < pMin) {
        toast.warning(`Heads up: the photo is only ${formatBytes(pBlob.size)}, below your ${pRule.min} KB minimum. Downloading it anyway.`);
      }

      // Signature: whiten, trim, center on a white canvas at the portal size.
      let signCanvas = document.createElement("canvas");
      signCanvas.width = sign.img!.naturalWidth;
      signCanvas.height = sign.img!.naturalHeight;
      signCanvas.getContext("2d")!.drawImage(sign.img!, 0, 0);
      if (cleanBg) signCanvas = whiten(signCanvas, 120);
      const trimmed = trimWhite(signCanvas);
      const sRule = signRule;
      const { blob: sBlob, width: sw, height: sh } = await encodeToSize(
        (canvas) => {
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const pad = canvas.width * 0.03;
          if (trimmed) {
            drawContain(ctx, trimmed, trimmed.width, trimmed.height, pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
          }
        },
        "image/jpeg",
        sRule.max * 1024,
        sRule.w,
        sRule.h,
      );
      const sMin = sRule.min * 1024;
      if (sMin > 0 && sBlob.size < sMin) {
        toast.warning(`Heads up: the signature is only ${formatBytes(sBlob.size)}, below your ${sRule.min} KB minimum. Downloading it anyway.`);
      }

      downloadBlob(pBlob, `${examId}-photo.jpg`);
      downloadBlob(sBlob, `${examId}-signature.jpg`);
      setFiles([
        { url: URL.createObjectURL(pBlob), w: pw, h: ph, size: pBlob.size, label: "Photo" },
        { url: URL.createObjectURL(sBlob), w: sw, h: sh, size: sBlob.size, label: "Signature" },
      ]);
      trial.recordUse();
      toast.success("Both files downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the files.");
    } finally {
      setBusy(false);
    }
  }, [photo.img, sign.img, busy, trial, photoRule, signRule, cleanBg, examId]);

  const dropCls = (slot: "photo" | "sign") =>
    cn(
      "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition",
      dragSlot === slot ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
    );

  const updateRule = (
    set: (r: SizeRule) => void,
    cur: SizeRule,
    key: keyof SizeRule,
    v: number,
  ) => set({ ...cur, [key]: Math.max(0, Math.round(v)) });

  return (
    <ToolPageShell toolId="exam-portal-presets" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Exam Portal Presets" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragSlot("photo"); }}
            onDragLeave={() => setDragSlot(null)}
            onDrop={(e) => { e.preventDefault(); setDragSlot(null); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f, "photo"); }}
            onPaste={(e) => onPaste(e, "photo")}
            onClick={() => photoRef.current?.click()}
            className={dropCls("photo")}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{photo.name || "Add photo"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drop, click, or paste from clipboard</p>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f, "photo"); }} />
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragSlot("sign"); }}
            onDragLeave={() => setDragSlot(null)}
            onDrop={(e) => { e.preventDefault(); setDragSlot(null); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f, "sign"); }}
            onPaste={(e) => onPaste(e, "sign")}
            onClick={() => signRef.current?.click()}
            className={dropCls("sign")}
          >
            <PenLine className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{sign.name || "Add signature"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drop, click, or paste from clipboard</p>
            <input ref={signRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f, "sign"); }} />
          </div>

          <div>
            <label className={labelCls}>Exam</label>
            <select value={examId} onChange={(e) => pickExam(e.target.value)} className={selectCls}>
              {EXAMS.map((x) => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={cleanBg} onChange={(e) => setCleanBg(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-sm font-medium">Clean signature background <span className="text-muted-foreground">(whiten paper)</span></span>
          </label>

          {!isCustom ? (
            <div className="space-y-2">
              <RuleRow title="Photo" rule={photoRule} />
              <RuleRow title="Signature" rule={signRule} />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className={labelCls}>Photo</p>
                <div className="flex flex-wrap gap-2">
                  <input type="number" min={10} value={photoRule.w} onChange={(e) => updateRule(setPhotoRule, photoRule, "w", Number(e.target.value) || 10)} className={numCls} aria-label="Photo width" />
                  <input type="number" min={10} value={photoRule.h} onChange={(e) => updateRule(setPhotoRule, photoRule, "h", Number(e.target.value) || 10)} className={numCls} aria-label="Photo height" />
                  <input type="number" min={0} value={photoRule.min} onChange={(e) => updateRule(setPhotoRule, photoRule, "min", Number(e.target.value) || 0)} className={numCls} aria-label="Photo min KB" />
                  <input type="number" min={1} value={photoRule.max} onChange={(e) => updateRule(setPhotoRule, photoRule, "max", Number(e.target.value) || 1)} className={numCls} aria-label="Photo max KB" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Width, height (px), min KB, max KB</p>
              </div>
              <div>
                <p className={labelCls}>Signature</p>
                <div className="flex flex-wrap gap-2">
                  <input type="number" min={10} value={signRule.w} onChange={(e) => updateRule(setSignRule, signRule, "w", Number(e.target.value) || 10)} className={numCls} aria-label="Signature width" />
                  <input type="number" min={10} value={signRule.h} onChange={(e) => updateRule(setSignRule, signRule, "h", Number(e.target.value) || 10)} className={numCls} aria-label="Signature height" />
                  <input type="number" min={0} value={signRule.min} onChange={(e) => updateRule(setSignRule, signRule, "min", Number(e.target.value) || 0)} className={numCls} aria-label="Signature min KB" />
                  <input type="number" min={1} value={signRule.max} onChange={(e) => updateRule(setSignRule, signRule, "max", Number(e.target.value) || 1)} className={numCls} aria-label="Signature max KB" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Width, height (px), min KB, max KB</p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            These are the commonly published rules. Always check your exam notification: portals change them.
          </p>

          <ActionButton busy={busy} disabled={!photo.img || !sign.img || !trial.canUse} onClick={makeFiles}>
            <GraduationCap className="h-4 w-4" /> {busy ? "Making…" : "Make files"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Files never leave your device: everything runs in your browser.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {files.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your two files appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                One click makes both the photo and the signature at {EXAMS.find((x) => x.id === examId)!.label} sizes.
              </p>
              <div className="mt-6 flex items-center gap-4">
                {photo.url && <img src={photo.url} alt="Photo" className="max-h-40 rounded border border-border" />}
                {sign.url && <img src={sign.url} alt="Signature" className="max-h-24 rounded border border-border bg-white" />}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-wrap items-center justify-center gap-8">
              {files.map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-3">
                  <img src={f.url} alt={f.label} className="max-h-72 rounded border border-border bg-white" />
                  <p className="text-sm font-medium text-muted-foreground">
                    <Download className="mr-1 inline h-4 w-4" /> {f.label}: {f.w} x {f.h} px, {formatBytes(f.size)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
