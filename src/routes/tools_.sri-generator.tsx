// /tools/sri-generator - Generate Subresource Integrity (SRI) hashes for
// scripts and stylesheets. SHA-256/384/512 via WebCrypto, text or file
// input, paste-ready integrity attribute output. 100% client-side.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, FileUp, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sri-generator")({
  head: () => {
    const seo = getToolSeoMeta("sri-generator");
    const canonical = "https://iconvault.site/tools/sri-generator";
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
  component: SriGeneratorTool,
});

type Algo = "SHA-256" | "SHA-384" | "SHA-512";
const ALGOS: Algo[] = ["SHA-256", "SHA-384", "SHA-512"];
const algoTag = (a: Algo) => a.toLowerCase().replace("-", "");

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function digestBase64(algo: Algo, data: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest(algo, data as BufferSource);
  return bytesToBase64(new Uint8Array(d));
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

type Tab = "text" | "file";

function SriGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sri-generator", isPro);
  const seo = getToolSeo("sri-generator");

  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [url, setUrl] = useState("");
  const [algo, setAlgo] = useState<Algo>("SHA-384");
  const [integrity, setIntegrity] = useState<string | null>(null);
  const [size, setSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState<"attr" | "tag" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const acceptFile = async (f: File) => {
    try {
      const buf = await f.arrayBuffer();
      setFileBytes(new Uint8Array(buf));
      setFileName(f.name);
      setIntegrity(null);
    } catch {
      toast.error("Could not read that file.");
    }
  };

  const canGenerate =
    trial.canUse && !busy && (tab === "text" ? text.length > 0 : fileBytes !== null);

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    try {
      const data = tab === "text" ? new TextEncoder().encode(text) : fileBytes!;
      const b64 = await digestBase64(algo, data);
      setIntegrity(`${algoTag(algo)}-${b64}`);
      setSize(data.length);
      trial.recordUse();
      toast.success("Integrity hash generated");
    } catch {
      toast.error("Hashing failed. Your browser may not support WebCrypto.");
    } finally {
      setBusy(false);
    }
  };

  const trimmedUrl = url.trim();
  const isJs = /\.js(\?|#|$)/i.test(trimmedUrl);
  const isCss = /\.css(\?|#|$)/i.test(trimmedUrl);
  const fullTag = integrity
    ? trimmedUrl
      ? isJs
        ? `<script src="${trimmedUrl}"\n  integrity="${integrity}"\n  crossorigin="anonymous"></script>`
        : isCss
          ? `<link rel="stylesheet" href="${trimmedUrl}"\n  integrity="${integrity}"\n  crossorigin="anonymous">`
          : `<link rel="preload" href="${trimmedUrl}" as="fetch"\n  integrity="${integrity}"\n  crossorigin="anonymous">`
      : null
    : null;

  const doCopy = async (s: string, which: "attr" | "tag") => {
    const ok = await copyText(s);
    if (ok) {
      setCopied(which);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 1500);
    } else {
      toast.error("Copy failed. Select the text manually.");
    }
  };

  return (
    <ToolPageShell toolId="sri-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SRI Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            {(["text", "file"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setIntegrity(null); }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-bold transition",
                  tab === t ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "text" ? "Paste text" : "Upload file"}
              </button>
            ))}
          </div>

          {tab === "text" ? (
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setIntegrity(null); }}
              rows={7}
              placeholder="Paste your script or stylesheet content here…"
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
            />
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold">{fileName || "Drop a .js or .css file"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fileBytes ? formatBytes(fileBytes.length) + " loaded" : "Hashed locally, never uploaded"}
              </p>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
            </div>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Hash algorithm</p>
            <div className="flex gap-2">
              {ALGOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setAlgo(a); setIntegrity(null); }}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    algo === a
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {a.replace("SHA-", "SHA")}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              SHA-384 is the recommended balance of security and hash length.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">
              Resource URL <span className="text-muted-foreground">(optional, for the full tag)</span>
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cdn.example.com/app.min.js"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>

          <ActionButton busy={busy} disabled={!canGenerate} onClick={generate}>
            <ShieldCheck className="h-4 w-4" /> {busy ? "Hashing…" : "Generate SRI"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!integrity ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your integrity hash appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Browsers use this hash to verify a CDN file was not tampered with before executing it.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold">integrity attribute</p>
                  <span className="text-xs text-muted-foreground">{formatBytes(size)} hashed</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="flex-1 break-all rounded-xl bg-muted p-3 font-mono text-[13px]">
                    integrity=&quot;{integrity}&quot;
                  </code>
                  <button
                    type="button"
                    onClick={() => void doCopy(`integrity="${integrity}"`, "attr")}
                    className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    aria-label="Copy integrity attribute"
                  >
                    {copied === "attr" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold">Paste-ready tag</p>
                {fullTag ? (
                  <div className="flex items-start gap-2">
                    <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-3 font-mono text-[13px]">
                      {fullTag}
                    </pre>
                    <button
                      type="button"
                      onClick={() => void doCopy(fullTag, "tag")}
                      className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      aria-label="Copy full tag"
                    >
                      {copied === "tag" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    Add a resource URL on the left to get the full &lt;script&gt; or &lt;link&gt; tag.
                  </p>
                )}
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Tip: regenerate the hash every time the file changes. A single changed byte makes the
                browser refuse to load the resource, which is exactly the protection SRI gives you.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
