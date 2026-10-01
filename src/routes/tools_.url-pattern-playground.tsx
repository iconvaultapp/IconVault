// /tools/url-pattern-playground - Test the URLPattern API with named
// groups and presets. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link2, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/url-pattern-playground")({
  head: () => {
    const seo = getToolSeoMeta("url-pattern-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: UrlPatternPlayground,
});

const PRESETS = [
  { label: "User profile", pattern: "https://example.com/users/:id", url: "https://example.com/users/42" },
  { label: "Versioned API", pattern: "https://api.example.com/:version/users/:id", url: "https://api.example.com/v2/users/7" },
  { label: "Locale + slug", pattern: "https://example.com/:locale(en|fr|de)/products/:slug", url: "https://example.com/fr/products/blue-widget" },
  { label: "CDN file", pattern: "https://cdn.example.com/assets/:file.:ext", url: "https://cdn.example.com/assets/logo.webp" },
  { label: "Tenant subdomain", pattern: "https://:tenant.example.com/dashboard/*", url: "https://acme.example.com/dashboard/reports/q3" },
  { label: "Search query", pattern: "https://example.com/search?q=:q", url: "https://example.com/search?q=iconvault" },
];

const PARTS = ["protocol", "username", "password", "hostname", "port", "pathname", "search", "hash"] as const;

interface TestResult {
  matched: boolean;
  groups: { part: string; name: string; value: string }[];
  inputs: Record<string, string>;
}

function UrlPatternPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("url-pattern-playground", isPro);
  const seo = getToolSeo("url-pattern-playground");

  const supported = typeof (globalThis as any).URLPattern !== "undefined";
  const [pattern, setPattern] = useState(PRESETS[0]?.pattern ?? "");
  const [url, setUrl] = useState(PRESETS[0]?.url ?? "");
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreset = (i: number) => {
    setPattern(PRESETS[i]?.pattern ?? "");
    setUrl(PRESETS[i]?.url ?? "");
    setResult(null);
    setError(null);
  };

  const test = () => {
    if (!trial.canUse) return;
    setError(null);
    setResult(null);
    if (!supported) {
      setError("Your browser does not support the URLPattern API yet. Try Chrome 95+, Edge 95+ or Safari 18.4+.");
      return;
    }
    try {
      const UP = (globalThis as any).URLPattern;
      const p = new UP(pattern);
      const m = p.exec(url);
      if (!m) {
        setResult({ matched: false, groups: [], inputs: {} });
        trial.recordUse();
        return;
      }
      const groups: TestResult["groups"] = [];
      for (const part of PARTS) {
        const g = m[part]?.groups ?? {};
        for (const [name, value] of Object.entries(g)) {
          if (value !== undefined) groups.push({ part, name, value: String(value) });
        }
      }
      const inputs: Record<string, string> = {};
      for (const part of PARTS) {
        const v = m[part]?.input;
        if (v) inputs[part] = v;
      }
      setResult({ matched: true, groups, inputs });
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid pattern.");
    }
  };

  return (
    <ToolPageShell toolId="url-pattern-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="URLPattern Playground" left={trial.left} />

      {!supported && (
        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          Your browser does not implement the URLPattern API. Patterns are parsed but matching is disabled here.
          Use Chrome 95+, Edge 95+ or Safari 18.4+ for live testing.
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => loadPreset(i)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              pattern === p.pattern && url === p.url
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Pattern</label>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              spellCheck={false}
              placeholder="https://example.com/users/:id"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Test URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              spellCheck={false}
              placeholder="https://example.com/users/42"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
            />
          </div>
          <ActionButton disabled={!trial.canUse || !supported} onClick={test}>
            <Play className="h-4 w-4" /> Test pattern
          </ActionButton>
          <div className="rounded-xl bg-background p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-bold text-foreground/80">Syntax cheatsheet</p>
            <p><code className="font-mono text-foreground/90">:name</code> named group</p>
            <p><code className="font-mono text-foreground/90">:name(regex)</code> custom regex</p>
            <p><code className="font-mono text-foreground/90">*</code> wildcard, <code className="font-mono text-foreground/90">:name*</code> named wildcard</p>
            <p><code className="font-mono text-foreground/90">(foo)?</code> optional group</p>
          </div>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Link2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Match results appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Named groups are extracted per URL part: hostname, pathname, search and more.
              </p>
            </div>
          ) : !result.matched ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <span className="rounded-full bg-red-500/15 px-4 py-1.5 text-sm font-bold text-red-600 dark:text-red-400">
                No match
              </span>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                The pattern did not match this URL. Tweak the pattern or try another preset.
              </p>
            </div>
          ) : (
            <div>
              <span className="rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Matched
              </span>
              {result.groups.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-background text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-semibold">Part</th>
                        <th className="px-4 py-2 font-semibold">Group</th>
                        <th className="px-4 py-2 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.groups.map((g, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{g.part}</td>
                          <td className="px-4 py-2 font-mono text-xs font-bold text-primary">:{g.name}</td>
                          <td className="px-4 py-2 font-mono text-xs break-all">{g.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Matched, but the pattern defines no named groups to extract.
                </p>
              )}
              {Object.keys(result.inputs).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold text-muted-foreground">Matched inputs per part</p>
                  <div className="space-y-1">
                    {Object.entries(result.inputs).map(([k, v]) => (
                      <p key={k} className="font-mono text-xs break-all">
                        <span className="text-muted-foreground">{k}:</span> {v}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
