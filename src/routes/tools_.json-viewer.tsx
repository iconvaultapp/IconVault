// /tools/json-viewer - Paste JSON or upload a .json file and explore it as a
// collapsible tree. Search with highlighting, click any node to copy its
// JSONPath. 100% client-side, runs in your browser, nothing is uploaded.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, ChevronDown, ChevronRight, Copy, FileUp, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-viewer")({
  head: () => {
    const seo = getToolSeoMeta("json-viewer");
    const canonical = "https://iconvault.site/tools/json-viewer";
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
  component: JsonViewerTool,
});

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function valueColor(v: unknown): string {
  if (v === null) return "text-muted-foreground italic";
  switch (typeof v) {
    case "string":
      return "text-green-600 dark:text-green-400";
    case "number":
      return "text-blue-600 dark:text-blue-400";
    case "boolean":
      return "text-purple-600 dark:text-purple-400";
    default:
      return "text-foreground";
  }
}

function formatLeaf(v: unknown): string {
  if (typeof v === "string") return `"${v.length > 120 ? `${v.slice(0, 120)}...` : v}"`;
  return String(v);
}

interface NodeProps {
  label: string;
  value: unknown;
  path: string;
  depth: number;
  signal: { key: number; open: boolean } | null;
  query: string;
}

function TreeNode({ label, value, path, depth, signal, query }: NodeProps) {
  const [open, setOpen] = useState(depth < 2);

  useEffect(() => {
    if (signal) setOpen(signal.open);
  }, [signal]);

  useEffect(() => {
    if (query) setOpen(true);
  }, [query]);

  const copyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(path);
      toast.success(`Copied ${path}`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const q = query.trim().toLowerCase();
  const matches =
    q.length > 0 &&
    (label.toLowerCase().includes(q) ||
      path.toLowerCase().includes(q) ||
      (typeof value === "string" && value.toLowerCase().includes(q)));

  const hl = (text: string) => {
    if (!q || !text.toLowerCase().includes(q)) return text;
    const idx = text.toLowerCase().indexOf(q);
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-amber-400/60 px-0.5 text-inherit">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  if (Array.isArray(value)) {
    return (
      <div className="font-mono text-[13px] leading-7">
        <div className="flex cursor-pointer items-center gap-1 rounded px-1 hover:bg-muted/60" onClick={copyPath} title="Click to copy JSONPath">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <span className={cn("font-bold text-foreground", matches && "bg-amber-400/40 rounded px-0.5")}>{hl(label)}:</span>
          <span className="text-muted-foreground">[{value.length}]</span>
          {!open && <span className="text-muted-foreground">[...]</span>}
        </div>
        {open && (
          <div className="ml-4 border-l border-border pl-3">
            {value.map((v, i) => (
              <TreeNode key={i} label={String(i)} value={v} path={`${path}[${i}]`} depth={depth + 1} signal={signal} query={query} />
            ))}
            {value.length === 0 && <span className="text-muted-foreground">empty array</span>}
          </div>
        )}
      </div>
    );
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    return (
      <div className="font-mono text-[13px] leading-7">
        <div className="flex cursor-pointer items-center gap-1 rounded px-1 hover:bg-muted/60" onClick={copyPath} title="Click to copy JSONPath">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <span className={cn("font-bold text-foreground", matches && "bg-amber-400/40 rounded px-0.5")}>{hl(label)}:</span>
          <span className="text-muted-foreground">{`{${keys.length}}`}</span>
          {!open && <span className="text-muted-foreground">{"{...}"}</span>}
        </div>
        {open && (
          <div className="ml-4 border-l border-border pl-3">
            {keys.map((k) => (
              <TreeNode key={k} label={k} value={value[k]} path={`${path}.${k}`} depth={depth + 1} signal={signal} query={query} />
            ))}
            {keys.length === 0 && <span className="text-muted-foreground">empty object</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex cursor-pointer items-center gap-1.5 rounded px-1 font-mono text-[13px] leading-7 hover:bg-muted/60"
      onClick={copyPath}
      title="Click to copy JSONPath"
    >
      <span className="w-4 shrink-0" />
      <span className={cn("font-bold text-foreground", matches && "bg-amber-400/40 rounded px-0.5")}>{hl(label)}:</span>
      <span className={cn("break-all", valueColor(value))}>
        {typeof value === "string" && q ? hl(formatLeaf(value)) : formatLeaf(value)}
      </span>
    </div>
  );
}

function countKeys(v: unknown): number {
  if (Array.isArray(v)) return v.reduce((a, el) => a + countKeys(el), 0);
  if (isPlainObject(v)) return Object.keys(v).length + Object.values(v).reduce<number>((a, el) => a + countKeys(el), 0);
  return 0;
}

function maxDepth(v: unknown): number {
  if (Array.isArray(v)) return v.length === 0 ? 1 : 1 + Math.max(...v.map(maxDepth));
  if (isPlainObject(v)) {
    const vals = Object.values(v);
    return vals.length === 0 ? 1 : 1 + Math.max(...vals.map(maxDepth));
  }
  return 0;
}

const SAMPLE = `{
  "store": {
    "name": "IconVault Books",
    "books": [
      { "title": "JSON Handbook", "price": 29, "inStock": true },
      { "title": "API Design", "price": 45, "inStock": false }
    ],
    "meta": { "currency": "USD", "open": true }
  }
}`;

function JsonViewerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-viewer", isPro);
  const seo = getToolSeo("json-viewer");

  const [input, setInput] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [signal, setSignal] = useState<{ key: number; open: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const render = () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    try {
      const parsed: unknown = JSON.parse(input);
      setData(parsed);
      setHasData(true);
      setError(null);
      setQuery("");
      setSignal(null);
      trial.recordUse();
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`);
      setHasData(false);
    } finally {
      setBusy(false);
    }
  };

  const loadFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setInput(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Could not read that file");
    reader.readAsText(f);
  };

  const copyFormatted = async () => {
    if (!hasData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success("Formatted JSON copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const sizeKb = hasData ? (new Blob([JSON.stringify(data)]).size / 1024).toFixed(1) : "0";

  return (
    <ToolPageShell toolId="json-viewer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON Tree Viewer" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">JSON input</span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <FileUp className="h-3.5 w-3.5" /> Upload .json
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Sample
            </button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your JSON here, or upload a .json file..."
          spellCheck={false}
          className="h-44 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
        />
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        <div className="mt-3">
          <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={render}>
            <Braces className="h-4 w-4" /> {busy ? "Rendering..." : "Render tree"}
          </ActionButton>
        </div>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free renders left. Runs in your browser, nothing is uploaded.
          </p>
        )}
      </div>

      {hasData && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search keys and values..."
                spellCheck={false}
                className="w-64 rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => setSignal((s) => ({ key: (s?.key ?? 0) + 1, open: true }))}
              className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => setSignal((s) => ({ key: (s?.key ?? 0) + 1, open: false }))}
              className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Collapse all
            </button>
            <button
              type="button"
              onClick={copyFormatted}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" /> Copy formatted
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="font-semibold text-muted-foreground">Keys: <span className="text-foreground">{countKeys(data)}</span></span>
            <span className="font-semibold text-muted-foreground">Max depth: <span className="text-foreground">{maxDepth(data)}</span></span>
            <span className="font-semibold text-muted-foreground">Size: <span className="text-foreground">{sizeKb} KB</span></span>
          </div>

          <div className="max-h-[560px] overflow-auto rounded-xl border border-border bg-background p-3">
            {isPlainObject(data) || Array.isArray(data) ? (
              Object.entries(isPlainObject(data) ? data : Object.fromEntries((data as unknown[]).map((v, i) => [i, v]))).map(([k, v]) => (
                <TreeNode
                  key={k}
                  label={k}
                  value={v}
                  path={Array.isArray(data) ? `$[${k}]` : `$.${k}`}
                  depth={0}
                  signal={signal}
                  query={query}
                />
              ))
            ) : (
              <p className={cn("font-mono text-[13px]", valueColor(data))}>{formatLeaf(data)}</p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Tip: click any node to copy its JSONPath. Very large files (10 MB+) may render slowly.</p>
        </div>
      )}
    </ToolPageShell>
  );
}
