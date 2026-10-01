// /tools/http-header-builder - Pick common request headers, add custom ones,
// validate the names and copy a raw header block. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ListPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/http-header-builder")({
  head: () => {
    const seo = getToolSeoMeta("http-header-builder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: HeaderBuilderTool,
});

interface Preset {
  name: string;
  value: string;
  hint: string;
}

const PRESETS: Preset[] = [
  { name: "Accept", value: "application/json", hint: "Media types the client accepts" },
  { name: "Accept-Language", value: "en-US,en;q=0.9", hint: "Preferred languages" },
  { name: "Accept-Encoding", value: "gzip, deflate, br", hint: "Accepted content codings" },
  { name: "Authorization", value: "Bearer <token>", hint: "Credentials for the request" },
  { name: "Cache-Control", value: "no-cache", hint: "Caching directives" },
  { name: "Connection", value: "keep-alive", hint: "Connection handling" },
  { name: "Content-Type", value: "application/json", hint: "Body media type" },
  { name: "Content-Length", value: "348", hint: "Body size in bytes" },
  { name: "Cookie", value: "session_id=abc123", hint: "Stored cookies" },
  { name: "Host", value: "api.example.com", hint: "Target host and port" },
  { name: "User-Agent", value: "IconVault/1.0", hint: "Client software identity" },
  { name: "Referer", value: "https://example.com/page", hint: "Referring page URL" },
  { name: "Origin", value: "https://example.com", hint: "Request origin (CORS)" },
  { name: "If-None-Match", value: '"etag-value"', hint: "Conditional request ETag" },
  { name: "If-Modified-Since", value: "Wed, 21 Oct 2015 07:28:00 GMT", hint: "Conditional request date" },
  { name: "Range", value: "bytes=0-1023", hint: "Partial content range" },
  { name: "X-Requested-With", value: "XMLHttpRequest", hint: "AJAX marker" },
  { name: "X-Api-Key", value: "<your-api-key>", hint: "API key header" },
  { name: "X-Request-Id", value: "<uuid>", hint: "Request correlation id" },
  { name: "X-Forwarded-For", value: "203.0.113.42", hint: "Original client IP" },
  { name: "DNT", value: "1", hint: "Do Not Track" },
  { name: "Upgrade-Insecure-Requests", value: "1", hint: "Prefer HTTPS" },
  { name: "Sec-Fetch-Site", value: "same-origin", hint: "Fetch metadata" },
  { name: "Sec-Fetch-Mode", value: "cors", hint: "Fetch metadata" },
  { name: "TE", value: "trailers", hint: "Transfer encodings accepted" },
];

// Broader set of real header names: anything in PRESETS or here is "known".
const KNOWN = new Set(
  [
    ...PRESETS.map((p) => p.name),
    "Accept-Charset", "Accept-Datetime", "Accept-Patch", "Accept-Post", "Accept-Ranges",
    "Access-Control-Allow-Credentials", "Access-Control-Allow-Headers", "Access-Control-Allow-Methods",
    "Access-Control-Allow-Origin", "Access-Control-Expose-Headers", "Access-Control-Max-Age",
    "Access-Control-Request-Headers", "Access-Control-Request-Method", "Age", "Allow", "Alt-Svc",
    "Authorization", "Content-Disposition", "Content-Encoding", "Content-Language", "Content-Location",
    "Content-Range", "Content-Security-Policy", "Content-Type", "Date", "ETag", "Expect", "Expires",
    "Forwarded", "From", "If-Match", "If-Range", "If-Unmodified-Since", "Last-Modified", "Link",
    "Location", "Max-Forwards", "Pragma", "Prefer", "Preference-Applied", "Proxy-Authenticate",
    "Proxy-Authorization", "Public-Key-Pins", "Retry-After", "Sec-Fetch-Dest", "Sec-Fetch-User",
    "Sec-WebSocket-Key", "Sec-WebSocket-Version", "Server", "Set-Cookie", "Strict-Transport-Security",
    "Trailer", "Transfer-Encoding", "Upgrade", "Vary", "Via", "WWW-Authenticate", "Warning",
    "X-Content-Type-Options", "X-Frame-Options", "X-Powered-By", "X-Real-IP", "X-XSS-Protection",
    "X-Correlation-ID", "X-Tenant-Id", "X-Client-Version", "X-Device-Id", "X-Session-Id",
  ].map((n) => n.toLowerCase()),
);

