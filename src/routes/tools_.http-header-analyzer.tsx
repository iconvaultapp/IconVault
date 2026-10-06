// /tools/http-header-analyzer - Paste raw response headers (primary mode) or
// fetch a URL and inspect the headers the browser actually exposes. Parsed
// into a table with security-header flags. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Copy, FileSearch, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/http-header-analyzer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/http-header-analyzer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/http-header-analyzer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/http-header-analyzer";
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
  component: HeaderAnalyzer,
});

interface ParsedHeader { name: string; value: string }
interface Finding { level: "good" | "warn" | "info"; text: string }

function parseHeaders(raw: string): ParsedHeader[] {
  const out: ParsedHeader[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("HTTP/")) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    out.push({ name: trimmed.slice(0, idx).trim(), value: trimmed.slice(idx + 1).trim() });
  }
  return out;
}

function analyze(headers: ParsedHeader[]): Finding[] {
  const map = new Map<string, string[]>();
  for (const h of headers) {
    const k = h.name.toLowerCase();
    map.set(k, [...(map.get(k) ?? []), h.value]);
  }
  const has = (n: string) => map.has(n);
  const findings: Finding[] = [];

  if (has("strict-transport-security")) findings.push({ level: "good", text: "HSTS is set: browsers will only use HTTPS." });
  else findings.push({ level: "warn", text: "Missing Strict-Transport-Security: browsers may still fall back to HTTP." });

  const cto = (map.get("x-content-type-options") ?? [])[0]?.toLowerCase();
  if (cto === "nosniff") findings.push({ level: "good", text: "X-Content-Type-Options: nosniff is set: blocks MIME sniffing." });
  else findings.push({ level: "warn", text: "Missing or weak X-Content-Type-Options: set it to nosniff." });

  const csp = (map.get("content-security-policy") ?? [])[0];
  if (csp) findings.push({ level: "good", text: "Content-Security-Policy is set: limits where content can load from." });
  else findings.push({ level: "warn", text: "Missing Content-Security-Policy: the page is open to XSS and injection." });

  const xfo = has("x-frame-options");
  const frameAncestors = csp?.toLowerCase().includes("frame-ancestors");
  if (xfo || frameAncestors) findings.push({ level: "good", text: "Framing is controlled (X-Frame-Options or CSP frame-ancestors)." });
  else findings.push({ level: "warn", text: "Missing X-Frame-Options / frame-ancestors: the page can be iframed (clickjacking)." });

  if (has("referrer-policy")) findings.push({ level: "good", text: `Referrer-Policy is set: ${(map.get("referrer-policy") ?? [])[0]}.` });
  else findings.push({ level: "info", text: "Missing Referrer-Policy: browsers will use the default referrer behavior." });

  if (has("permissions-policy")) findings.push({ level: "good", text: "Permissions-Policy is set: browser features are locked down." });
  else findings.push({ level: "info", text: "Missing Permissions-Policy: consider restricting camera, mic and geolocation." });

  for (const cookie of map.get("set-cookie") ?? []) {
    const low = cookie.toLowerCase();
    if (!low.includes("secure")) findings.push({ level: "warn", text: "A Set-Cookie is missing the Secure flag." });
    if (!low.includes("httponly")) findings.push({ level: "info", text: "A Set-Cookie is missing HttpOnly: JS can read it." });
    if (!low.includes("samesite")) findings.push({ level: "info", text: "A Set-Cookie is missing SameSite: CSRF protection is weaker." });
  }

  if (has("server")) findings.push({ level: "info", text: `Server header reveals: ${(map.get("server") ?? [])[0]}. Consider hiding version details.` });
  if (has("x-powered-by")) findings.push({ level: "info", text: `X-Powered-By reveals: ${(map.get("x-powered-by") ?? [])[0]}. Safe to remove.` });

  return findings;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

const FINDING_STYLE: Record<Finding["level"], string> = {
  good: "border-emerald-500/30 bg-emerald-500/5",
  warn: "border-amber-500/30 bg-amber-500/5",
  info: "border-sky-500/30 bg-sky-500/5",
};

const FINDING_ICON: Record<Finding["level"], typeof CheckCircle2> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  info: Info,
};

