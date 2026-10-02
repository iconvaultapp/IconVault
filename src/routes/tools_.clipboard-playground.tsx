// /tools/clipboard-playground - Real Clipboard API playground:
// writeText, multi-MIME ClipboardItem writes (HTML, PNG image, custom web
// format) and full clipboard.read() inspection with image preview.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardPaste, Copy, ScanSearch, Info, Image as ImageIcon, FileCode2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/clipboard-playground")({
  head: () => {
    const seo = getToolSeoMeta("clipboard-playground");
    const canonical = "https://iconvault.site/tools/clipboard-playground";
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
  component: ClipboardTool,
});

interface ReadResult {
  types: string[];
  texts: Record<string, string>;
  images: string[];
}

function ClipboardTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("clipboard-playground", isPro);
  const seo = getToolSeo("clipboard-playground");

  const [hasClipboard] = useState<boolean>(() => typeof navigator !== "undefined" && "clipboard" in navigator);
  const [canWriteText] = useState<boolean>(() => typeof navigator?.clipboard?.writeText === "function");
  const [canReadText] = useState<boolean>(() => typeof navigator?.clipboard?.readText === "function");
  const [canRead] = useState<boolean>(() => typeof navigator?.clipboard?.read === "function");
  const [canWrite] = useState<boolean>(
    () => typeof navigator?.clipboard?.write === "function" && typeof ClipboardItem !== "undefined",
  );
  const [permRead, setPermRead] = useState("unknown");
  const [permWrite, setPermWrite] = useState("unknown");

  const [text, setText] = useState("Hello from IconVault's clipboard lab.");
  const [html, setHtml] = useState("<p>Hello from <strong>IconVault</strong> <em>clipboard lab</em>.</p>");
  const [customText, setCustomText] = useState("Custom payload: order-4821, priority high.");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [results, setResults] = useState<ReadResult[]>([]);
  const [lastWrite, setLastWrite] = useState("");

  const queryPerms = useCallback(async () => {
    if (!("permissions" in navigator)) return;
    for (const [name, set] of [["clipboard-read", setPermRead], ["clipboard-write", setPermWrite]] as const) {
      try {
        const s = await navigator.permissions.query({ name: name as PermissionName });
        set(s.state);
      } catch {
        set("unavailable");
      }
    }
  }, []);

  useEffect(() => {
    void queryPerms();
  }, [queryPerms]);

  const guard = useCallback((): boolean => {
    if (!hasClipboard) {
      toast.error("Clipboard API is not available in this browser.");
      return false;
    }
    if (!trial.canUse) {
      toast.error("Free trial used up for this tool.");
      return false;
    }
    return true;
  }, [hasClipboard, trial]);

  const writeText = useCallback(async () => {
    if (!guard() || !canWriteText) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(text);
      setLastWrite(`writeText: ${text.length} chars copied.`);
      trial.recordUse();
      toast.success("Text copied. Paste anywhere to verify.");
    } catch (e) {
      toast.error(e instanceof Error ? `${e.name}: ${e.message}` : "Copy failed.");
    } finally {
      setBusy(false);
    }
  }, [guard, canWriteText, text, trial]);

  const writeRich = useCallback(async () => {
    if (!guard() || !canWrite) return;
    setBusy(true);
    try {
      const plain = html.replace(/<[^>]+>/g, "");
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      setLastWrite("ClipboardItem written with text/html + text/plain.");
      trial.recordUse();
      toast.success("Rich HTML copied. Paste into a rich editor to see formatting.");
    } catch (e) {
      toast.error(e instanceof Error ? `${e.name}: ${e.message}` : "Copy failed.");
    } finally {
      setBusy(false);
    }
  }, [guard, canWrite, html, trial]);

  const writeImage = useCallback(async () => {
    if (!guard() || !canWrite) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D unavailable.");
      const grad = ctx.createLinearGradient(0, 0, 480, 200);
      grad.addColorStop(0, "#0f766e");
      grad.addColorStop(1, "#14b8a6");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 480, 200);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("IconVault", 240, 84);
      ctx.font = "22px system-ui, sans-serif";
      ctx.fillText("clipboard lab sample", 240, 132);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("PNG encoding failed.");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setLastWrite(`image/png written (${Math.round(blob.size / 1024)}KB).`);
      trial.recordUse();
      toast.success("Image copied. Paste into any image-aware app.");
    } catch (e) {
      toast.error(e instanceof Error ? `${e.name}: ${e.message}` : "Copy failed.");
    } finally {
      setBusy(false);
    }
  }, [guard, canWrite, trial]);

  const writeCustom = useCallback(async () => {
    if (!guard() || !canWrite) return;
    setBusy(true);
    try {
      const type = "web text/x-iconvault-note";
      const item = new ClipboardItem({
        [type]: new Blob([customText], { type }),
        "text/plain": new Blob([customText], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      setLastWrite(`Custom format "${type}" written (with text/plain fallback).`);
      trial.recordUse();
      toast.success("Custom format copied. Use Read below to see it come back.");
    } catch (e) {
      toast.error(e instanceof Error ? `${e.name}: ${e.message}` : "Copy failed.");
    } finally {
      setBusy(false);
    }
  }, [guard, canWrite, customText, trial]);

  const readClipboard = useCallback(async () => {
    if (!hasClipboard) {
      toast.error("Clipboard API is not available in this browser.");
      return;
    }
    setReading(true);
    try {
      let items: ClipboardItem[];
      if (canRead) {
        items = await navigator.clipboard.read();
      } else if (canReadText) {
        const t = await navigator.clipboard.readText();
        items = [];
        setResults([{ types: ["text/plain (via readText fallback)"], texts: { "text/plain": t }, images: [] }]);
        toast.success("Clipboard read (text only: this browser lacks read()).");
        return;
      } else {
        throw new Error("Neither read() nor readText() is available.");
      }
      const out: ReadResult[] = [];
      for (const item of items) {
        const texts: Record<string, string> = {};
        const images: string[] = [];
        for (const t of item.types) {
          try {
            const blob = await item.getType(t);
            if (t.startsWith("image/")) {
              images.push(URL.createObjectURL(blob));
            } else if (t.startsWith("text/") || t === "text/uri-list") {
              const s = await blob.text();
              texts[t] = s.length > 600 ? `${s.slice(0, 600)}... (${s.length} chars total)` : s;
            } else {
              texts[t] = `[${blob.size} bytes of ${blob.type || "binary"}]`;
            }
          } catch {
            texts[t] = "[could not decode]";
          }
        }
        out.push({ types: [...item.types], texts, images });
      }
      setResults(out);
      toast.success(`Read ${out.length} clipboard item(s).`);
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : "Read failed.";
      toast.error(msg);
      setResults([]);
    } finally {
      setReading(false);
    }
  }, [hasClipboard, canRead, canReadText]);

  const matrix: [string, boolean][] = [
    ["navigator.clipboard", hasClipboard],
    ["writeText / readText", canWriteText && canReadText],
    ["clipboard.read() (multi-MIME)", canRead],
    ["clipboard.write() + ClipboardItem", canWrite],
  ];

  return (
    <ToolPageShell toolId="clipboard-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Clipboard API" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Copy className="h-4 w-4 text-primary" /> Write to clipboard
          </h2>

          <div>
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5" /> Plain text
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="mt-2">
              <ActionButton busy={busy} disabled={!canWriteText || !trial.canUse} onClick={() => void writeText()}>
                Copy text
              </ActionButton>
            </div>
          </div>

          <div>
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <FileCode2 className="h-3.5 w-3.5" /> Rich HTML (ClipboardItem, text/html + text/plain)
            </span>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={2}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => void writeRich()}
              disabled={!canWrite || !trial.canUse}
              className="mt-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy as rich HTML
            </button>
          </div>

          <div>
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> Generated PNG image
            </span>
            <p className="mb-2 text-xs text-muted-foreground">
              Draws a 480x200 badge on a canvas and copies it as image/png.
            </p>
            <button
              type="button"
              onClick={() => void writeImage()}
              disabled={!canWrite || !trial.canUse}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy image
            </button>
          </div>

          <div>
            <span className="mb-1 text-xs font-semibold text-muted-foreground">
              Custom format (web text/x-iconvault-note)
            </span>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void writeCustom()}
              disabled={!canWrite || !trial.canUse}
              className="mt-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy custom format
            </button>
          </div>

          {lastWrite && (
            <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600">
              {lastWrite}
            </p>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free writes left. Nothing is uploaded anywhere.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ScanSearch className="h-4 w-4 text-primary" /> Read clipboard
              </h2>
              <ActionButton busy={reading} disabled={!hasClipboard} onClick={() => void readClipboard()}>
                <ClipboardPaste className="h-4 w-4" /> {reading ? "Reading…" : "Read clipboard"}
              </ActionButton>
            </div>
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Copy something above (or anywhere), then read it back: every MIME type is listed,
                images render inline.
              </p>
            ) : (
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="rounded-xl border border-border p-3">
                    <p className="mb-2 font-mono text-[11px] font-bold text-muted-foreground">
                      Item {i + 1}: {r.types.join(", ") || "(no types)"}
                    </p>
                    {Object.entries(r.texts).map(([t, v]) => (
                      <div key={t} className="mb-2">
                        <p className="font-mono text-[11px] font-bold text-primary">{t}</p>
                        <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted/60 p-2 font-mono text-xs">
                          {v}
                        </pre>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      {r.images.map((src, j) => (
                        <img key={j} src={src} alt={`Clipboard image ${j + 1}`} className="max-h-32 rounded-lg border border-border" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Support matrix (this browser)</h2>
            <ul className="space-y-1.5 text-sm">
              {matrix.map(([k, ok]) => (
                <li key={k} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5">
                  <span className="font-mono text-xs">{k}</span>
                  <span className={cn("text-xs font-bold", ok ? "text-emerald-600" : "text-red-500")}>
                    {ok ? "yes" : "no"}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5">
                <span className="font-mono text-xs">clipboard-read permission</span>
                <span className="text-xs font-bold text-muted-foreground">{permRead}</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5">
                <span className="font-mono text-xs">clipboard-write permission</span>
                <span className="text-xs font-bold text-muted-foreground">{permWrite}</span>
              </li>
            </ul>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Clipboard access needs a secure context, a focused document and a user gesture.
                Firefox supports readText/writeText only; Safari added async clipboard in 13.1 with
                limits. Custom formats must use the "web " prefix on write.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
