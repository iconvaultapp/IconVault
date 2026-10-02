// /tools/cors-tester - Test what a URL's CORS policy allows from your
// browser, with a preflight explainer and server config snippets. Honest
// about the limits: CORS is browser-enforced, this tool can only observe.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Globe, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/cors-tester")({
  head: () => {
    const seo = getToolSeoMeta("cors-tester");
    const canonical = "https://iconvault.site/tools/cors-tester";
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
  component: CorsTesterTool,
});

type Outcome =
  | { kind: "success"; status: number; statusText: string; headers: string[]; ms: number }
  | { kind: "blocked"; ms: number }
  | { kind: "timeout"; ms: number }
  | { kind: "invalid"; message: string };

type SnippetTab = "express" | "nginx" | "apache";

function snippet(tab: SnippetTab, origin: string): string {
  const o = origin || "https://your-site.com";
  if (tab === "express") {
    return `// npm install cors\nimport cors from "cors";\n\napp.use(cors({\n  origin: "${o}",\n  methods: ["GET", "POST", "PUT", "DELETE"],\n  allowedHeaders: ["Content-Type", "Authorization"],\n  credentials: true,\n}));`;
  }
  if (tab === "nginx") {
    return `location /api/ {\n  add_header 'Access-Control-Allow-Origin' '${o}' always;\n  add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;\n  add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;\n  add_header 'Access-Control-Allow-Credentials' 'true' always;\n\n  if ($request_method = 'OPTIONS') {\n    return 204;\n  }\n}`;
  }
  return `<IfModule mod_headers.c>\n  Header always set Access-Control-Allow-Origin "${o}"\n  Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"\n  Header always set Access-Control-Allow-Headers "Content-Type, Authorization"\n  Header always set Access-Control-Allow-Credentials "true"\n</IfModule>`;
}

function originOf(raw: string): string {
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function CorsTesterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("cors-tester", isPro);
  const seo = getToolSeo("cors-tester");

  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [snippetTab, setSnippetTab] = useState<SnippetTab>("express");
  const [copied, setCopied] = useState(false);

  const runTest = async () => {
    const target = url.trim();
    if (!trial.canUse || busy || !target) return;
    let parsed: URL;
    try {
      parsed = new URL(target);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
    } catch {
      setOutcome({ kind: "invalid", message: "Enter a full http(s) URL, e.g. https://api.example.com/data." });
      return;
    }
    setBusy(true);
    setOutcome(null);
    const started = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(parsed.toString(), { method, mode: "cors", signal: ctrl.signal });
      const headers: string[] = [];
      res.headers.forEach((v, k) => headers.push(`${k}: ${v}`));
      setOutcome({
        kind: "success",
        status: res.status,
        statusText: res.statusText,
        headers,
        ms: Math.round(performance.now() - started),
      });
      trial.recordUse();
      toast.success("Request completed");
    } catch (e) {
      const ms = Math.round(performance.now() - started);
      if (e instanceof DOMException && e.name === "AbortError") {
        setOutcome({ kind: "timeout", ms });
      } else {
        setOutcome({ kind: "blocked", ms });
      }
      trial.recordUse();
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet(snippetTab, originOf(url.trim())));
      setCopied(true);
      toast.success("Snippet copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed.");
    }
  };

  const snippetTabs: { id: SnippetTab; label: string }[] = [
    { id: "express", label: "Express" },
    { id: "nginx", label: "Nginx" },
    { id: "apache", label: "Apache" },
  ];

  return (
    <ToolPageShell toolId="cors-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CORS Tester" left={trial.left} />

      <div className="mb-6 flex gap-3 rounded-2xl border border-amber-400/40 bg-amber-50 p-4 text-sm leading-relaxed dark:bg-amber-950/20">
        <Info className="h-5 w-5 shrink-0 text-amber-500" />
        <p>
          <strong className="font-bold">How to read this tool:</strong> CORS is enforced by your
          browser, not by the server. This page can only observe what the browser allowed or blocked.
          Browsers deliberately hide the reason for a failed request, so a CORS block and a network
          error look identical here. If a URL loads in a new tab but fails this test, it is being
          blocked by CORS.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-sm font-bold">URL to test</label>
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setOutcome(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") void runTest(); }}
              placeholder="https://api.example.com/data"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Method</p>
            <div className="flex gap-2">
              {(["GET", "POST"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-xl border px-4 py-2 font-mono text-sm font-bold transition",
                    method === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={!trial.canUse || !url.trim()} onClick={() => void runTest()}>
            <Globe className="h-4 w-4" /> {busy ? "Sending…" : "Run CORS test"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free tests left.
            </p>
          )}

          <div className="rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-bold text-foreground">When does the browser preflight?</p>
            <p>
              Simple GET/POST requests go straight out. Anything else (PUT, DELETE, custom headers,
              JSON content types) first sends an <code className="font-mono">OPTIONS</code> preflight.
              The server must answer it with{" "}
              <code className="font-mono">Access-Control-Allow-Origin</code> and the matching methods
              and headers, or the real request never leaves the browser.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Result</p>
            {!outcome ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                <Globe className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">No test run yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Enter a URL and run the test to see what your browser allows.
                </p>
              </div>
            ) : outcome.kind === "invalid" ? (
              <p className="text-sm font-medium text-red-500">{outcome.message}</p>
            ) : outcome.kind === "success" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-green-500/10 px-3 py-1.5 font-mono text-sm font-bold text-green-600">
                    {outcome.status} {outcome.statusText}
                  </span>
                  <span className="text-xs text-muted-foreground">{outcome.ms} ms</span>
                </div>
                <p className="text-sm leading-relaxed">
                  The browser <strong className="font-bold">allowed</strong> this request, so the
                  server's CORS policy permits your origin (or the resource needed no CORS check).
                </p>
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Response headers visible to JavaScript:
                  </p>
                  {outcome.headers.length > 0 ? (
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-3 font-mono text-[12px]">
                      {outcome.headers.join("\n")}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      None exposed. Servers only expose safelisted headers plus whatever they list in{" "}
                      <code className="font-mono">Access-Control-Expose-Headers</code>.
                    </p>
                  )}
                </div>
              </div>
            ) : outcome.kind === "timeout" ? (
              <div className="space-y-2">
                <p className="font-bold text-amber-500">Request timed out after 15 seconds</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The server did not answer in time. This is a network or server issue, not something
                  CORS headers can fix.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-bold text-red-500">Request failed ({outcome.ms} ms)</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The browser blocked the request or it never reached the server. The two look
                  identical by design: if the same URL loads fine in a new tab, the server is up and
                  this is a <strong className="font-bold">CORS block</strong>. The fix lives on the
                  server, use one of the snippets below.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold">Server-side fix snippets</p>
              <div className="flex gap-2">
                {snippetTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSnippetTab(t.id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      snippetTab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-[12px] leading-relaxed">
              {snippet(snippetTab, originOf(url.trim()))}
            </pre>
            <button
              type="button"
              onClick={() => void copySnippet()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy snippet"}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Replace the origin with your frontend's real origin. Never use * together with credentials.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