const FINDING_TEXT: Record<Finding["level"], string> = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  info: "text-sky-600",
};

function HeaderAnalyzer() {
  const { isPro } = usePlan();
  const trial = useToolTrial("http-header-analyzer", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<"paste" | "url">("paste");
  const [raw, setRaw] = useState("");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<ParsedHeader[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findings = useMemo(() => (headers ? analyze(headers) : []), [headers]);

  const analyzePaste = () => {
    if (!trial.canUse) return;
    const parsed = parseHeaders(raw);
    if (parsed.length === 0) {
      setHeaders(null);
      setError("Paste at least one header line in the form Name: Value.");
      return;
    }
    setError(null);
    setHeaders(parsed);
    trial.recordUse();
    toast.success(`${parsed.length} headers parsed`);
  };

  const fetchUrl = async () => {
    if (!trial.canUse || busy) return;
    let target = url.trim();
    if (!target) {
      setError("Enter a URL to fetch.");
      return;
    }
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
    setBusy(true);
    setError(null);
    setHeaders(null);
    try {
      const res = await fetch(target, { method: "HEAD" });
      const list: ParsedHeader[] = [];
      res.headers.forEach((value, name) => list.push({ name, value }));
      setHeaders(list);
      trial.recordUse();
      toast.success("Headers fetched");
    } catch {
      setError("Fetch failed. The site may block cross-origin requests; use Paste mode instead.");
    } finally {
      setBusy(false);
    }
  };

  const copyTable = () => {
    if (!headers) return;
    void copy(headers.map((h) => `${h.name}: ${h.value}`).join("\n"), "Header table");
  };

  return (
    <ToolPageShell toolId="http-header-analyzer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Header Analyzer" left={trial.left} />

      <div className="mb-4 flex gap-2">
        {(["paste", "url"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setHeaders(null); setError(null); }}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-bold transition",
              mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {m === "paste" ? "Paste headers" : "Fetch from URL"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {mode === "paste" ? (
            <>
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Raw response headers</p>
                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder={"content-type: text/html; charset=utf-8\nstrict-transport-security: max-age=31536000\nx-frame-options: DENY"}
                  rows={10}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-[13px] outline-none focus:border-primary"
                />
              </div>
              <ActionButton disabled={!trial.canUse || !raw.trim()} onClick={analyzePaste}>
                <FileSearch className="h-4 w-4" /> Analyze
              </ActionButton>
            </>
          ) : (
            <>
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">URL to inspect</p>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void fetchUrl(); }}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary"
                />
              </div>
              <ActionButton busy={busy} disabled={!trial.canUse || !url.trim()} onClick={() => void fetchUrl()}>
                <FileSearch className="h-4 w-4" /> {busy ? "Fetching…" : "Fetch headers"}
              </ActionButton>
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-xs leading-relaxed text-sky-900 dark:text-sky-200">
                Browsers hide most headers cross-origin, so URL mode only shows what the browser exposes. For a full analysis, copy the raw headers from your browser devtools Network tab and paste them here.
              </div>
            </>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {!headers ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileSearch className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Security audit your headers</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Paste raw response headers to get a clean table plus flags for missing HSTS, CSP, X-Frame-Options and more.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{headers.length} headers</p>
                <button
                  type="button"
                  onClick={copyTable}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy table
                </button>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">Security findings</p>
                <div className="space-y-2">
                  {findings.map((f, i) => {
                    const Icon = FINDING_ICON[f.level];
                    return (
                      <div key={i} className={cn("flex items-start gap-2.5 rounded-xl border p-3", FINDING_STYLE[f.level])}>
                        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", FINDING_TEXT[f.level])} />
                        <p className="text-[13px]">{f.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Header</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] font-bold">{h.name}</td>
                        <td className="max-w-[380px] break-all px-4 py-2.5 font-mono text-[13px] text-muted-foreground">{h.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