interface Row {
  id: number;
  key: string;
  value: string;
}

let nextId = 1;
// RFC 7230 token: tchar
const TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function HeaderBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("http-header-builder", isPro);
  const seo = getToolSeo("http-header-builder");

  const [rows, setRows] = useState<Row[]>([
    { id: nextId++, key: "Content-Type", value: "application/json" },
    { id: nextId++, key: "Accept", value: "application/json" },
  ]);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");

  const selected = useMemo(() => new Set(rows.map((r) => r.key.toLowerCase())), [rows]);

  const addPreset = (p: Preset) => {
    if (selected.has(p.name.toLowerCase())) {
      setRows((rs) => rs.filter((r) => r.key.toLowerCase() !== p.name.toLowerCase()));
    } else {
      setRows((rs) => [...rs, { id: nextId++, key: p.name, value: p.value }]);
    }
  };

  const addCustom = () => {
    const key = customKey.trim();
    if (!key) {
      toast.error("Enter a header name first");
      return;
    }
    if (selected.has(key.toLowerCase())) {
      toast.error("That header is already in the block");
      return;
    }
    setRows((rs) => [...rs, { id: nextId++, key, value: customValue }]);
    setCustomKey("");
    setCustomValue("");
  };

  const validation = useMemo(
    () =>
      rows.map((r) => {
        if (!TOKEN_RE.test(r.key)) return { level: "error" as const, msg: "Not a valid header name (illegal characters)" };
        if (!KNOWN.has(r.key.toLowerCase())) return { level: "warn" as const, msg: "Unknown header - check the spelling or that your server supports it" };
        return { level: "ok" as const, msg: "" };
      }),
    [rows],
  );

  const block = rows.map((r) => `${r.key}: ${r.value}`).join("\n");

  const copy = () => {
    if (!trial.canUse || rows.length === 0) return;
    void navigator.clipboard.writeText(block).then(() => {
      trial.recordUse();
      toast.success("Header block copied");
    });
  };

  return (
    <ToolPageShell toolId="http-header-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Header Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Common request headers - click to add or remove</p>
            <div className="flex max-h-[300px] flex-wrap gap-2 overflow-auto">
              {PRESETS.map((p) => {
                const on = selected.has(p.name.toLowerCase());
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => addPreset(p)}
                    title={p.hint}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-semibold transition",
                      on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Custom header</p>
            <div className="flex gap-2">
              <input
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="X-Custom-Header"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-primary"
              />
              <input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="value"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-primary"
              />
              <button type="button" onClick={addCustom} className="shrink-0 rounded-xl border border-border px-3 text-primary transition hover:border-primary/40" title="Add custom header">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Your header block ({rows.length})</p>
            <ActionButton busy={false} disabled={rows.length === 0 || !trial.canUse} onClick={copy}>
              <Copy className="h-4 w-4" /> Copy block
            </ActionButton>
          </div>

          {rows.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <ListPlus className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">No headers yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Click headers on the left or add your own custom rows.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={r.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={r.key}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, key: e.target.value } : x)))}
                      className="w-2/5 rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-xs outline-none focus:border-primary"
                    />
                    <input
                      value={r.value}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))}
                      placeholder="value"
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-xs outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {validation[i]?.level !== "ok" && validation[i] != null && (
                    <p className={cn("mt-1.5 text-xs font-semibold", validation[i]?.level === "error" ? "text-red-500" : "text-amber-500")}>
                      {validation[i]?.msg}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Raw block</p>
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed">
                {block}
              </pre>
            </div>
          )}
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - header names are validated against RFC 7230, entirely in your browser.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
