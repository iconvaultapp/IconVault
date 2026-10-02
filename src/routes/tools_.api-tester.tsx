// /tools/api-tester - Browser REST client: send GET/POST/PUT/DELETE requests
// with headers and body, inspect the response, keep a local history.
// Honest about CORS limits: browsers block cross-origin calls the server
// does not explicitly allow.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, History, Info, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/api-tester")({
  head: () => {
    const seo = getToolSeoMeta("api-tester");
    const canonical = "https://iconvault.site/tools/api-tester";
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
  component: ApiTesterTool,
});

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
type BodyKind = "none" | "json" | "text" | "form";

const METHODS: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

interface HeaderRow {
  key: string;
  value: string;
}

interface ApiResponse {
  status: number;
  statusText: string;
  timeMs: number;
  size: number;
  headers: [string, string][];
  body: string;
  isJson: boolean;
  truncated: boolean;
}

interface HistoryEntry {
  method: Method;
  url: string;
  ts: number;
}

const HISTORY_KEY = "iv_api_tester_history";
const MAX_BODY = 200_000;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = JSON.parse(raw ?? "[]") as HistoryEntry[];
    return Array.isArray(arr) ? arr.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function ApiTesterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("api-tester", isPro);
  const seo = getToolSeo("api-tester");

  const [method, setMethod] = useState<Method>("GET");
  const [url, setUrl] = useState("https://api.github.com/zen");
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: "", value: "" }]);
  const [bodyKind, setBodyKind] = useState<BodyKind>("none");
  const [body, setBody] = useState('{\n  "hello": "world"\n}');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const setHeader = (i: number, field: "key" | "value", v: string) =>
    setHeaders((p) => p.map((h, idx) => (idx === i ? { ...h, [field]: v } : h)));

  const send = useCallback(async () => {
    if (!url.trim() || busy || !trial.canUse) return;
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    setBusy(true);
    setError(null);
    setResponse(null);
    try {
      const reqHeaders: Record<string, string> = {};
      for (const h of headers) {
        if (h.key.trim()) reqHeaders[h.key.trim()] = h.value;
      }
      let reqBody: string | undefined;
      if (bodyKind !== "none" && method !== "GET" && method !== "HEAD") {
        reqBody = body;
        if (bodyKind === "json" && !reqHeaders["Content-Type"]) reqHeaders["Content-Type"] = "application/json";
        if (bodyKind === "form" && !reqHeaders["Content-Type"]) reqHeaders["Content-Type"] = "application/x-www-form-urlencoded";
        if (bodyKind === "text" && !reqHeaders["Content-Type"]) reqHeaders["Content-Type"] = "text/plain";
      }
      if (bodyKind === "json" && reqBody) {
        try {
          reqBody = JSON.stringify(JSON.parse(reqBody), null, 2);
        } catch {
          throw new Error("Request body is not valid JSON.");
        }
      }
      const started = performance.now();
      const res = await fetch(target, {
        method,
        headers: reqHeaders,
        ...(reqBody !== undefined ? { body: reqBody } : {}),
        signal: AbortSignal.timeout(30000),
      });
      const timeMs = Math.round(performance.now() - started);
      const raw = await res.text();
      const truncated = raw.length > MAX_BODY;
      const text = truncated ? raw.slice(0, MAX_BODY) : raw;
      let isJson = false;
      let pretty = text;
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("json") || text.trimStart().startsWith("{") || text.trimStart().startsWith("[")) {
        try {
          pretty = JSON.stringify(JSON.parse(text), null, 2);
          isJson = true;
        } catch {
          // not JSON after all
        }
      }
      const hdrs: [string, string][] = [];
      res.headers.forEach((v, k) => hdrs.push([k, v]));
      setResponse({
        status: res.status,
        statusText: res.statusText,
        timeMs,
        size: new Blob([raw]).size,
        headers: hdrs,
        body: pretty,
        isJson,
        truncated,
      });
      const entry: HistoryEntry = { method, url: target, ts: Date.now() };
      setHistory((p) => {
        const next = [entry, ...p.filter((h) => !(h.method === method && h.url === target))].slice(0, 20);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          // storage full or unavailable
        }
        return next;
      });
      trial.recordUse();
      toast.success(`HTTP ${res.status} in ${timeMs} ms`);
    } catch (e) {
      if (e instanceof TypeError) {
        setError(
          "Request failed: the server is unreachable or blocked the call. Most often this is CORS - browsers refuse cross-origin requests unless the server sends Access-Control-Allow-Origin headers. Try the URL with curl to confirm.",
        );
      } else {
        setError(e instanceof Error ? e.message : "Request failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [url, method, headers, bodyKind, body, busy, trial]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  }, []);

  const loadEntry = (h: HistoryEntry) => {
    setMethod(h.method);
    setUrl(h.url);
  };

  const statusColor =
    response == null
      ? ""
      : response.status < 300
        ? "text-green-500"
        : response.status < 400
          ? "text-blue-500"
          : response.status < 500
            ? "text-amber-500"
            : "text-red-500";

  return (
    <ToolPageShell toolId="api-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="API Tester" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">CORS limit, stated plainly:</span> this
          client runs in your browser, so it can only call APIs that permit browser requests
          (public APIs with CORS enabled, or same-origin URLs). A "Failed to fetch" error usually
          means the API blocks browsers, not that the API is down.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Request line</p>
            <div className="flex gap-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
                className="rounded-xl border border-border bg-background px-2.5 py-2.5 text-sm font-bold outline-none focus:border-primary/60"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
                spellCheck={false}
                placeholder="https://api.example.com/users"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Headers</p>
              <button
                type="button"
                onClick={() => setHeaders((p) => [...p, { key: "", value: "" }])}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={h.key}
                    onChange={(e) => setHeader(i, "key", e.target.value)}
                    placeholder="Header"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-primary/60"
                  />
                  <input
                    value={h.value}
                    onChange={(e) => setHeader(i, "value", e.target.value)}
                    placeholder="Value"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-primary/60"
                  />
                  <button
                    type="button"
                    onClick={() => setHeaders((p) => p.filter((_, idx) => idx !== i))}
                    className="rounded-lg border border-border px-2 text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
                    aria-label="Remove header"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Body</p>
            <div className="mb-2 flex gap-2">
              {(
                [
                  ["none", "None"],
                  ["json", "JSON"],
                  ["text", "Text"],
                  ["form", "Form"],
                ] as [BodyKind, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setBodyKind(k)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                    bodyKind === k
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {bodyKind !== "none" && (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                spellCheck={false}
                className="h-32 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/60"
              />
            )}
          </div>

          <ActionButton busy={busy} disabled={!url.trim() || !trial.canUse} onClick={send}>
            <Send className="h-4 w-4" /> {busy ? "Sending..." : "Send request"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free requests left.
            </p>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
                <History className="h-4 w-4" /> History
              </p>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sent requests show up here.</p>
            ) : (
              <ul className="max-h-44 space-y-1.5 overflow-auto">
                {history.map((h, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => loadEntry(h)}
                      className="flex w-full items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left transition hover:border-primary/40"
                    >
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                        {h.method}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">{h.url}</span>
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-[13px] font-medium text-foreground/80">Response</p>
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">{error}</p>}
          {!error && !response && (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <Send className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">No response yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Send a request to see the status, timing, headers and body here.
              </p>
            </div>
          )}
          {response && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className={cn("font-mono text-xl font-bold", statusColor)}>
                  {response.status} <span className="text-sm font-semibold">{response.statusText}</span>
                </span>
                <span className="text-sm text-muted-foreground">{response.timeMs} ms</span>
                <span className="text-sm text-muted-foreground">
                  {(response.size / 1024).toFixed(1)} KB{response.truncated ? " (truncated)" : ""}
                </span>
                {response.isJson && (
                  <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs font-bold text-green-600 dark:text-green-400">
                    JSON
                  </span>
                )}
              </div>
              {response.headers.length > 0 && (
                <details className="rounded-xl border border-border">
                  <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">
                    Response headers ({response.headers.length})
                  </summary>
                  <dl className="max-h-48 space-y-1 overflow-auto border-t border-border px-4 py-3 font-mono text-xs">
                    {response.headers.map(([k, v], i) => (
                      <div key={i} className="flex gap-2">
                        <dt className="shrink-0 font-bold text-primary">{k}:</dt>
                        <dd className="break-all text-muted-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Body</p>
                <pre className="max-h-[420px] overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed">
                  {response.body || "(empty body)"}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
