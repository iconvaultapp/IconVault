// /tools/compression-streams - Browser-native gzip/deflate compression with
// hex dump, Base64 output and decompress verification. 100% in-browser.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, CheckCircle2, Copy, Download, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/compression-streams")({
  head: () => {
    const seo = getToolSeoMeta("compression-streams");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CompressionStreamsTool,
});

type Format = "gzip" | "deflate" | "deflate-raw";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "gzip", label: "gzip", hint: "HTTP content-encoding, .gz files" },
  { id: "deflate", label: "deflate", hint: "zlib wrapper format" },
  { id: "deflate-raw", label: "deflate-raw", hint: "raw deflate, no header" },
];

const SAMPLE = `{"name":"iconvault","tools":109,"features":["fast","private","free"],"nested":{"a":[1,2,3],"b":"hello world"}}`;

async function compressBytes(data: Uint8Array, format: Format): Promise<Uint8Array> {
  const cs = new CompressionStream(format);
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(cs);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function decompressBytes(data: Uint8Array, format: Format): Promise<Uint8Array> {
  const ds = new DecompressionStream(format);
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function hexDump(bytes: Uint8Array, maxBytes = 256): string {
  const len = Math.min(bytes.length, maxBytes);
  const rows: string[] = [];
  for (let i = 0; i < len; i += 16) {
    const slice = bytes.subarray(i, Math.min(i + 16, len));
    const hex = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const ascii = Array.from(slice)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
      .join("");
    rows.push(`${i.toString(16).padStart(8, "0")}  ${hex.padEnd(48, " ")}  ${ascii}`);
  }
  if (bytes.length > maxBytes) rows.push(`... (${bytes.length - maxBytes} more bytes)`);
  return rows.join("\n");
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(2)} KB`;
}

function CompressionStreamsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("compression-streams", isPro);
  const seo = getToolSeo("compression-streams");

  const supported = typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

  const [input, setInput] = useState(SAMPLE);
  const [format, setFormat] = useState<Format>("gzip");
  const [compressed, setCompressed] = useState<Uint8Array | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base64 = useMemo(() => (compressed ? toBase64(compressed) : ""), [compressed]);
  const dump = useMemo(() => (compressed ? hexDump(compressed) : ""), [compressed]);

  const run = useCallback(async () => {
    if (!input || busy || !trial.canUse || !supported) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = new TextEncoder().encode(input);
      const out = await compressBytes(bytes, format);
      const back = await decompressBytes(out, format);
      const ok = back.length === bytes.length && back.every((b, i) => b === bytes[i]);
      setCompressed(out);
      setOriginalSize(bytes.length);
      setVerified(ok);
      trial.recordUse();
      toast.success(ok ? "Compressed and round-trip verified" : "Compressed (round-trip mismatch)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
    } finally {
      setBusy(false);
    }
  }, [input, format, busy, trial, supported]);

  const copyBase64 = useCallback(async () => {
    if (!base64) return;
    try {
      await navigator.clipboard.writeText(base64);
      toast.success("Base64 copied");
    } catch {
      toast.error("Copy failed in this browser.");
    }
  }, [base64]);

  const download = useCallback(() => {
    if (!compressed) return;
    const ext = format === "gzip" ? "gz" : "bin";
    downloadBlob(new Blob([compressed as BlobPart], { type: "application/octet-stream" }), `compressed.${ext}`);
    toast.success("Compressed file downloaded");
  }, [compressed, format]);

  const ratio = compressed && originalSize > 0 ? (compressed.length / originalSize) * 100 : 0;

  return (
    <ToolPageShell toolId="compression-streams" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Compression Streams" left={trial.left} />

      {!supported && (
        <p className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          Your browser does not support the CompressionStream API. Please use a recent version of
          Chrome, Edge, Firefox or Safari.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Format</p>
            <div className="space-y-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "w-full rounded-xl border px-3.5 py-2.5 text-left transition",
                    format === f.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("block text-sm font-bold", format === f.id ? "text-primary" : "text-foreground")}>
                    {f.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{f.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={!input || !trial.canUse || !supported} onClick={run}>
            <Minimize2 className="h-4 w-4" /> {busy ? "Compressing..." : "Compress"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Uses your browser's native compressor.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Input text</p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder="Paste text to compress..."
              className="h-40 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary/60"
            />
          </div>

          {compressed && (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Original</p>
                  <p className="text-lg font-bold">{fmtBytes(originalSize)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Compressed</p>
                  <p className="text-lg font-bold text-primary">{fmtBytes(compressed.length)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Ratio</p>
                  <p className="text-lg font-bold">{ratio.toFixed(1)}%</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Round-trip</p>
                  <p className="flex items-center gap-1.5 text-lg font-bold">
                    {verified ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" /> OK
                      </>
                    ) : (
                      <span className="text-red-500">Failed</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground/80">Hex dump</p>
                  <button
                    type="button"
                    onClick={download}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:border-primary/40"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>
                <pre className="max-h-56 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed">
                  {dump}
                </pre>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground/80">
                    Base64 <span className="text-muted-foreground">({fmtBytes(base64.length)})</span>
                  </p>
                  <button
                    type="button"
                    onClick={copyBase64}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:border-primary/40"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <pre className="max-h-40 overflow-auto break-all rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {base64}
                </pre>
              </div>

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                Decompression was verified by decoding the output back and comparing every byte.
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
