// /tools/document-pip-playground - Real Document Picture-in-Picture lab:
// open a PiP window with live HTML (stopwatch + synced note), styled and updated live.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PictureInPicture2, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/document-pip-playground")({
  head: () => {
    const seo = getToolSeoMeta("document-pip-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: DocPipTool,
});

type PipWindow = Window & { documentPictureInPicture?: { window?: PipWindow } };

function fmtTime(ms: number): string {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const d = Math.floor((t % 1000) / 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${d}`;
}

function DocPipTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("document-pip-playground", isPro);
  const seo = getToolSeo("document-pip-playground");

  const [supported] = useState(() => typeof window !== "undefined" && "documentPictureInPicture" in window);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("Type here and watch it mirror into the PiP window.");
  const [width, setWidth] = useState(360);
  const [height, setHeight] = useState(240);
  const [dark, setDark] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const pipRef = useRef<PipWindow | null>(null);
  const pipDocRef = useRef<Document | null>(null);
  const timerRef = useRef<number | null>(null);
  const startAtRef = useRef(0);
  const baseRef = useRef(0);
  const noteRef = useRef(note);
  noteRef.current = note;

  const paint = useCallback((doc: Document, ms: number, currentNote: string, isDark: boolean) => {
    const timeEl = doc.getElementById("pip-time");
    if (timeEl) timeEl.textContent = fmtTime(ms);
    const noteEl = doc.getElementById("pip-note");
    if (noteEl && noteEl.textContent !== currentNote) noteEl.textContent = currentNote;
    doc.body.style.background = isDark ? "#0f172a" : "#ffffff";
    doc.body.style.color = isDark ? "#f1f5f9" : "#0f172a";
  }, []);

  const startTimerInPip = useCallback(() => {
    if (timerRef.current) return;
    startAtRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const ms = baseRef.current + (Date.now() - startAtRef.current);
      setElapsed(ms);
      const doc = pipDocRef.current;
      if (doc) paint(doc, ms, noteRef.current, dark);
    }, 100);
  }, [paint, dark]);

  const openPip = useCallback(async () => {
    if (!trial.canUse || busy) return;
    if (!supported) {
      toast.error("Document Picture-in-Picture is not supported in this browser.");
      return;
    }
    setBusy(true);
    try {
      const dPip = (window as unknown as { documentPictureInPicture: { requestWindow: (o: { width: number; height: number }) => Promise<PipWindow> } }).documentPictureInPicture;
      const pipWindow = await dPip.requestWindow({ width, height });
      pipRef.current = pipWindow;
      const doc = pipWindow.document;
      pipDocRef.current = doc;

      const style = doc.createElement("style");
      style.textContent = `
        * { box-sizing: border-box; margin: 0; font-family: system-ui, sans-serif; }
        body { padding: 20px; display: flex; flex-direction: column; gap: 12px; height: 100vh; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.6; }
        #pip-time { font-size: 44px; font-weight: 800; font-variant-numeric: tabular-nums; }
        #pip-note { font-size: 14px; line-height: 1.5; opacity: 0.85; white-space: pre-wrap; }
      `;
      doc.head.appendChild(style);

      const label = doc.createElement("div");
      label.className = "label";
      label.textContent = "IconVault Document PiP";
      const time = doc.createElement("div");
      time.id = "pip-time";
      time.textContent = fmtTime(baseRef.current);
      const noteEl = doc.createElement("div");
      noteEl.id = "pip-note";
      noteEl.textContent = noteRef.current;
      doc.body.append(label, time, noteEl);
      paint(doc, baseRef.current, noteRef.current, dark);

      pipWindow.addEventListener("pagehide", () => {
        pipRef.current = null;
        pipDocRef.current = null;
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setRunning(false);
        setOpen(false);
        toast("PiP window closed");
      });

      setOpen(true);
      trial.recordUse();
      toast.success("PiP window opened");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the PiP window.");
    } finally {
      setBusy(false);
    }
  }, [trial, busy, supported, width, height, paint, dark]);

  const closePip = useCallback(() => {
    pipRef.current?.close();
  }, []);

  useEffect(() => {
    const doc = pipDocRef.current;
    if (doc && open) paint(doc, elapsed, note, dark);
  }, [note, dark, open, elapsed, paint]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      pipRef.current?.close();
    },
    [],
  );

  const toggleTimer = useCallback(() => {
    if (!open) {
      toast.error("Open the PiP window first.");
      return;
    }
    if (running) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      baseRef.current = elapsed;
      setRunning(false);
    } else {
      setRunning(true);
      startTimerInPip();
    }
  }, [open, running, elapsed, startTimerInPip]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    baseRef.current = 0;
    setElapsed(0);
    setRunning(false);
    const doc = pipDocRef.current;
    if (doc) paint(doc, 0, noteRef.current, dark);
  }, [paint, dark]);

  return (
    <ToolPageShell toolId="document-pip-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Document PiP" left={trial.left} />

      {!supported && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-amber-50 p-5 text-sm dark:bg-amber-950/20">
          <p className="font-bold">Document Picture-in-Picture is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">
            It needs Chrome or Edge 116 and later on desktop. Firefox and Safari do not implement it yet, so the demo below cannot run here.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">Window width</span>
              <span className="font-mono text-muted-foreground">{width}px</span>
            </div>
            <input type="range" min={240} max={640} step={20} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">Window height</span>
              <span className="font-mono text-muted-foreground">{height}px</span>
            </div>
            <input type="range" min={160} max={480} step={20} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} className="h-4 w-4 accent-primary" />
            Dark PiP theme
          </label>

          {!open ? (
            <ActionButton busy={busy} disabled={!trial.canUse || !supported} onClick={() => void openPip()}>
              <PictureInPicture2 className="h-4 w-4" /> {busy ? "Opening..." : "Open PiP window"}
            </ActionButton>
          ) : (
            <button
              type="button"
              onClick={closePip}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-primary/40"
            >
              <X className="h-4 w-4" /> Close PiP window
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleTimer}
              disabled={!open}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              <Timer className="h-4 w-4" /> {running ? "Pause" : "Start"} timer
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
            >
              Reset
            </button>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free PiP windows left.</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-bold">Note that mirrors into PiP</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              placeholder="Type something..."
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Every keystroke is written into the live PiP document. The PiP window is a real separate window with its own document, styles and scripts.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <p><strong className="text-foreground">How it works:</strong> documentPictureInPicture.requestWindow() opens a blank always-on-top window and hands you its document. You build any HTML inside it, like this lab does with the stopwatch and the mirrored note.</p>
            <p className="mt-2">Unlike video PiP, document PiP keeps full interactivity: forms, buttons and live updates all keep working while the main tab is in the background.</p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
