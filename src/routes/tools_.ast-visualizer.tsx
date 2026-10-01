// /tools/ast-visualizer - Parse JavaScript with acorn (dynamic import) into a
// collapsible syntax tree, or visualize JSON with a hand-written tree renderer.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ast-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("ast-visualizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: AstTool,
});

const JS_SAMPLE = `function add(a, b) {
  return a + b;
}

const total = add(2, 3);
console.log(total);`;

const JSON_SAMPLE = `{
  "name": "IconVault",
  "tools": 109,
  "pro": true,
  "tags": ["icons", "svg", "tools"],
  "meta": { "license": "MIT", "version": 2 }
}`;

type Mode = "js" | "json";

interface Selected {
  path: string;
  summary: string;
  detail: string;
}

const SKIP_KEYS = new Set(["loc", "start", "end", "range", "raw"]);

function isAstNode(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && typeof (v as Record<string, unknown>)["type"] === "string";
}

function AstTreeNode({
  node, path, depth, selectedPath, onSelect,
}: {
  node: unknown;
  path: string;
  depth: number;
  selectedPath: string | null;
  onSelect: (s: Selected) => void;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (Array.isArray(node)) {
    const shown = node.slice(0, 100);
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span>[{node.length} items]</span>
          {node.length > 100 && <span className="text-amber-500">(first 100 shown)</span>}
        </button>
        {open && (
          <div className="ml-4 border-l border-border pl-2">
            {shown.map((item, i) => (
              <AstTreeNode key={i} node={item} path={`${path}[${i}]`} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isAstNode(node)) {
    const entries = Object.entries(node).filter(([k]) => !SKIP_KEYS.has(k));
    const sel: Selected = {
      path,
      summary: String(node["type"]),
      detail: JSON.stringify(node, null, 2),
    };
    return (
      <div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center text-muted-foreground hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => onSelect(sel)}
            className={cn(
              "rounded px-1 font-mono text-[13px] transition",
              selectedPath === path ? "bg-primary/15 font-bold text-primary" : "text-emerald-600 hover:bg-muted dark:text-emerald-400",
            )}
          >
            {String(node["type"])}
          </button>
        </div>
        {open && (
          <div className="ml-4 border-l border-border pl-2">
            {entries.map(([k, v]) => (
              <div key={k} className="py-0.5">
                <span className="mr-1 font-mono text-xs text-muted-foreground">{k}:</span>
                {typeof v !== "object" || v === null ? (
                  <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{JSON.stringify(v)}</span>
                ) : (
                  <AstTreeNode node={v} path={`${path}.${k}`} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{JSON.stringify(node)}</span>;
}

/** Hand-written tree node for the JSON mode. */
function JsonTreeNode({
  value, name, path, depth, selectedPath, onSelect,
}: {
  value: unknown;
  name: string;
  path: string;
  depth: number;
  selectedPath: string | null;
  onSelect: (s: Selected) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const sel: Selected = {
    path,
    summary: Array.isArray(value) ? `array[${value.length}]` : typeof value === "object" && value !== null ? "object" : typeof value,
    detail: JSON.stringify(value, null, 2),
  };
  const label = (
    <button
      type="button"
      onClick={() => onSelect(sel)}
      className={cn(
        "rounded px-1 font-mono text-[13px] transition",
        selectedPath === path ? "bg-primary/15 font-bold text-primary" : "text-foreground/90 hover:bg-muted",
      )}
    >
      <span className="text-muted-foreground">{name}: </span>
      <span className={cn(
        value === null ? "text-muted-foreground" : typeof value === "string" ? "text-blue-600 dark:text-blue-400"
        : typeof value === "number" ? "text-amber-600 dark:text-amber-400"
        : typeof value === "boolean" ? "text-purple-600 dark:text-purple-400"
        : "text-emerald-600 dark:text-emerald-400",
      )}>
        {value === null ? "null" : Array.isArray(value) ? `Array(${value.length})` : typeof value === "object" ? "Object" : JSON.stringify(value)}
      </span>
    </button>
  );

  if (typeof value !== "object" || value === null) return <div>{label}</div>;

  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((v, i) => [`[${i}]`, v])
    : Object.entries(value);
  const shown = entries.slice(0, 100);
  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {label}
      </div>
      {open && (
        <div className="ml-4 border-l border-border pl-2">
          {shown.map(([k, v]) => (
            <JsonTreeNode
              key={k}
              value={v}
              name={k}
              path={Array.isArray(value) ? `${path}${k}` : `${path}.${k}`}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
          {entries.length > 100 && <p className="font-mono text-xs text-amber-500">…{entries.length - 100} more</p>}
        </div>
      )}
    </div>
  );
}

function AstTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ast-visualizer", isPro);
  const seo = getToolSeo("ast-visualizer");

  const [mode, setMode] = useState<Mode>("js");
  const [input, setInput] = useState(JS_SAMPLE);
  const [tree, setTree] = useState<unknown | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [treeKey, setTreeKey] = useState(0);

  const switchMode = (m: Mode) => {
    setMode(m);
    setInput(m === "js" ? JS_SAMPLE : JSON_SAMPLE);
    setTree(null);
    setSelected(null);
    setError(null);
  };

  const parse = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSelected(null);
    try {
      let parsed: unknown;
      if (mode === "js") {
        const acorn = await import("acorn");
        parsed = acorn.parse(input, { ecmaVersion: 2024, sourceType: "module" });
      } else {
        parsed = JSON.parse(input);
      }
      setTree(parsed);
      setTreeKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed.");
      setTree(null);
    } finally {
      setBusy(false);
    }
  }, [busy, input, mode]);

  const copyJson = useCallback(async () => {
    if (tree === null || tree === undefined || !trial.canUse) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(tree, null, 2));
      trial.recordUse();
      toast.success("Tree JSON copied to clipboard");
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  }, [tree, trial]);

  const nodeCount = useMemo(() => {
    if (tree === null || tree === undefined) return 0;
    let count = 0;
    const walk = (v: unknown) => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (typeof v === "object" && v !== null) {
        count++;
        Object.entries(v as Record<string, unknown>)
          .filter(([k]) => !SKIP_KEYS.has(k))
          .forEach(([, val]) => walk(val));
      }
    };
    walk(tree);
    return count;
  }, [tree]);

  const detailPreview = useMemo(() => {
    if (!selected) return "";
    return selected.detail.length > 2000 ? selected.detail.slice(0, 2000) + "\n…(truncated)" : selected.detail;
  }, [selected]);

  return (
    <ToolPageShell toolId="ast-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="AST Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex rounded-xl border border-border p-1 text-sm font-bold">
            {(["js", "json"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  "flex-1 rounded-lg px-4 py-2 transition",
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "js" ? "JavaScript (acorn)" : "JSON (hand-written)"}
              </button>
            ))}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            rows={14}
            className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
            aria-label={mode === "js" ? "JavaScript code to parse" : "JSON to visualize"}
          />
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton busy={busy} disabled={busy || !input.trim()} onClick={parse}>
              <Play className="h-4 w-4" /> {busy ? "Parsing…" : "Parse"}
            </ActionButton>
            <ActionButton disabled={tree === null || tree === undefined || !trial.canUse} onClick={copyJson}>
              <Copy className="h-4 w-4" /> Copy tree JSON
            </ActionButton>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {tree === null || tree === undefined ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Play className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Parse something to see its tree</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {mode === "js"
                  ? "JavaScript is parsed with the real acorn parser (loaded on demand)."
                  : "JSON is visualized with a hand-written recursive tree renderer."}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{nodeCount}</span> nodes · click any node for details
              </p>
              <div key={treeKey} className="max-h-[380px] overflow-auto rounded-xl border border-border bg-background p-3">
                {mode === "js" ? (
                  <AstTreeNode node={tree} path="$" depth={0} selectedPath={selected?.path ?? null} onSelect={setSelected} />
                ) : (
                  <JsonTreeNode value={tree} name="$" path="$" depth={0} selectedPath={selected?.path ?? null} onSelect={setSelected} />
                )}
              </div>
              {selected && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="mb-1 font-mono text-sm font-bold text-primary">
                    {selected.summary} <span className="font-normal text-muted-foreground">{selected.path}</span>
                  </p>
                  <pre className="max-h-[220px] overflow-auto font-mono text-[12px] leading-relaxed text-foreground/80">
                    {detailPreview}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
