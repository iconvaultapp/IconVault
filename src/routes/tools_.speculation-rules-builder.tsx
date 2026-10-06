// /tools/speculation-rules-builder - Build Speculation Rules JSON for
// prerender / prefetch with eagerness levels, URL lists and document rules.
// 100% in-browser, no upload.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/speculation-rules-builder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/speculation-rules-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/speculation-rules-builder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/speculation-rules-builder";
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
  component: SpeculationRulesTool,
});

type Kind = "prerender" | "prefetch";
type Eagerness = "immediate" | "eager" | "moderate" | "conservative";

interface Rule {
  id: number;
  kind: Kind;
  eagerness: Eagerness;
  mode: "list" | "document";
  urls: string;
}

const EAGERNESS_HELP: Record<Eagerness, string> = {
  immediate: "Speculate as soon as the rules are parsed. Use for the one next page you are sure about.",
  eager: "Speculate on hover. Great for nav menus and obvious links.",
  moderate: "Speculate on hover after a short delay (Chrome default for prerender).",
  conservative: "Speculate only on real user intent like touch or strong hover signals.",
};

let nextId = 1;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function SpeculationRulesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("speculation-rules-builder", isPro);
  const seo = toolSeo;

  const [rules, setRules] = useState<Rule[]>([
    { id: nextId++, kind: "prerender", eagerness: "moderate", mode: "document", urls: "/products/*" },
    { id: nextId++, kind: "prefetch", eagerness: "eager", mode: "list", urls: "/pricing\n/about" },
  ]);

  const addRule = () =>
    setRules((p) => [...p, { id: nextId++, kind: "prefetch", eagerness: "eager", mode: "list", urls: "" }]);

  const updateRule = (id: number, patch: Partial<Rule>) =>
    setRules((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRule = (id: number) => setRules((p) => p.filter((r) => r.id !== id));

  const json = useMemo(() => {
    const out: Record<string, unknown[]> = {};
    for (const r of rules) {
      const entry: Record<string, unknown> = { eagerness: r.eagerness };
      if (r.mode === "list") {
        const urls = r.urls.split("\n").map((u) => u.trim()).filter(Boolean);
        entry["source"] = "list";
        entry["urls"] = urls.length > 0 ? urls : ["/"];
      } else {
        entry["source"] = "document";
        entry["where"] = { href_matches: r.urls.trim() || "/*" };
      }
      (out[r.kind] = out[r.kind] ?? []).push(entry);
    }
    return JSON.stringify(out, null, 2);
  }, [rules]);

  const valid = rules.length > 0;

  const copyJson = async () => {
    if (!valid) return;
    const ok = await copyText(json);
    if (ok) {
      trial.recordUse();
      toast.success("Speculation rules copied");
    } else {
      toast.error("Copy failed, select the JSON manually");
    }
  };

  const downloadJson = () => {
    if (!valid) return;
    downloadBlob(new Blob([json], { type: "application/json" }), "speculation-rules.json");
    trial.recordUse();
    toast.success("speculation-rules.json downloaded");
  };

  const embedSnippet = `<script type="speculationrules">\n${json}\n</script>`;

  return (
    <ToolPageShell toolId="speculation-rules-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Speculation Rules" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <p className="text-sm text-muted-foreground">
          Speculation Rules let the browser prerender or prefetch pages before the user clicks. Supported in
          Chrome and Edge 109+. Firefox and Safari ignore the block safely, so it degrades gracefully. Prerender
          is powerful but costly, so keep rules tight.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          {rules.map((r) => (
            <div key={r.id} className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(["prerender", "prefetch"] as Kind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => updateRule(r.id, { kind: k })}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-bold capitalize transition",
                        r.kind === k
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeRule(r.id)}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                  aria-label="Remove rule"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Eagerness</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(EAGERNESS_HELP) as Eagerness[]).map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => updateRule(r.id, { eagerness: e })}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-bold capitalize transition",
                        r.eagerness === e
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{EAGERNESS_HELP[r.eagerness]}</p>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Source</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateRule(r.id, { mode: "list", urls: "/pricing\n/about" })}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                      r.mode === "list"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    URL list
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRule(r.id, { mode: "document", urls: "/products/*" })}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                      r.mode === "document"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    Document (where)
                  </button>
                </div>
              </div>

              {r.mode === "list" ? (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                    URLs, one per line
                  </label>
                  <textarea
                    value={r.urls}
                    onChange={(e) => updateRule(r.id, { urls: e.target.value })}
                    rows={3}
                    placeholder="/pricing&#10;/about"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                    href_matches pattern
                  </label>
                  <input
                    value={r.urls}
                    onChange={(e) => updateRule(r.id, { urls: e.target.value })}
                    placeholder="/products/*"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Matches same-origin links in the document. Use <span className="font-mono">/docs/*</span> style
                    globs, and set the tag to <span className="font-mono">&lt;a rel="no-prerender"&gt;</span> on
                    links to exclude.
                  </p>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addRule}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add rule
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Generated JSON</h2>
              <div className="flex gap-2">
                <ActionButton busy={false} disabled={!valid || !trial.canUse} onClick={copyJson}>
                  <Copy className="h-4 w-4" /> Copy
                </ActionButton>
                <ActionButton busy={false} disabled={!valid || !trial.canUse} onClick={downloadJson}>
                  <Download className="h-4 w-4" /> .json
                </ActionButton>
              </div>
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-green-300">
              {valid ? json : "// Add at least one rule to generate JSON"}
            </pre>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free uses left.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Embed in your page</h2>
            <pre className="max-h-[260px] overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-sky-300">
              {valid ? embedSnippet : "// Add at least one rule first"}
            </pre>
            <button
              type="button"
              onClick={async () => {
                if (!valid) return;
                const ok = await copyText(embedSnippet);
                if (ok) {
                  trial.recordUse();
                  toast.success("Embed snippet copied");
                }
              }}
              disabled={!valid || !trial.canUse}
              className="mt-3 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy embed snippet
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
