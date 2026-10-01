// /tools/gzip-tool - Compress text or files with gzip and decompress gzip
// data, using the browser-native CompressionStream API. Shows before/after
// sizes and ratio, downloads .gz, copies base64. 100% client-side.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, Check, Copy, Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/gzip-tool")({
  head: () => {
    const seo = getToolSeoMeta("gzip-tool");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: GzipTool,
});

type StreamCtor = new (format: "gzip") => { readable: ReadableStream; writable: WritableStream };

function streamCtor(kind: "CompressionStream" | "DecompressionStream"): StreamCtor | null {
  const w = window as unknown as Record<string, StreamCtor | undefined>;
  return w[kind] ?? null;
}

async function gzipCompress(data: Uint8Array): Promise<Uint8Array> {
  const CS = streamCtor("CompressionStream");
  if (!CS) throw new Error("This browser does not support CompressionStream (gzip).");
  const cs = new CS("gzip");
  const writer = cs.writable.getWriter();
  await writer.write(data);
  await writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

async function gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
  const DS = streamCtor("DecompressionStream");
  if (!DS) throw new Error("This browser does not support DecompressionStream (gzip).");
  const ds = new DS("gzip");
  const writer = ds.writable.getWriter();
  await writer.write(data);
  await writer.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.trim().replace(/\s+/g, ""));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

type Tab = "compress" | "decompress";

function GzipTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gzip-tool", isPro);
  const seo = getToolSeo("gzip-tool");

  const [tab, setTab] = useState<Tab>("compress");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [b64Input, setB64Input] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // compress result
  const [compressed, setCompressed] = useState<Uint8Array | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  // decompress result
  const [decompressed, setDecompressed] = useState<string | null>(null);

  const acceptFile = async (f: File) => {
    try {
      const buf = await f.arrayBuffer();
      setFileBytes(new Uint8Array(buf));
      setFileName(f.name);
      setCompressed(null);
      setDecompressed(null);
      setError(null);
    } catch {
      toast.error("Could not read that file.");
    }
  };

  const canCompress = trial.canUse && !busy && (fileBytes !== null || text.length > 0);
  const canDecompress = trial.canUse && !busy && (fileBytes !== null || b64Input.trim().length > 0);

  const doCompress = async () => {
    if (!canCompress) return;
    setBusy(true);
    setError(null);
    try {
      const data = fileBytes ?? new TextEncoder().encode(text);
      const out = await gzipCompress(data);
      setCompressed(out);
      setOriginalSize(data.length);
      trial.recordUse();
      toast.success("Compressed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
    } finally {
      setBusy(false);
    }
  };

  const doDecompress = async () => {
    if (!canDecompress) return;
    setBusy(true);
    setError(null);
    try {
      const data = fileBytes ?? base64ToBytes(b64Input);
      const out = await gzipDecompress(data);
      try {
        setDecompressed(new TextDecoder("utf-8", { fatal: true }).decode(out));
      } catch {
        setDecompressed(null);
        setError("Decompressed, but the content is binary, not text. Download it instead.");
        downloadBlob(new Blob([out as BlobPart]), "decompressed.bin");
      }
      trial.recordUse();
      toast.success("Decompressed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decompression failed. Is this valid gzip data?");
    } finally {
      setBusy(false);
    }
  };

  const downloadGz = () => {
    if (!compressed) return;
    const base = fileName ? fileName.replace(/\.gz$/i, "") : "data.txt";
    downloadBlob(new Blob([compressed as BlobPart], { type: "application/gzip" }), `${base}.gz`);
    toast.success("Downloaded .gz file");
  };

  const copyB64 = async () => {
    if (!compressed) return;
    const ok = await copyText(bytesToBase64(compressed));
    if (ok) {
      setCopied(true);
      toast.success("Base64 copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const ratio = compressed && originalSize > 0
    ? Math.round((compressed.length / originalSize) * 100)
    : 0;

  return (
    <ToolPageShell toolId="gzip-tool" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Gzip Tool" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            {(["compress", "decompress"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-bold capitalize transition",
                  tab === t ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-semibold">{fileName || (tab === "compress" ? "Drop a file to compress" : "Drop a .gz file")}</p>
            <p className="mt-1 text-xs text-muted-foreground">or type below - file wins if both are set</p>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          {tab === "compress" ? (
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setCompressed(null); }}
              rows={5}
              placeholder="Or paste text to compress…"
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
            />
          ) : (
            <textarea
              value={b64Input}
              onChange={(e) => { setB64Input(e.target.value); setDecompressed(null); }}
              rows={5}
              placeholder="Or paste base64-encoded gzip data…"
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
            />
          )}

          {tab === "compress" ? (
            <ActionButton busy={busy} disabled={!canCompress} onClick={doCompress}>
              <Archive className="h-4 w-4" /> {busy ? "Compressing…" : "Compress"}
            </ActionButton>
          ) : (
            <ActionButton busy={busy} disabled={!canDecompress} onClick={doDecompress}>
              <Archive className="h-4 w-4" /> {busy ? "Decompressing…" : "Decompress"}
            </ActionButton>
          )}

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - compression is native browser code.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {tab === "compress" ? (
            !compressed ? (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                <Archive className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Compression stats appear here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  See exactly how many bytes gzip saves before you download anything.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Before", value: formatBytes(originalSize) },
                    { label: "After", value: formatBytes(compressed.length) },
                    { label: "Ratio", value: `${ratio}%` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-muted p-4 text-center">
                      <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
                      <p className="mt-1 text-xl font-extrabold">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Compressed size</span>
                    <span>{100 - ratio}% smaller</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(2, ratio)}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ActionButton onClick={downloadGz}>
                    <Download className="h-4 w-4" /> Download .gz
                  </ActionButton>
                  <button
                    type="button"
                    onClick={() => void copyB64()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-primary/40"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy base64"}
                  </button>
                </div>
              </div>
            )
          ) : !decompressed ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Archive className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Decompressed text appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Paste base64 gzip data or drop a .gz file to expand it back to text.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-bold">Decompressed text</p>
              <textarea
                readOnly
                value={decompressed}
                rows={14}
                className="w-full rounded-xl border border-border bg-muted/50 p-3 font-mono text-[13px] outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
