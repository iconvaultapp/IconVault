// /tools/fetch-playground - Fetch lab: real requests with cache modes,
// streaming download progress, timeout abort, and retry with exponential
// backoff. Runs real fetch() in your browser. 100% client-side.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Globe, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import { downloadBlob } from "@/lib/logo-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/fetch-playground")({
  head: () => {
    const seo = getToolSeoMeta("fetch-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: FetchPlayground,
});

const CACHE_MODES = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"] as const;
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const DEMOS = [
  { name: "JSON demo", url: "https://jsonplaceholder.typicode.com/posts/1", method: "GET" },
  { name: "Slow stream", url: "https://httpbin.org/stream/20", method: "GET" },
  { name: "HTTP 500 (retry)", url: "https://httpbin.org/status/500", method: "GET" },
  { name: "Bad host (retry)", url: "https://invalid.invalid/boom", method: "GET" },
] as const;

interface Attempt { n: number; status: string; ms: number; note: string }
interface Result {
  status: number;
  statusText: string;
  ms: number;
  bytes: number;
  headers: [string, string][];
  body: string;
  truncated: boolean;
  contentType: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function FetchPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("fetch-playground", isPro);
  const seo = getToolSeo("fetch-playground");

  const [url, setUrl] = useState(DEMO_URL_DEFAULT());
  const [method, setMethod] = useState<string>("GET");
  const [cache, setCache] = useState<string>("default");
  const [headersText, setHeadersText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [retries, setRetries] = useState(3);
  const [baseDelay, setBaseDelay] = useState(500);
  const [timeoutMs, setTimeoutMs] = useState(15000);

  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [progress, setProgress] = useState<{ received: number; total: number | null } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const parseHeaders = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const line of headersText.split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return out;
  };

