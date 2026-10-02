// /tools/curl-builder - Build a shell-safe cURL command from form
// fields, or paste one back in to edit it. 100% client-side, nothing
// is uploaded and no request is ever sent.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, Download, Info, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/curl-builder")({
  head: () => {
    const seo = getToolSeoMeta("curl-builder");
    const canonical = "https://iconvault.site/tools/curl-builder";
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
  component: CurlBuilderTool,
});

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const CONTENT_TYPES = [
  { id: "none", label: "No body" },
  { id: "application/json", label: "JSON" },
  { id: "application/x-www-form-urlencoded", label: "Form URL-encoded" },
  { id: "text/plain", label: "Plain text" },
] as const;
const AUTH_MODES = [
  { id: "none", label: "None" },
  { id: "basic", label: "Basic" },
  { id: "bearer", label: "Bearer token" },
] as const;

interface KV {
  id: number;
  k: string;
  v: string;
}

const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none";
const selectCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none";
const smallBtn =
  "flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50";

/** Wrap in single quotes, escaping embedded quotes the shell-safe way. */
const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

let kvId = 0;
const newKV = (): KV => ({ id: kvId++, k: "", v: "" });

function buildCurl(
  method: string,
  url: string,
  headers: KV[],
  params: KV[],
  body: string,
  contentType: string,
  auth: string,
  authUser: string,
  authPass: string,
  authToken: string,
): string {
  let fullUrl = url.trim();
  const qs = params
    .filter((p) => p.k.trim() || p.v.trim())
    .map((p) => `${encodeURIComponent(p.k)}=${encodeURIComponent(p.v)}`)
    .join("&");
  if (qs) fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;

  const lines = [`curl -X ${method} ${sh(fullUrl)}`];
  const hs = headers.filter((h) => h.k.trim());
  if (contentType !== "none") hs.push({ id: -1, k: "Content-Type", v: contentType });
  if (auth === "bearer" && authToken) hs.push({ id: -2, k: "Authorization", v: `Bearer ${authToken}` });
  for (const h of hs) lines.push(`  -H ${sh(`${h.k.trim()}: ${h.v}`)}`);
  if (auth === "basic") lines.push(`  -u ${sh(`${authUser}:${authPass}`)}`);
  if (body.trim()) lines.push(`  -d ${sh(body)}`);
  return lines.join(" \\\n");
}

/** Split a command line into tokens, honoring single/double quotes and backslash escapes. */
function tokenize(cmd: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  let i = 0;
  while (i < cmd.length) {
    const c = cmd[i] ?? "";
    if (quote) {
      if (quote === "'" && c === "'") quote = null;
      else if (quote === '"' && c === '"') quote = null;
      else if (c === "\\" && quote === '"') {
        cur += cmd[i + 1] ?? "";
        i++;
      } else cur += c;
    } else if (c === "'" || c === '"') {
      quote = c;
    } else if (c === "\\" && cmd[i + 1] === "\n") {
      i++; // line continuation
    } else if (/\s/.test(c)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
    } else cur += c;
    i++;
  }
  if (cur) out.push(cur);
  return out;
}

interface Parsed {
  method: string;
  url: string;
  headers: KV[];
  body: string;
  contentType: string;
  auth: string;
  authUser: string;
  authPass: string;
  authToken: string;
  notes: string[];
}

function parseCurl(cmd: string): Parsed {
  const tokens = tokenize(cmd.trim().replace(/^curl\s+/, ""));
  const p: Parsed = {
    method: "GET",
    url: "",
    headers: [],
    body: "",
    contentType: "none",
    auth: "none",
    authUser: "",
    authPass: "",
    authToken: "",
    notes: [],
  };
  let sawData = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i] ?? "";
    const next = () => tokens[++i] ?? "";
    if (t === "-X" || t === "--request") p.method = next().toUpperCase();
    else if (t === "-H" || t === "--header") {
      const raw = next();
      const idx = raw.indexOf(":");
      if (idx > 0) {
        const k = raw.slice(0, idx).trim();
        const v = raw.slice(idx + 1).trim();
        if (k.toLowerCase() === "content-type") p.contentType = v;
        else if (k.toLowerCase() === "authorization" && /^bearer\s+/i.test(v)) {
          p.auth = "bearer";
          p.authToken = v.replace(/^bearer\s+/i, "");
        } else p.headers.push({ id: kvId++, k, v });
      }
    } else if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary" || t === "--data-ascii") {
      p.body = next();
      sawData = true;
    } else if (t === "-u" || t === "--user") {
      const creds = next();
      const idx = creds.indexOf(":");
      p.auth = "basic";
      p.authUser = idx >= 0 ? creds.slice(0, idx) : creds;
      p.authPass = idx >= 0 ? creds.slice(idx + 1) : "";
    } else if (t === "--url") p.url = next();
    else if (t.startsWith("-")) p.notes.push(`Ignored flag: ${t}`);
    else if (!p.url && /^https?:\/\//i.test(t)) p.url = t;
  }
  if (sawData && p.method === "GET") p.method = "POST";
  return p;
}

function CurlBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("curl-builder", isPro);
  const seo = getToolSeo("curl-builder");

  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState("https://api.example.com/v1/items");
  const [headers, setHeaders] = useState<KV[]>([{ id: kvId++, k: "Accept", v: "application/json" }]);
  const [params, setParams] = useState<KV[]>([{ id: kvId++, k: "limit", v: "10" }]);
  const [body, setBody] = useState('{\n  "name": "widget"\n}');
  const [contentType, setContentType] = useState<string>("application/json");
  const [auth, setAuth] = useState<string>("none");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const command = useMemo(
    () => buildCurl(method, url, headers, params, body, contentType, auth, authUser, authPass, authToken),
    [method, url, headers, params, body, contentType, auth, authUser, authPass, authToken],
  );

  const kvRows = (
    list: KV[],
    setList: (v: KV[]) => void,
    kPh: string,
    vPh: string,
  ) => (
    <div className="space-y-2">
      {list.map((kv) => (
        <div key={kv.id} className="flex gap-2">
          <input value={kv.k} onChange={(e) => setList(list.map((x) => (x.id === kv.id ? { ...x, k: e.target.value } : x)))} placeholder={kPh} className={inputCls} />
          <input value={kv.v} onChange={(e) => setList(list.map((x) => (x.id === kv.id ? { ...x, v: e.target.value } : x)))} placeholder={vPh} className={inputCls} />
          <button
            type="button"
            onClick={() => setList(list.filter((x) => x.id !== kv.id))}
            aria-label="Remove row"
            className="shrink-0 rounded-lg border border-border px-2.5 text-red-500 hover:border-red-500/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setList([...list, newKV()])} className={smallBtn}>
        <Plus className="h-3.5 w-3.5" /> Add row
      </button>
    </div>
  );

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      trial.recordUse();
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([command + "\n"], { type: "text/x-shellscript" }), "request.sh");
    trial.recordUse();
    toast.success("Shell script downloaded");
  };

  const doImport = () => {
    setImportError(null);
    if (!importText.trim()) return;
    try {
      const p = parseCurl(importText);
      if (!p.url) throw new Error("No URL found in that command.");
      setMethod(p.method);
      setUrl(p.url);
      setHeaders(p.headers.length ? p.headers : []);
      setParams([]);
      setBody(p.body);
      setContentType(p.contentType);
      setAuth(p.auth);
      setAuthUser(p.authUser);
      setAuthPass(p.authPass);
      setAuthToken(p.authToken);
      trial.recordUse();
      toast.success("Command imported" + (p.notes.length ? ` (${p.notes.length} flag${p.notes.length === 1 ? "" : "s"} ignored)` : ""));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Could not parse that command.");
    }
  };

  return (
    <ToolPageShell toolId="curl-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="cURL Builder" left={trial.left} />

      <div className="space-y-5">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-[130px_1fr] gap-3">
              <div>
                <label className={labelCls} htmlFor="method-select">Method</label>
                <select id="method-select" value={method} onChange={(e) => setMethod(e.target.value)} className={selectCls}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="url-input">URL</label>
                <input id="url-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" spellCheck={false} className={inputCls} />
              </div>
            </div>

            <div>
              <p className={`${labelCls} mb-2`}>Headers</p>
              {kvRows(headers, setHeaders, "Header name", "value")}
            </div>

            <div>
              <p className={`${labelCls} mb-2`}>Query params</p>
              {kvRows(params, setParams, "name", "value")}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="ct-select">Body content type</label>
                <select id="ct-select" value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectCls}>
                  {CONTENT_TYPES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="auth-select">Auth</label>
                <select id="auth-select" value={auth} onChange={(e) => setAuth(e.target.value)} className={selectCls}>
                  {AUTH_MODES.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {contentType !== "none" && (
              <div>
                <label className={labelCls} htmlFor="body-input">Body</label>
                <textarea id="body-input" value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} rows={5} className={`${inputCls} resize-y`} />
              </div>
            )}

            {auth === "basic" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Username</label>
                  <input value={authUser} onChange={(e) => setAuthUser(e.target.value)} autoComplete="off" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <input type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} autoComplete="off" className={inputCls} />
                </div>
              </div>
            )}
            {auth === "bearer" && (
              <div>
                <label className={labelCls}>Bearer token</label>
                <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} autoComplete="off" spellCheck={false} className={inputCls} />
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-muted-foreground">
                Values are wrapped in single quotes with shell-safe escaping. The builder never sends a
                request; it only writes the command.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">Generated command</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    disabled={!trial.canUse || !url.trim()}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <ActionButton busy={false} disabled={!trial.canUse || !url.trim()} onClick={download}>
                    <Download className="h-4 w-4" /> .sh
                  </ActionButton>
                </div>
              </div>
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
                {command}
              </pre>
              {!isPro && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free copies/downloads left.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="mb-3 text-sm font-bold">Import an existing cURL command</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste a curl command here to load it back into the fields…"
                spellCheck={false}
                rows={5}
                className={`${inputCls} resize-y`}
              />
              {importError && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-500">
                  <AlertTriangle className="h-4 w-4" /> {importError}
                </p>
              )}
              <div className="mt-3">
                <ActionButton busy={false} disabled={!trial.canUse || !importText.trim()} onClick={doImport}>
                  Import into fields
                </ActionButton>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Basic parsing only: method, URL, headers, data, basic/bearer auth. Multipart uploads and
                exotic flags are not supported.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
