// /tools/svg-to-data-uri - paste an SVG, get a URL-encoded data URI for
// CSS backgrounds or an <img> embed snippet. 100% in-browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Check, Link2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/svg-to-data-uri";
import toolSeoMeta from "@/lib/tool-seo-meta-data/svg-to-data-uri";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/svg-to-data-uri")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/svg-to-data-uri";
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
  component: SvgToDataUriTool,
});

const bytes = (s: string) => new TextEncoder().encode(s).length;

type Mode = "encode" | "decode";
type Format = "raw" | "css-bg" | "img" | "mask";

const FORMATS: { id: Format; label: string }[] = [
  { id: "raw", label: "Raw URI" },
  { id: "css-bg", label: "CSS background" },
  { id: "img", label: "<img> tag" },
  { id: "mask", label: "CSS mask" },
];

function formatOutput(uri: string, format: Format): string {
  switch (format) {
    case "raw":
      return uri;
    case "css-bg":
      return `background-image: url("${uri}");`;
    case "img":
      return `<img src="${uri}" alt="" />`;
    case "mask":
      return `-webkit-mask-image: url("${uri}");\nmask-image: url("${uri}");`;
  }
}

/** Recover the original SVG from a data URI - handles base64 and URL-encoded payloads. */
function decodeDataUri(raw: string): string {
  const uri = raw.trim();
  if (!uri.startsWith("data:image/svg+xml")) {
    throw new Error('That doesn\'t look like an SVG data URI - it must start with "data:image/svg+xml".');
  }
  const comma = uri.indexOf(",");
  if (comma === -1) throw new Error("Malformed data URI - no payload found after the header.");
  const meta = uri.slice(0, comma);
  const payload = uri.slice(comma + 1);
  if (!payload) throw new Error("Malformed data URI - the payload is empty.");
  if (/;base64/i.test(meta)) {
    try {
      const bin = atob(payload.trim());
      return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    } catch {
      throw new Error("Malformed data URI - the base64 payload could not be decoded.");
    }
  }
  try {
    return decodeURIComponent(payload);
  } catch {
    throw new Error("Malformed data URI - the URL-encoded payload could not be decoded.");
  }
}

function SvgToDataUriTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("svg-to-data-uri", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<Mode>("encode");
  const [format, setFormat] = useState<Format>("css-bg");
  const [input, setInput] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<string | null>(null);
  const [uriLen, setUriLen] = useState(0);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setUri(null);
    setDecoded(null);
    setUriLen(0);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const generate = () => {
    const svg = input.trim();
    if (!svg) {
      toast.error("Paste an SVG first.");
      return;
    }
    if (!trial.canUse) return;
    // encodeURIComponent handles # → %23 and all reserved chars.
    const u = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    setUri(u);
    setDecoded(null);
    setUriLen(bytes(u));
    trial.recordUse();
  };

  const decode = () => {
    const raw = input.trim();
    if (!raw) {
      toast.error("Paste a data URI first.");
      return;
    }
    if (!trial.canUse) return;
    try {
      setDecoded(decodeDataUri(raw));
      setUri(null);
      trial.recordUse();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not decode that data URI.");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  };

  const download = (text: string, name: string) =>
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), name);

  const encoded = uri === null ? null : formatOutput(uri, format);
  const formatLabel = FORMATS.find((f) => f.id === format)?.label ?? "Output";

  return (
    <ToolPageShell toolId="svg-to-data-uri" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SVG to Data URI" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-2">
            {(["encode", "decode"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-bold capitalize transition",
                  mode === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              {mode === "encode" ? "SVG markup" : "SVG data URI"}
            </span>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); reset(); }}
              placeholder={mode === "encode" ? "<svg …> paste your SVG markup here…" : "data:image/svg+xml,… paste a data URI here…"}
              spellCheck={false}
              className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
            />
          </label>
          <div className="flex items-center gap-4">
            {mode === "encode" ? (
              <ActionButton disabled={!input.trim() || !trial.canUse} onClick={generate}>
                <Link2 className="h-4 w-4" /> Generate data URI
              </ActionButton>
            ) : (
              <ActionButton disabled={!input.trim() || !trial.canUse} onClick={decode}>
                <Link2 className="h-4 w-4" /> Decode data URI
              </ActionButton>
            )}
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free {mode === "encode" ? "encodings" : "decodings"} left - everything happens on your device, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {mode === "encode" ? (
            encoded === null ? (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                <Link2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your snippet appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Pick an output format below, then copy or download the ready-to-paste snippet.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                        format === f.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Data URI length: <b className="text-foreground">{uriLen.toLocaleString()} bytes</b>
                </p>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-foreground/80">{formatLabel}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => download(encoded, "data-uri-snippet.txt")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:border-primary/50"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                      <button
                        type="button"
                        onClick={() => copy(encoded)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:border-primary/50"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <textarea value={encoded} readOnly spellCheck={false} className="h-48 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none" />
                </div>
              </>
            )
          ) : decoded === null ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Link2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your SVG appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Paste a <code className="rounded bg-muted px-1">data:image/svg+xml</code> URI - base64 or URL-encoded - and get the original SVG back.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Recovered SVG: <b className="text-foreground">{bytes(decoded).toLocaleString()} bytes</b>
              </p>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground/80">Original SVG</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => download(decoded, "decoded.svg")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:border-primary/50"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => copy(decoded)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:border-primary/50"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <textarea value={decoded} readOnly spellCheck={false} className="h-48 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none" />
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
