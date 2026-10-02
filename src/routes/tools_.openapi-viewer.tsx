// /tools/openapi-viewer - Paste or upload an OpenAPI/Swagger spec (JSON
// or YAML) and browse its endpoints grouped by tag. The spec is only
// visualized: no requests are executed, nothing is uploaded.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ChevronDown, Eraser, Info, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/openapi-viewer")({
  head: () => {
    const seo = getToolSeoMeta("openapi-viewer");
    const canonical = "https://iconvault.site/tools/openapi-viewer";
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
  component: OpenApiViewerTool,
});

const METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "trace"] as const;
type Method = (typeof METHODS)[number];

const METHOD_STYLE: Record<string, string> = {
  get: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  post: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  put: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  patch: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  delete: "bg-red-500/15 text-red-600 dark:text-red-400",
  options: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  head: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  trace: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

interface Param {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

interface Operation {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Param[];
  requestBody?: { description?: string; content?: Record<string, { schema?: unknown }> };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: unknown }> }>;
}

interface Endpoint {
  key: string;
  method: Method;
  path: string;
  op: Operation;
}

const SAMPLE = `{
  "openapi": "3.0.0",
  "info": { "title": "Demo Store API", "version": "1.2.0" },
  "servers": [{ "url": "https://api.example.com/v1" }],
  "paths": {
    "/products": {
      "get": {
        "tags": ["Products"],
        "summary": "List products",
        "parameters": [
          { "name": "limit", "in": "query", "required": false, "schema": { "type": "integer" }, "description": "Max items to return" }
        ],
        "responses": { "200": { "description": "A list of products" } }
      },
      "post": {
        "tags": ["Products"],
        "summary": "Create a product",
        "requestBody": {
          "description": "Product to create",
          "content": { "application/json": { "schema": { "type": "object", "properties": { "name": { "type": "string" }, "price": { "type": "number" } }, "required": ["name"] } } }
        },
        "responses": { "201": { "description": "Product created" }, "400": { "description": "Invalid input" } }
      }
    },
    "/products/{id}": {
      "get": {
        "tags": ["Products"],
        "summary": "Get one product",
        "parameters": [ { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } } ],
        "responses": { "200": { "description": "The product" }, "404": { "description": "Not found" } }
      }
    },
    "/orders": {
      "post": {
        "tags": ["Orders"],
        "summary": "Place an order",
        "responses": { "201": { "description": "Order placed" } }
      }
    }
  }
}`;

function OpenApiViewerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("openapi-viewer", isPro);
  const seo = getToolSeo("openapi-viewer");

  const [input, setInput] = useState("");
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (text: string) => {
    if (!trial.canUse || !text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      let parsed: unknown;
      const trimmed = text.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        parsed = JSON.parse(trimmed);
      } else {
        const YAML = await import("yaml");
        parsed = YAML.parse(trimmed);
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("The spec must be a JSON/YAML object.");
      }
      const doc = parsed as Record<string, unknown>;
      if (!doc["paths"] || typeof doc["paths"] !== "object") {
        throw new Error("No \"paths\" object found. Is this an OpenAPI or Swagger spec?");
      }
      const info = (doc["info"] ?? {}) as Record<string, unknown>;
      setTitle(`${String(info["title"] ?? "Untitled API")} · v${String(info["version"] ?? "?")}`);
      setSpec(doc);
      setOpen(new Set());
      trial.recordUse();
    } catch (e) {
      setSpec(null);
      setTitle("");
      setError(e instanceof Error ? e.message.split("\n")[0] ?? e.message : "Could not parse that spec.");
    } finally {
      setBusy(false);
    }
  };

  const endpoints = useMemo<Endpoint[]>(() => {
    if (!spec) return [];
    const paths = spec["paths"] as Record<string, Record<string, Operation>>;
    const list: Endpoint[] = [];
    for (const [path, item] of Object.entries(paths)) {
      if (!item || typeof item !== "object") continue;
      for (const m of METHODS) {
        const op = item[m];
        if (op && typeof op === "object") {
          list.push({ key: `${m} ${path}`, method: m, path, op });
        }
      }
    }
    return list;
  }, [spec]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return endpoints;
    return endpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.method.includes(q) ||
        (e.op.summary ?? "").toLowerCase().includes(q),
    );
  }, [endpoints, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Endpoint[]>();
    for (const e of filtered) {
      const tag = e.op.tags?.[0] ?? "default";
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag)!.push(e);
    }
    return [...map.entries()];
  }, [filtered]);

  const toggle = (key: string) =>
    setOpen((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const schemaBlock = (schema: unknown) => (
    <pre className="overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed">
      {JSON.stringify(schema ?? {}, null, 2)}
    </pre>
  );

  return (
    <ToolPageShell toolId="openapi-viewer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="OpenAPI Viewer" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">OpenAPI / Swagger spec (JSON or YAML)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setSpec(null); setError(null); }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Upload file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setInput(await f.text());
                  setSpec(null);
                  setError(null);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => { setInput(""); setSpec(null); setError(null); setSearch(""); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Paste your spec here, or upload a .json / .yaml file…'
            spellCheck={false}
            rows={9}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={() => load(input)}>
              {busy ? "Parsing…" : "Visualize spec"}
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free views left.
              </p>
            )}
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-muted-foreground">
              This tool only visualizes the spec. No requests are executed and nothing is uploaded;
              everything runs in your browser.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-600 dark:text-red-400">Could not read spec</p>
              <p className="mt-1 font-mono text-sm text-red-600/90 dark:text-red-400/90">{error}</p>
            </div>
          </div>
        )}

        {spec && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold">
                {title} · {endpoints.length} endpoint{endpoints.length === 1 ? "" : "s"}
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter endpoints…"
                  className="w-64 rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {groups.length === 0 && (
              <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No endpoints match “{search}”.
              </p>
            )}

            {groups.map(([tag, eps]) => (
              <div key={tag} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border bg-muted/40 px-5 py-3">
                  <p className="text-sm font-extrabold uppercase tracking-wide">{tag}</p>
                </div>
                <div className="divide-y divide-border">
                  {eps.map((e) => {
                    const isOpen = open.has(e.key);
                    const firstSchema = e.op.requestBody?.content
                      ? Object.values(e.op.requestBody.content)[0]?.schema
                      : undefined;
                    return (
                      <div key={e.key}>
                        <button
                          type="button"
                          onClick={() => toggle(e.key)}
                          className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-muted/30"
                        >
                          <span className={cn("w-16 shrink-0 rounded-md px-2 py-1 text-center text-xs font-extrabold uppercase", METHOD_STYLE[e.method])}>
                            {e.method}
                          </span>
                          <span className="flex-1 truncate font-mono text-sm font-bold">{e.path}</span>
                          <span className="hidden max-w-xs truncate text-sm text-muted-foreground md:block">
                            {e.op.summary ?? ""}
                          </span>
                          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")} />
                        </button>
                        {isOpen && (
                          <div className="space-y-4 border-t border-border bg-muted/20 px-5 py-4">
                            {e.op.description && (
                              <p className="text-sm text-muted-foreground">{e.op.description}</p>
                            )}
                            {e.op.parameters && e.op.parameters.length > 0 && (
                              <div>
                                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Parameters</p>
                                <div className="overflow-x-auto rounded-xl border border-border">
                                  <table className="w-full text-left text-sm">
                                    <thead>
                                      <tr className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                        <th className="px-3 py-2">Name</th>
                                        <th className="px-3 py-2">In</th>
                                        <th className="px-3 py-2">Type</th>
                                        <th className="px-3 py-2">Required</th>
                                        <th className="px-3 py-2">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {e.op.parameters.map((p, i) => (
                                        <tr key={i}>
                                          <td className="px-3 py-2 font-mono font-bold">{p.name}</td>
                                          <td className="px-3 py-2 text-muted-foreground">{p.in}</td>
                                          <td className="px-3 py-2 font-mono text-xs">{String(p.schema?.["type"] ?? "-")}</td>
                                          <td className="px-3 py-2">{p.required ? "yes" : "no"}</td>
                                          <td className="px-3 py-2 text-muted-foreground">{p.description ?? ""}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {e.op.requestBody && (
                              <div>
                                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                                  Request body{e.op.requestBody.description ? ` · ${e.op.requestBody.description}` : ""}
                                </p>
                                {schemaBlock(firstSchema)}
                              </div>
                            )}
                            {e.op.responses && Object.keys(e.op.responses).length > 0 && (
                              <div>
                                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Responses</p>
                                <div className="space-y-2">
                                  {Object.entries(e.op.responses).map(([code, r]) => (
                                    <div key={code} className="rounded-xl border border-border bg-background p-3">
                                      <p className="text-sm">
                                        <span className="mr-2 font-mono font-extrabold">{code}</span>
                                        <span className="text-muted-foreground">{r.description ?? ""}</span>
                                      </p>
                                      {r.content && schemaBlock(Object.values(r.content)[0]?.schema)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Schemas are shown as written in the spec ($refs are not resolved).
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
