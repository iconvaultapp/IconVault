// /tools/qr-code-scanner - Scan QR codes from an uploaded/pasted image or your camera.
// Native BarcodeDetector first, jsQR fallback. 100% in-browser. No upload, no watermark.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Copy, ExternalLink, FileUp, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import { loadImageFile } from "@/lib/image-tools";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/qr-code-scanner")({
  head: () => {
    const seo = getToolSeoMeta("qr-code-scanner");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: QrScannerTool,
});

function looksLikeUrl(text: string): boolean {
  const t = text.trim();
  return /^(https?:\/\/|www\.)/i.test(t) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t);
}

/** Try native BarcodeDetector, then fall back to jsQR. Returns the decoded text or null. */
async function detectQr(imageData: ImageData, source: CanvasImageSource): Promise<string | null> {
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      const codes = await detector.detect(source);
      const firstCode = codes[0];
      if (firstCode && firstCode.rawValue) return firstCode.rawValue;
    } catch {
      // Fall through to jsQR.
    }
  }
  const jsQR = (await import("jsqr")).default;
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data ?? null;
}

function QrScannerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("qr-code-scanner", isPro);
  const seo = getToolSeo("qr-code-scanner");

  const [decoded, setDecoded] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const scanImageElement = useCallback(async (img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const text = await detectQr(imageData, canvas);
    return text;
  }, []);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setBusy(true);
    setError(null);
    setDecoded(null);
    try {
      const img = await loadImageFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      const text = await scanImageElement(img);
      if (text) {
        setDecoded(text);
        trial.recordUse();
        toast.success("QR code scanned");
      } else {
        setError("No QR code found in that image. Tip: crop closer to the code and try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    } finally {
      setBusy(false);
    }
  }, [scanImageElement, trial]);

  const startCamera = useCallback(async () => {
    setError(null);
    setDecoded(null);
    setPreviewUrl("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support camera access. Upload an image instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setError("Camera access was denied. Allow camera permission in your browser, or upload an image instead.");
    }
  }, []);

  // Attach stream to video and start scanning when the camera view mounts.
  useEffect(() => {
    if (!cameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
    scanTimerRef.current = window.setInterval(async () => {
      const v = videoRef.current;
      const sc = scanCanvasRef.current;
      if (!v || !sc || v.readyState < 2) return;
      sc.width = v.videoWidth;
      sc.height = v.videoHeight;
      const ctx = sc.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(v, 0, 0);
      const imageData = ctx.getImageData(0, 0, sc.width, sc.height);
      try {
        const text = await detectQr(imageData, sc);
        if (text) {
          setDecoded(text);
          trial.recordUse();
          toast.success("QR code scanned");
          stopCamera();
        }
      } catch {
        // Keep scanning.
      }
    }, 600);
    return () => {
      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [cameraOn, stopCamera, trial]);

  const onPaste = (e: React.ClipboardEvent) => {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    const f = item?.getAsFile();
    if (f) void acceptFile(f);
  };

  const copyText = () => {
    if (!decoded) return;
    void navigator.clipboard.writeText(decoded).then(() => toast.success("Copied to clipboard"));
  };

  const openUrl = decoded && looksLikeUrl(decoded)
    ? (decoded.startsWith("http") ? decoded : `https://${decoded}`)
    : null;

  return (
    <ToolPageShell toolId="qr-code-scanner" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="QR Code Scanner" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onPaste={onPaste}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">Drop, click, or paste a QR image</p>
            <p className="mt-1 text-xs text-muted-foreground">Screenshots work too. Files never leave your device.</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <button
            type="button"
            onClick={() => (cameraOn ? stopCamera() : void startCamera())}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              cameraOn ? "border-destructive/50 text-destructive hover:bg-destructive/5" : "border-border hover:border-primary/60",
            )}
          >
            <Camera className="h-4 w-4" /> {cameraOn ? "Stop camera" : "Scan with camera"}
          </button>

          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            Tip: if scanning fails, crop closer to the code and make sure it fills most of the image.
          </div>

          {decoded && (
            <div className="space-y-2">
              <button
                type="button" onClick={copyText}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/60"
              >
                <Copy className="h-4 w-4" /> Copy decoded text
              </button>
              {openUrl && (
                <a
                  href={openUrl} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <ExternalLink className="h-4 w-4" /> Open link
                </a>
              )}
            </div>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free scans left - everything runs in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {cameraOn ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
              <video ref={videoRef} className="max-h-[60vh] w-full max-w-lg rounded-xl" muted playsInline />
              <canvas ref={scanCanvasRef} className="hidden" />
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <ScanLine className="h-4 w-4 animate-pulse text-primary" /> Point your camera at the QR code…
              </p>
            </div>
          ) : decoded ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              {previewUrl && (
                <img src={previewUrl} alt="Scanned QR" className="max-h-48 rounded-xl border border-border" />
              )}
              <div className="w-full max-w-lg rounded-xl bg-muted/50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decoded text</p>
                <p className="break-all text-sm font-medium">{decoded}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ScanLine className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Scan a QR code</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {busy ? "Scanning…" : "Drop an image, paste a screenshot, or use your camera to read the code."}
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