  const send = async () => {
    if (!trial.canUse || busy) return;
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
    } catch {
      setError("Enter a valid http(s) URL.");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setResult(null);
    setAttempts([]);
    setProgress(null);

    const headers = parseHeaders();
    const hasBody = method !== "GET" && method !== "DELETE" && bodyText.trim().length > 0;
    let lastErr = "";
    let attempt = 0;

    while (attempt <= retries) {
      attempt++;
      const t0 = performance.now();
      const timeout = setTimeout(() => ctrl.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
      try {
        const res = await fetch(url, {
          method,
          cache: cache as RequestCache,
          headers,
          ...(hasBody ? { body: bodyText } : {}),
          signal: ctrl.signal,
        });
        const ms = Math.round(performance.now() - t0);
        const total = res.headers.get("content-length") ? parseInt(res.headers.get("content-length")!, 10) : null;
        const reader = res.body?.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            setProgress({ received, total });
          }
        }
        clearTimeout(timeout);
        const buf = new Uint8Array(received);
        let off = 0;
        for (const c of chunks) { buf.set(c, off); off += c.length; }
        const text = new TextDecoder().decode(buf);
        const attemptNote = res.ok ? "ok" : `HTTP ${res.status}: will retry`;
        setAttempts((p) => [...p, { n: attempt, status: `${res.status} ${res.statusText}`, ms, note: attemptNote }]);
        if (!res.ok && attempt <= retries) {
          const wait = baseDelay * 2 ** (attempt - 1);
          setAttempts((p) => [...p, { n: attempt, status: "wait", ms: wait, note: `backing off ${wait}ms before retry ${attempt + 1}` }]);
          await sleep(wait);
          continue;
        }
        const headerList: [string, string][] = [];
        res.headers.forEach((v, k) => headerList.push([k, v]));
        setResult({
          status: res.status,
          statusText: res.statusText,
          ms,
          bytes: received,
          headers: headerList.slice(0, 30),
          body: text.slice(0, 8000),
          truncated: text.length > 8000,
          contentType: res.headers.get("content-type") || "",
        });
        trial.recordUse();
        setBusy(false);
        setProgress(null);
        return;
      } catch (e) {
        clearTimeout(timeout);
        const ms = Math.round(performance.now() - t0);
        lastErr = e instanceof Error ? e.message : String(e);
        setAttempts((p) => [...p, { n: attempt, status: "error", ms, note: lastErr }]);
        if (ctrl.signal.aborted) break; // cancelled or timed out: no retry
        if (attempt <= retries) {
          const wait = baseDelay * 2 ** (attempt - 1);
          setAttempts((p) => [...p, { n: attempt, status: "wait", ms: wait, note: `backing off ${wait}ms before retry ${attempt + 1}` }]);
          await sleep(wait);
          continue;
        }
      }
    }
    setError(`Request failed after ${attempt} attempt${attempt === 1 ? "" : "s"}: ${lastErr}. Note: many APIs block browser requests via CORS.`);
    setBusy(false);
    setProgress(null);
  };

  const cancel = () => abortRef.current?.abort(new Error("cancelled by user"));

  const downloadBody = () => {
    if (!result) return;
    const ext = result.contentType.includes("json") ? "json" : result.contentType.includes("html") ? "html" : "txt";
    downloadBlob(new Blob([result.body], { type: "text/plain" }), `fetch-response.${ext}`);
  };

  const code = `// retry with exponential backoff + streaming progress\nasync function fetchWithRetry(url, { retries = ${retries}, baseDelay = ${baseDelay} } = {}) {\n  for (let attempt = 0; ; attempt++) {\n    try {\n      const res = await fetch(url, {\n        method: "${method}",\n        cache: "${cache}",${headersText.trim() ? `\n        headers: ${JSON.stringify(parseHeaders(), null, 2).split("\n").join("\n        ")},` : ""}\n      });\n      if (!res.ok && attempt < retries) throw new Error("HTTP " + res.status);\n      return res;\n    } catch (err) {\n      if (attempt >= retries) throw err;\n      await new Promise(r => setTimeout(r, baseDelay * 2 ** attempt));\n    }\n  }\n}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Fetch code copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const fmtBytes = (n: number) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

  return (
    <ToolPageShell toolId="fetch-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Fetch Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="fetch-url" className="mb-1.5 block text-[13px] font-medium text-foreground/80">URL</label>
            <input id="fetch-url" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMOS.map((d) => (
                <button key={d.name} type="button" onClick={() => { setUrl(d.url); setMethod(d.method); }} className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold hover:border-primary/50">
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fetch-method" className="mb-1.5 block text-[13px] font-medium text-foreground/80">Method</label>
              <select id="fetch-method" value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-xl border border-border bg-background px-2 py-2.5 text-sm">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="fetch-cache" className="mb-1.5 block text-[13px] font-medium text-foreground/80">Cache mode</label>
              <select id="fetch-cache" value={cache} onChange={(e) => setCache(e.target.value)} className="w-full rounded-xl border border-border bg-background px-2 py-2.5 font-mono text-xs">
                {CACHE_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="fetch-headers" className="mb-1.5 block text-[13px] font-medium text-foreground/80">Headers <span className="text-muted-foreground">(one per line, Name: value)</span></label>
            <textarea id="fetch-headers" value={headersText} onChange={(e) => setHeadersText(e.target.value)} rows={2} placeholder={"Authorization: Bearer xxx\nContent-Type: application/json"} spellCheck={false} className="w-full rounded-xl border border-border bg-background p-2.5 font-mono text-xs" />
          </div>

          <div>
            <label htmlFor="fetch-body" className="mb-1.5 block text-[13px] font-medium text-foreground/80">Body <span className="text-muted-foreground">(POST/PUT/PATCH)</span></label>
            <textarea id="fetch-body" value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={3} placeholder='{"hello":"world"}' spellCheck={false} className="w-full rounded-xl border border-border bg-background p-2.5 font-mono text-xs" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="fetch-retries" className="mb-1.5 block text-xs font-medium text-foreground/80">Retries</label>
              <input id="fetch-retries" type="number" min={0} max={5} value={retries} onChange={(e) => setRetries(Math.max(0, Math.min(5, parseInt(e.target.value) || 0)))} className="w-full rounded-xl border border-border bg-background px-2 py-2 text-sm tabular-nums" />
            </div>
            <div>
              <label htmlFor="fetch-delay" className="mb-1.5 block text-xs font-medium text-foreground/80">Base delay ms</label>
              <input id="fetch-delay" type="number" min={100} max={5000} step={100} value={baseDelay} onChange={(e) => setBaseDelay(parseInt(e.target.value) || 500)} className="w-full rounded-xl border border-border bg-background px-2 py-2 text-sm tabular-nums" />
            </div>
            <div>
              <label htmlFor="fetch-timeout" className="mb-1.5 block text-xs font-medium text-foreground/80">Timeout ms</label>
              <input id="fetch-timeout" type="number" min={1000} max={60000} step={1000} value={timeoutMs} onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 15000)} className="w-full rounded-xl border border-border bg-background px-2 py-2 text-sm tabular-nums" />
            </div>
          </div>

          <div className="flex gap-2">
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={send}>
              <Send className="h-4 w-4" /> {busy ? "Fetching" : "Send request"}
            </ActionButton>
            {busy && (
              <button type="button" onClick={cancel} className="rounded-xl border border-red-500/40 px-4 py-3 text-sm font-bold text-red-500">
                Cancel
              </button>
            )}
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free requests left.</p>}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Real fetch() from your browser. Cross-origin APIs may refuse with a CORS error; that is the server's policy, not a bug here.
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {progress && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Downloading</span>
                <span className="tabular-nums">{fmtBytes(progress.received)}{progress.total ? ` / ${fmtBytes(progress.total)}` : ""}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: progress.total ? `${Math.min(100, (progress.received / progress.total) * 100)}%` : "100%" }}
                />
              </div>
            </div>
          )}

          {attempts.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Attempts <span className="font-normal text-muted-foreground">(exponential backoff: {baseDelay}ms, x2 each retry)</span></p>
              <div className="space-y-1.5">
                {attempts.map((a, i) => (
                  <div key={i} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 font-mono text-xs", a.status === "error" ? "border-red-500/30 bg-red-500/5" : a.status === "wait" ? "border-amber-500/30 bg-amber-500/5" : "border-border")}>
                    <span className="font-bold">#{a.n}</span>
                    <span className="flex-1 truncate">{a.status === "wait" ? a.note : `${a.status} - ${a.note}`}</span>
                    <span className="tabular-nums text-muted-foreground">{a.ms}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm font-medium text-red-500">{error}</p>}

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Status", `${result.status} ${result.statusText}`],
                  ["Time", `${result.ms}ms`],
                  ["Size", fmtBytes(result.bytes)],
                  ["Type", result.contentType.split(";")[0] || "-"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</p>
                    <p className="truncate text-sm font-bold" title={v}>{v}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Response headers</p>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-border">
                  <table className="w-full font-mono text-[11px]">
                    <tbody>
                      {result.headers.map(([k, v], i) => (
                        <tr key={i} className="border-t border-border first:border-t-0">
                          <td className="px-3 py-1 font-bold">{k}</td>
                          <td className="break-all px-3 py-1 text-muted-foreground">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Response body {result.truncated && <span className="font-normal text-muted-foreground">(first 8,000 chars)</span>}</p>
                  <button type="button" onClick={downloadBody} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary/50">
                    Download body
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-[11px] leading-relaxed"><code>{result.body || "(empty body)"}</code></pre>
              </div>
            </div>
          )}

          {!result && !error && attempts.length === 0 && (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Send className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-semibold">No request yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Pick a demo endpoint or enter your own URL, then send a real request.</p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Copyable pattern</p>
              <button type="button" onClick={copyCode} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:border-primary/50">
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 text-[11px] leading-relaxed"><code>{code}</code></pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

function DEMO_URL_DEFAULT() {
  return "https://jsonplaceholder.typicode.com/posts/1";
}
