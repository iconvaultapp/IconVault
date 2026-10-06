// /tools/encoding-api-playground - Encoding API lab: TextEncoder / TextDecoder
// with UTF-8 byte visualization, multi-encoding decode and streaming demos.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Binary, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/encoding-api-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/encoding-api-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/encoding-api-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/encoding-api-playground";
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
  component: EncodingApiPlayground,
});

const DECODER_LABELS = [
  "utf-8",
  "utf-16le",
  "utf-16be",
  "windows-1252",
  "iso-8859-1",
  "shift_jis",
  "gbk",
] as const;

const toHex = (b: number) => b.toString(16).padStart(2, "0").toUpperCase();

/** Classify a UTF-8 byte for coloring: ascii, lead, continuation. */
function byteKind(bytes: Uint8Array, i: number): "ascii" | "lead" | "cont" {
  const b = bytes[i] ?? 0;
  if (b < 0x80) return "ascii";
  if (b >= 0xc0) return "lead";
  return "cont";
}

/** Per-character UTF-8 breakdown. */
function charBreakdown(text: string): { ch: string; cp: string; bytes: number[] }[] {
  const enc = new TextEncoder();
  const out: { ch: string; cp: string; bytes: number[] }[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    out.push({
      ch,
      cp: "U+" + cp.toString(16).toUpperCase().padStart(4, "0"),
      bytes: Array.from(enc.encode(ch)),
    });
  }
  return out;
}

function EncodingApiPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("encoding-api-playground", isPro);
  const seo = toolSeo;

  const [text, setText] = useState("Hello, 世界 🌍");
  const [decodeLabel, setDecodeLabel] = useState<string>("utf-8");
  const [fatal, setFatal] = useState(false);
  const [hexInput, setHexInput] = useState("");
  const [decoded, setDecoded] = useState("");
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [chunkSize, setChunkSize] = useState(1);
  const [streamOut, setStreamOut] = useState("");
  const [streaming, setStreaming] = useState(false);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const bytes = useMemo(() => new TextEncoder().encode(text), [text]);
  const breakdown = useMemo(() => charBreakdown(text), [text]);
  const hexDump = useMemo(() => Array.from(bytes).map(toHex).join(" "), [bytes]);

  const copyBytes = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(hexDump);
      trial.recordUse();
      toast.success("Hex bytes copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const decodeHex = () => {
    if (!trial.canUse) return;
    setDecodeError(null);
    const cleaned = hexInput.replace(/[^0-9a-fA-F]/g, "");
    if (cleaned.length === 0 || cleaned.length % 2 !== 0) {
      setDecodeError("Enter an even number of hex digits (spaces allowed).");
      return;
    }
    try {
      const arr = new Uint8Array(cleaned.length / 2);
      for (let i = 0; i < arr.length; i++) arr[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
      const dec = new TextDecoder(decodeLabel, { fatal });
      setDecoded(dec.decode(arr));
      trial.recordUse();
    } catch (e) {
      setDecodeError(e instanceof Error ? e.message : "Decode failed");
    }
  };

  const runStream = () => {
    if (!trial.canUse || streaming) return;
    if (streamTimer.current) clearInterval(streamTimer.current);
    const decoder = new TextDecoder("utf-8");
    let offset = 0;
    setStreamOut("");
    setStreaming(true);
    streamTimer.current = setInterval(() => {
      const chunk = bytes.slice(offset, offset + chunkSize);
      offset += chunkSize;
      const last = offset >= bytes.length;
      setStreamOut((prev) => prev + decoder.decode(chunk, { stream: !last }));
      if (last) {
        if (streamTimer.current) clearInterval(streamTimer.current);
        setStreaming(false);
        trial.recordUse();
        toast.success("Stream complete: no broken characters");
      }
    }, 260);
  };

  const naiveSplit = useMemo(() => {
    // Decode the first chunk WITHOUT streaming to show the mojibake problem.
    const first = bytes.slice(0, chunkSize);
    return new TextDecoder("utf-8").decode(first);
  }, [bytes, chunkSize]);

  const streamCode = `const bytes = new TextEncoder().encode(text);\nconst decoder = new TextDecoder("utf-8", { stream: true });\n\nfor (const chunk of chunks) {\n  // stream: true keeps incomplete multibyte chars buffered\n  output += decoder.decode(chunk, { stream: true });\n}\noutput += decoder.decode(); // flush`;

  return (
    <ToolPageShell toolId="encoding-api-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Encoding API" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="enc-input" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Text to encode (TextEncoder is always UTF-8)
            </label>
            <textarea
              id="enc-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Chars</p>
              <p className="text-lg font-bold tabular-nums">{[...text].length}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bytes</p>
              <p className="text-lg font-bold tabular-nums">{bytes.length}</p>
            </div>
            <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ratio</p>
              <p className="text-lg font-bold tabular-nums">{[...text].length ? (bytes.length / [...text].length).toFixed(2) : "0"}</p>
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyBytes}>
            <Binary className="h-4 w-4" /> Copy hex bytes
          </ActionButton>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left.</p>}

          <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Byte colors</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-sky-500/70" />ASCII (1 byte)</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-violet-500/70" />Lead byte</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/70" />Continuation</span>
            </p>
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Byte visualization</h2>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-muted/30 p-3">
              {Array.from(bytes).map((b, i) => (
                <span
                  key={i}
                  title={`byte ${i}: 0x${toHex(b)} = ${b}`}
                  className={cn(
                    "rounded-md px-1.5 py-1 font-mono text-[11px] font-bold tabular-nums",
                    byteKind(bytes, i) === "ascii" && "bg-sky-500/20 text-sky-600 dark:text-sky-300",
                    byteKind(bytes, i) === "lead" && "bg-violet-500/20 text-violet-600 dark:text-violet-300",
                    byteKind(bytes, i) === "cont" && "bg-amber-500/20 text-amber-600 dark:text-amber-300",
                  )}
                >
                  {toHex(b)}
                </span>
              ))}
              {bytes.length === 0 && <span className="text-xs text-muted-foreground">Type something to see its bytes.</span>}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Per-character breakdown</h2>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Char</th>
                    <th className="px-3 py-2 font-semibold">Code point</th>
                    <th className="px-3 py-2 font-semibold">UTF-8 bytes</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.slice(0, 24).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 text-base">{r.ch === " " ? <span className="text-muted-foreground">␣</span> : r.ch}</td>
                      <td className="px-3 py-1.5 font-mono">{r.cp}</td>
                      <td className="px-3 py-1.5 font-mono">{r.bytes.map(toHex).join(" ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {breakdown.length > 24 && (
                <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  Showing first 24 of {breakdown.length} characters.
                </p>
              )}
            </div>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="mb-2 text-sm font-semibold">Decode hex with any encoding</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select value={decodeLabel} onChange={(e) => setDecodeLabel(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 font-mono text-xs" aria-label="Decoder encoding">
                {DECODER_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs font-medium">
                <input type="checkbox" checked={fatal} onChange={(e) => setFatal(e.target.checked)} className="accent-primary" />
                fatal (throw on invalid bytes)
              </label>
            </div>
            <textarea
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              rows={2}
              placeholder="Paste hex bytes, e.g. 48 65 6C 6C 6F"
              className="mt-2 w-full rounded-xl border border-border bg-background p-3 font-mono text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setHexInput(hexDump)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-primary/50">
                Use bytes from above
              </button>
              <button type="button" onClick={decodeHex} disabled={!trial.canUse} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
                Decode
              </button>
            </div>
            {decodeError && <p className="mt-2 text-sm font-medium text-red-500">{decodeError}</p>}
            {decoded && (
              <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Decoded text</p>
                <p className="mt-1 text-sm font-semibold">{decoded}</p>
              </div>
            )}
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="mb-2 text-sm font-semibold">Streaming decode demo</h2>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Split the bytes into {chunkSize}-byte chunks. Without <code className="font-mono">{"{ stream: true }"}</code> a
              multibyte character cut in half decodes as {"\uFFFD"}; with streaming the decoder buffers the partial bytes.
            </p>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-medium">Chunk size</span>
              <input type="range" min={1} max={6} step={1} value={chunkSize} onChange={(e) => setChunkSize(parseInt(e.target.value))} className="w-40 accent-primary" aria-label="Chunk size" />
              <span className="text-xs font-bold tabular-nums">{chunkSize} byte{chunkSize > 1 ? "s" : ""}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Naive: first chunk decoded alone</p>
                <p className="mt-1 font-mono text-sm">{naiveSplit || <span className="text-muted-foreground">(empty)</span>}</p>
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Streaming: progressive output</p>
                <p className="mt-1 font-mono text-sm">{streamOut || <span className="text-muted-foreground">(press run)</span>}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton busy={streaming} disabled={!trial.canUse} onClick={runStream}>
                <Play className="h-4 w-4" /> {streaming ? "Streaming" : "Run stream demo"}
              </ActionButton>
              <button
                type="button"
                onClick={async () => { try { await navigator.clipboard.writeText(streamCode); toast.success("Streaming code copied"); } catch { toast.error("Copy failed"); } }}
                className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:border-primary/50"
              >
                <Copy className="h-4 w-4" /> Copy streaming code
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed"><code>{streamCode}</code></pre>
          </section>
        </div>
      </div>
    </ToolPageShell>
  );
}
