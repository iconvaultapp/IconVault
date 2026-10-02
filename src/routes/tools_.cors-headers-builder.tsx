// /tools/cors-headers-builder - Visual CORS config generator with presets
// and ready-to-paste server code (Express, raw headers, Nginx, Apache,
// Cloudflare Workers). 100% in-browser.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Lock, ShieldCheck, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/cors-headers-builder")({
  head: () => {
    const seo = getToolSeoMeta("cors-headers-builder");
    const canonical = "https://iconvault.site/tools/cors-headers-builder";
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
  component: CorsHeadersBuilderTool,
});

const ALL_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

interface Preset {
  name: string;
  hint: string;
  origins: string;
  methods: string[];
  allowedHeaders: string;
  exposedHeaders: string;
  credentials: boolean;
  maxAge: number;
}

const PRESETS: Preset[] = [
  {
    name: "Public API",
    hint: "Anyone can read, no cookies",
    origins: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: "Content-Type, Authorization",
    exposedHeaders: "",
    credentials: false,
    maxAge: 86400,
  },
  {
    name: "Single-page app",
    hint: "Your frontend with cookies",
    origins: "https://app.example.com",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: "Content-Type, Authorization",
    exposedHeaders: "X-Total-Count",
    credentials: true,
    maxAge: 86400,
  },
  {
    name: "Locked down",
    hint: "Read-only from one origin",
    origins: "https://www.example.com",
    methods: ["GET", "HEAD", "OPTIONS"],
    allowedHeaders: "Content-Type",
    exposedHeaders: "",
    credentials: false,
    maxAge: 3600,
  },
];

