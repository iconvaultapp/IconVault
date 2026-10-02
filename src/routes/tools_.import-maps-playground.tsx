// /tools/import-maps-playground - Write an import map, write module code with
// bare specifiers, and watch the browser's resolution algorithm map each one.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/import-maps-playground")({
  head: () => {
    const seo = getToolSeoMeta("import-maps-playground");
    const canonical = "https://iconvault.site/tools/import-maps-playground";
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
  component: ImportMapsTool,
});

const DEFAULT_MAP = `{
  "imports": {
    "lodash": "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js",
    "app/": "./src/app/",
    "app/utils": "./src/app/utils/index.js",
    "react": "https://esm.sh/react@18.3.1"
  },
  "scopes": {
    "/legacy/": {
      "lodash": "https://cdn.jsdelivr.net/npm/lodash-es@3.10.1/lodash.js"
    }
  }
}`;

const DEFAULT_CODE = `import { debounce } from "lodash";
import { formatDate } from "app/utils";
import { router } from "app/router.js";
import React from "react";
import "missing-package";
import { oldHelper } from "lodash"; // resolved inside /legacy/ scope`;

interface Resolution {
  specifier: string;
  resolved: string | null;
  rule: string;
  scope: string;
}

function parseImports(code: string): { specifier: string; scopeLine: boolean }[] {
  const out: { specifier: string; scopeLine: boolean }[] = [];
  const re = /import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    out.push({ specifier: m[1]!, scopeLine: /\/legacy\//.test(code.slice(Math.max(0, m.index - 60), m.index)) });
  }
  return out;
}

/** Simplified import-map resolution: exact keys, then longest prefix keys ending in "/". */
function resolveSpecifier(
  spec: string,
  imports: Record<string, string>,
  scopes: Record<string, Record<string, string>>,
  inLegacyScope: boolean,
): { resolved: string | null; rule: string; scope: string } {
  const apply = (map: Record<string, string>, scopeName: string) => {
    if (Object.prototype.hasOwnProperty.call(map, spec)) {
      return { resolved: map[spec]!, rule: `exact key "${spec}"`, scope: scopeName };
    }
    let best: string | null = null;
    for (const key of Object.keys(map)) {
      if (key.endsWith("/") && spec.startsWith(key) && (best === null || key.length > best.length)) best = key;
    }
    if (best) {
      return { resolved: map[best]! + spec.slice(best.length), rule: `prefix key "${best}"`, scope: scopeName };
    }
    return null;
  };

  if (inLegacyScope) {
    const scoped = scopes["/legacy/"];
    if (scoped) {
      const hit = apply(scoped, "/legacy/ scope");
      if (hit) return hit;
    }
  }
  const top = apply(imports, "top-level imports");
  if (top) return top;
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) {
    return { resolved: spec + " (relative, used as-is)", rule: "relative/absolute URL", scope: "n/a" };
  }
  return { resolved: null, rule: "no matching key", scope: "n/a" };
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function ImportMapsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("import-maps-playground", isPro);
  const seo = getToolSeo("import-maps-playground");

  const [mapSrc, setMapSrc] = useState(DEFAULT_MAP);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [results, setResults] = useState<Resolution[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!trial.canUse) {
      toast.error("Free uses exhausted - go Pro for unlimited.");
      return;
    }
    let parsed: { imports?: Record<string, string>; scopes?: Record<string, Record<string, string>> };
    try {
      parsed = JSON.parse(mapSrc);
    } catch {
      setMapError("Import map is not valid JSON.");
      setResults(null);
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setMapError("Import map must be a JSON object with an \"imports\" key.");
      setResults(null);
      return;
    }
    if (!parsed.imports || typeof parsed.imports !== "object") {
      setMapError("Missing \"imports\" object. Scopes alone are not enough.");
      setResults(null);
      return;
    }
    setMapError(null);
    const imports = parseImports(code);
    const out: Resolution[] = imports.map(({ specifier, scopeLine }) => {
      const r = resolveSpecifier(specifier, parsed.imports!, parsed.scopes ?? {}, scopeLine);
      return { specifier, ...r };
    });
    setResults(out);
    trial.recordUse();
    const missed = out.filter((r) => !r.resolved).length;
    toast.success(missed === 0 ? `Resolved all ${out.length} imports` : `${missed} specifier${missed > 1 ? "s" : ""} had no match`);
  };

  const copySnippet = async () => {
    const snippet = `<script type="importmap">\n${mapSrc}\n</script>\n\n<script type="module">\n${code}\n</script>`;
    if (await copyText(snippet)) toast.success("Import map + module copied");
    else toast.error("Copy failed - select the code manually.");
  };

  return (
    <ToolPageShell toolId="import-maps-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Import Maps Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 font-extrabold">1. Import map (JSON)</h2>
            <textarea
              value={mapSrc}
              onChange={(e) => setMapSrc(e.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-zinc-950 p-3 font-mono text-[12.5px] leading-relaxed text-zinc-200"
            />
            {mapError && <p className="mt-2 text-sm font-semibold text-red-500">{mapError}</p>}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 font-extrabold">2. Module code with bare specifiers</h2>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={9}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-zinc-950 p-3 font-mono text-[12.5px] leading-relaxed text-zinc-200"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ActionButton busy={false} disabled={!trial.canUse} onClick={run}>
                <MapPin className="h-4 w-4" /> Resolve imports
              </ActionButton>
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy HTML snippet
              </button>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free resolutions left.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-extrabold">3. Resolution results</h2>
          {!results ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <MapPin className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">Nothing resolved yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Press "Resolve imports" to see which import-map rule each bare specifier matches.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div
                  key={`${r.specifier}-${i}`}
                  className={cn(
                    "rounded-xl border p-3",
                    r.resolved ? "border-border" : "border-red-500/40 bg-red-500/5",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold">"{r.specifier}"</code>
                    <span className="text-muted-foreground">→</span>
                    {r.resolved ? (
                      <code className="break-all font-mono text-xs text-emerald-600">{r.resolved}</code>
                    ) : (
                      <span className="text-xs font-bold text-red-500">Unmapped - the browser would throw a TypeError</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Matched by <strong className="text-foreground">{r.rule}</strong> in {r.scope}
                  </p>
                </div>
              ))}
              <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Resolution rules:</strong> exact keys win over prefix keys;
                among prefix keys the longest match wins; scopes only apply to modules whose URL starts with the scope prefix;
                "app/utils" beat "app/" here because exact keys outrank prefixes.
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
