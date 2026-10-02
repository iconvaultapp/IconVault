// /tools/http-method-reference - HTTP methods reference with a live request
// builder: pick a method, URL, headers and body; get fetch() + curl snippets.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Network } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/http-method-reference")({
  head: () => {
    const seo = getToolSeoMeta("http-method-reference");
    const canonical = "https://iconvault.site/tools/http-method-reference";
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
  component: HttpMethodTool,
});

interface MethodDef {
  id: string;
  color: string;
  safe: boolean;
  idempotent: boolean;
  cacheable: boolean;
  hasBody: boolean;
  oneLiner: string;
  useWhen: string;
  exampleReq: string;
  exampleRes: string;
}

const METHODS: MethodDef[] = [
  {
    id: "GET",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
    safe: true, idempotent: true, cacheable: true, hasBody: false,
    oneLiner: "Retrieve a representation of a resource. Never changes server state.",
    useWhen: "Fetching data, search pages, any read-only operation. Put parameters in the query string, not a body.",
    exampleReq: "GET /api/products?page=2&limit=20 HTTP/1.1\nHost: shop.example.com\nAccept: application/json",
    exampleRes: "HTTP/1.1 200 OK\nContent-Type: application/json\n\n{ \"items\": [ ... ], \"total\": 412 }",
  },
  {
    id: "POST",
    color: "text-sky-600 bg-sky-500/10 border-sky-500/30",
    safe: false, idempotent: false, cacheable: false, hasBody: true,
    oneLiner: "Create a subordinate resource or trigger processing. Not idempotent: repeating it creates duplicates.",
    useWhen: "Creating resources, submitting forms, starting jobs, any action where repeats must not be assumed safe.",
    exampleReq: "POST /api/orders HTTP/1.1\nHost: shop.example.com\nContent-Type: application/json\n\n{ \"productId\": \"p-42\", \"qty\": 2 }",
    exampleRes: "HTTP/1.1 201 Created\nLocation: /api/orders/ord-9001\n\n{ \"id\": \"ord-9001\", \"status\": \"pending\" }",
  },
  {
    id: "PUT",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
    safe: false, idempotent: true, cacheable: false, hasBody: true,
    oneLiner: "Replace the entire resource at the URI. Repeating it has the same effect as doing it once.",
    useWhen: "Full updates where the client knows the complete new state, e.g. saving a settings document.",
    exampleReq: "PUT /api/users/u-7/profile HTTP/1.1\nHost: app.example.com\nContent-Type: application/json\n\n{ \"name\": \"Ava\", \"bio\": \"Designer\", \"theme\": \"dark\" }",
    exampleRes: "HTTP/1.1 200 OK\n\n{ \"name\": \"Ava\", \"bio\": \"Designer\", \"theme\": \"dark\" }",
  },
  {
    id: "PATCH",
    color: "text-violet-600 bg-violet-500/10 border-violet-500/30",
    safe: false, idempotent: false, cacheable: false, hasBody: true,
    oneLiner: "Apply a partial change to a resource. Only the fields you send are modified.",
    useWhen: "Partial updates, e.g. toggling one setting or renaming one field without resending the whole object.",
    exampleReq: "PATCH /api/users/u-7 HTTP/1.1\nHost: app.example.com\nContent-Type: application/json\n\n{ \"theme\": \"light\" }",
    exampleRes: "HTTP/1.1 200 OK\n\n{ \"name\": \"Ava\", \"bio\": \"Designer\", \"theme\": \"light\" }",
  },
  {
    id: "DELETE",
    color: "text-red-600 bg-red-500/10 border-red-500/30",
    safe: false, idempotent: true, cacheable: false, hasBody: false,
    oneLiner: "Remove the resource. Idempotent: deleting twice still leaves it deleted.",
    useWhen: "Removing resources. Return 204 with no body, or 200 with a confirmation payload.",
    exampleReq: "DELETE /api/orders/ord-9001 HTTP/1.1\nHost: shop.example.com",
    exampleRes: "HTTP/1.1 204 No Content",
  },
  {
    id: "HEAD",
    color: "text-slate-600 bg-slate-500/10 border-slate-500/30",
    safe: true, idempotent: true, cacheable: true, hasBody: false,
    oneLiner: "Same as GET but returns headers only. Checks existence, size and freshness cheaply.",
    useWhen: "Probing whether a resource changed (ETag, Last-Modified), link checkers, download managers.",
    exampleReq: "HEAD /files/report.pdf HTTP/1.1\nHost: cdn.example.com",
    exampleRes: "HTTP/1.1 200 OK\nContent-Length: 4821133\nETag: \"9f2c\"\nLast-Modified: Tue, 29 Sep 2026 09:12:00 GMT",
  },
  {
    id: "OPTIONS",
    color: "text-teal-600 bg-teal-500/10 border-teal-500/30",
    safe: true, idempotent: true, cacheable: false, hasBody: false,
    oneLiner: "Ask what the server supports. Powers every CORS preflight request.",
    useWhen: "CORS preflights, API capability discovery, tooling that needs the Allow header.",
    exampleReq: "OPTIONS /api/orders HTTP/1.1\nHost: shop.example.com\nOrigin: https://app.example.com\nAccess-Control-Request-Method: POST",
    exampleRes: "HTTP/1.1 204 No Content\nAllow: GET, POST, OPTIONS\nAccess-Control-Allow-Origin: https://app.example.com\nAccess-Control-Allow-Methods: GET, POST",
  },
];

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-bold",
        on ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {label}: {on ? "yes" : "no"}
    </span>
  );
}

function HttpMethodTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("http-method-reference", isPro);
  const seo = getToolSeo("http-method-reference");

  const [method, setMethod] = useState<MethodDef>(METHODS[0]!);
  const [url, setUrl] = useState("https://api.example.com/products/42");
  const [body, setBody] = useState('{\n  "name": "Desk lamp",\n  "price": 49\n}');
  const [snippet, setSnippet] = useState<"fetch" | "curl">("fetch");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"req" | "res">("req");

  const fetchCode = [
    `const res = await fetch(${JSON.stringify(url)}, {`,
    `  method: ${JSON.stringify(method.id)},`,
    `  headers: { "Content-Type": "application/json" },`,
    ...(method.hasBody ? [`  body: JSON.stringify(${body.trim().startsWith("{") ? body.trim() : JSON.stringify(body)}),`] : []),
    `});`,
    `const data = await res.json();`,
  ].join("\n");

  const curlCode = [
    `curl -X ${method.id} ${JSON.stringify(url)} \\`,
    `  -H "Content-Type: application/json" \\`,
    ...(method.hasBody ? [`  -d '${body.trim()}'`] : []),
  ].join("\n");

  const copySnippet = async () => {
    if (!trial.canUse) return;
    const code = snippet === "fetch" ? fetchCode : curlCode;
    if (await copyText(code)) {
      trial.recordUse();
      setCopied(true);
      toast.success(`${snippet === "fetch" ? "fetch()" : "curl"} snippet copied`);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed - select the code manually.");
    }
  };

  return (
    <ToolPageShell toolId="http-method-reference" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTTP Method Reference" left={trial.left} />

      <div className="mb-5 flex flex-wrap gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-extrabold tracking-wide transition",
              method.id === m.id ? m.color : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {m.id}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <h2 className="font-extrabold">{method.id} semantics</h2>
          </div>
          <p className="text-sm font-medium">{method.oneLiner}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Flag label="Safe" on={method.safe} />
            <Flag label="Idempotent" on={method.idempotent} />
            <Flag label="Cacheable" on={method.cacheable} />
            <Flag label="Request body" on={method.hasBody} />
          </div>
          <div className="mt-4 rounded-xl bg-muted/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Use it when</p>
            <p className="mt-1 text-sm leading-relaxed">{method.useWhen}</p>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex gap-2">
              {(["req", "res"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold",
                    tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "req" ? "Example request" : "Example response"}
                </button>
              ))}
            </div>
            <pre className="max-h-64 overflow-auto rounded-xl bg-zinc-950 p-4 text-[12.5px] leading-relaxed text-zinc-200">
              <code>{tab === "req" ? method.exampleReq : method.exampleRes}</code>
            </pre>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-extrabold">Request builder</h2>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            spellCheck={false}
          />
          {method.hasBody ? (
            <>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">JSON body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
                spellCheck={false}
              />
            </>
          ) : (
            <p className="mb-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              {method.id} requests carry no body. Parameters travel in the URL query string.
            </p>
          )}
          <div className="mb-2 flex gap-2">
            {(["fetch", "curl"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSnippet(s)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold",
                  snippet === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "fetch" ? "fetch()" : "curl"}
              </button>
            ))}
            <ActionButton busy={false} disabled={!trial.canUse} onClick={copySnippet}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy snippet"}
            </ActionButton>
          </div>
          <pre className="max-h-64 overflow-auto rounded-xl bg-zinc-950 p-4 text-[12.5px] leading-relaxed text-zinc-200">
            <code>{snippet === "fetch" ? fetchCode : curlCode}</code>
          </pre>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