function cleanList(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function CorsHeadersBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("cors-headers-builder", isPro);
  const seo = getToolSeo("cors-headers-builder");

  const [origins, setOrigins] = useState("https://app.example.com");
  const [methods, setMethods] = useState<string[]>(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
  const [allowedHeaders, setAllowedHeaders] = useState("Content-Type, Authorization");
  const [exposedHeaders, setExposedHeaders] = useState("");
  const [credentials, setCredentials] = useState(true);
  const [maxAge, setMaxAge] = useState(86400);
  const [generated, setGenerated] = useState(false);
  const [busy, setBusy] = useState(false);

  const applyPreset = (p: Preset) => {
    setOrigins(p.origins);
    setMethods(p.methods);
    setAllowedHeaders(p.allowedHeaders);
    setExposedHeaders(p.exposedHeaders);
    setCredentials(p.credentials);
    setMaxAge(p.maxAge);
    setGenerated(false);
    toast.success(`Preset applied: ${p.name}`);
  };

  const toggleMethod = (m: string) =>
    setMethods((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  const originList = useMemo(() => cleanList(origins), [origins]);
  const allowList = useMemo(() => cleanList(allowedHeaders), [allowedHeaders]);
  const exposeList = useMemo(() => cleanList(exposedHeaders), [exposedHeaders]);
  const wildcard = originList.length === 1 && originList[0] === "*";
  const credConflict = wildcard && credentials;

  const snippets = useMemo(() => {
    if (!generated) return null;
    const originHeader = wildcard ? "*" : originList.join(", ");
    const methodHeader = methods.join(", ");
    const allowHeader = allowList.join(", ");
    const exposeHeader = exposeList.join(", ");
    const credHeader = credentials ? "true" : "false";

    const express = `import cors from "cors";

app.use(
  cors({
    origin: ${wildcard ? '"*"' : JSON.stringify(originList, null, 2)},
    methods: ${JSON.stringify(methods)},
    allowedHeaders: ${JSON.stringify(allowList)},
    exposedHeaders: ${JSON.stringify(exposeList)},
    credentials: ${credHeader},
    maxAge: ${maxAge},
  })
);`;

    const raw = [
      `Access-Control-Allow-Origin: ${originHeader}`,
      `Access-Control-Allow-Methods: ${methodHeader}`,
      `Access-Control-Allow-Headers: ${allowHeader}`,
      ...(exposeHeader ? [`Access-Control-Expose-Headers: ${exposeHeader}`] : []),
      `Access-Control-Allow-Credentials: ${credHeader}`,
      `Access-Control-Max-Age: ${maxAge}`,
      "Vary: Origin",
    ].join("\n");

    const nginx = `location /api/ {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '${originHeader}' always;
        add_header 'Access-Control-Allow-Methods' '${methodHeader}' always;
        add_header 'Access-Control-Allow-Headers' '${allowHeader}' always;
        add_header 'Access-Control-Allow-Credentials' '${credHeader}' always;
        add_header 'Access-Control-Max-Age' ${maxAge} always;
        add_header 'Content-Length' 0;
        add_header 'Content-Type' 'text/plain';
        return 204;
    }
    add_header 'Access-Control-Allow-Origin' '${originHeader}' always;
    add_header 'Access-Control-Allow-Methods' '${methodHeader}' always;
    add_header 'Access-Control-Allow-Headers' '${allowHeader}' always;
    add_header 'Access-Control-Allow-Credentials' '${credHeader}' always;
    ${exposeHeader ? `add_header 'Access-Control-Expose-Headers' '${exposeHeader}' always;\n    ` : ""}proxy_pass http://localhost:3000;
}`;

    const apache = `<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "${originHeader}"
    Header always set Access-Control-Allow-Methods "${methodHeader}"
    Header always set Access-Control-Allow-Headers "${allowHeader}"
    Header always set Access-Control-Allow-Credentials "${credHeader}"
    Header always set Access-Control-Max-Age "${maxAge}"
    ${exposeHeader ? `Header always set Access-Control-Expose-Headers "${exposeHeader}"\n    ` : ""}Header always set Vary "Origin"
</IfModule>`;

    const worker = `const corsHeaders = {
  "Access-Control-Allow-Origin": "${originHeader}",
  "Access-Control-Allow-Methods": "${methodHeader}",
  "Access-Control-Allow-Headers": "${allowHeader}",
  "Access-Control-Allow-Credentials": "${credHeader}",
  "Access-Control-Max-Age": "${maxAge}",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const res = await fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(corsHeaders)) out.headers.set(k, v);
    return out;
  },
};`;

    return [
      { title: "Express (cors middleware)", code: express, lang: "js" },
      { title: "Raw response headers", code: raw, lang: "http" },
      { title: "Nginx", code: nginx, lang: "nginx" },
      { title: "Apache (.htaccess)", code: apache, lang: "apache" },
      { title: "Cloudflare Worker", code: worker, lang: "js" },
    ];
  }, [generated, wildcard, originList, methods, allowList, exposeList, credentials, maxAge]);

  const generate = useCallback(() => {
    if (busy || !trial.canUse) return;
    if (originList.length === 0) {
      toast.error("Add at least one allowed origin (or *).");
      return;
    }
    if (methods.length === 0) {
      toast.error("Select at least one HTTP method.");
      return;
    }
    setBusy(true);
    try {
      setGenerated(true);
      trial.recordUse();
      toast.success("CORS config generated");
    } finally {
      setBusy(false);
    }
  }, [busy, trial, originList, methods]);

  const copy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed in this browser.");
    }
  }, []);

  return (
    <ToolPageShell toolId="cors-headers-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CORS Headers Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Start from a preset</p>
            <div className="grid gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-xl border border-border px-3.5 py-2.5 text-left transition hover:border-primary/40"
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <Wand2 className="h-3.5 w-3.5 text-primary" /> {p.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Allowed origins (one per line, or *)</p>
            <textarea
              value={origins}
              onChange={(e) => setOrigins(e.target.value)}
              spellCheck={false}
              rows={3}
              className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary/60"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Allowed methods</p>
            <div className="flex flex-wrap gap-2">
              {ALL_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMethod(m)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition",
                    methods.includes(m)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Allowed request headers</p>
            <input
              value={allowedHeaders}
              onChange={(e) => setAllowedHeaders(e.target.value)}
              spellCheck={false}
              placeholder="Content-Type, Authorization"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-primary/60"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Exposed headers (optional)</p>
            <input
              value={exposedHeaders}
              onChange={(e) => setExposedHeaders(e.target.value)}
              spellCheck={false}
              placeholder="X-Total-Count"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-primary/60"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Allow credentials</p>
              <p className="text-xs text-muted-foreground">Cookies and Authorization headers</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={credentials}
              onClick={() => setCredentials((v) => !v)}
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                credentials ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  credentials ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              Preflight cache (max-age, seconds): <span className="font-bold">{maxAge}</span>
            </p>
            <input
              type="range"
              min={0}
              max={86400}
              step={300}
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {credConflict && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              Browsers reject <span className="font-mono">Access-Control-Allow-Credentials: true</span> with a
              wildcard origin. Use an explicit origin list with credentials.
            </p>
          )}

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={generate}>
            <ShieldCheck className="h-4 w-4" /> {busy ? "Generating..." : "Generate config"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {!snippets ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
              <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your CORS config appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a preset or tune the options, then generate copy-paste server code.
              </p>
            </div>
          ) : (
            snippets.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground/80">{s.title}</p>
                  <button
                    type="button"
                    onClick={() => copy(s.code, s.title)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:border-primary/40"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed">
                  {s.code}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
