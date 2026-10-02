// /tools/css-mixins-playground - Native CSS @mixin and @apply with parameters:
// define reusable style blocks, apply them with different arguments, and
// watch a live preview. Free, client-side only.
// Uses real @mixin when the browser supports it, JS expansion otherwise.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-mixins-playground")({
  head: () => {
    const seo = getToolSeoMeta("css-mixins-playground");
    const canonical = "https://iconvault.site/tools/css-mixins-playground";
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
  component: MixinsTool,
});

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    return true;
  } catch {
    toast.error("Copy failed. Select the code manually.");
    return false;
  }
}

interface Param { name: string; def: string }

/** Expand var(--param) references with args/defaults when @mixin is unsupported. */
function expandBody(body: string, params: Param[], args: Record<string, string>): string {
  return body.replace(/var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,\s*([^)]*))?\)/g, (match, name: string, fallback?: string) => {
    const arg = args[name];
    if (arg !== undefined && arg.trim() !== "") return arg.trim();
    const p = params.find((x) => x.name === name);
    if (p && p.def.trim() !== "") return p.def.trim();
    if (fallback !== undefined) return fallback.trim();
    return match;
  });
}

const DEFAULT_BODY = `background: var(--bg);
border: 1px solid var(--border);
border-radius: var(--radius);
padding: var(--pad);
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);`;

function MixinsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-mixins-playground", isPro);
  const seo = getToolSeo("css-mixins-playground");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [mixinName, setMixinName] = useState("card");
  const [params, setParams] = useState<Param[]>([
    { name: "--bg", def: "#ffffff" },
    { name: "--border", def: "#e2e8f0" },
    { name: "--radius", def: "14px" },
    { name: "--pad", def: "18px" },
  ]);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [targets, setTargets] = useState([
    { id: 1, label: "Primary card", cls: "mixin-target-a", args: { "--bg": "#f0fdfa", "--border": "#99f6e4", "--radius": "18px", "--pad": "22px" } as Record<string, string> },
    { id: 2, label: "Alert card", cls: "mixin-target-b", args: { "--bg": "#fef2f2", "--border": "#fecaca", "--radius": "8px", "--pad": "14px" } as Record<string, string> },
  ]);

  useEffect(() => {
    try {
      const sheet = new CSSStyleSheet();
      sheet.insertRule("@mixin --probe { color: red; }");
      setSupported(true);
    } catch {
      setSupported(false);
    }
  }, []);

  const cleanName = mixinName.trim().replace(/[^a-zA-Z0-9-_]/g, "") || "card";

  const signature = params.map((p) => `${p.name}${p.def ? `: ${p.def}` : ""}`).join(", ");

  const realCss = useMemo(() => {
    const lines = [`@mixin ${cleanName}(${signature}) {`, ...body.split("\n").map((l) => `  ${l}`), "}"];
    for (const t of targets) {
      const vals = params.map((p) => t.args[p.name] ?? p.def ?? "").filter((v) => v !== "");
      lines.push("", `.${t.cls} {`, `  @apply --${cleanName}(${vals.join(", ")});`, "}");
    }
    return lines.join("\n");
  }, [cleanName, signature, body, targets, params]);

  const previewCss = useMemo(() => {
    if (supported) return realCss;
    const blocks: string[] = [];
    for (const t of targets) {
      const expanded = expandBody(body, params, t.args)
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n");
      blocks.push(`.${t.cls} {\n${expanded}\n}`);
    }
    return blocks.join("\n\n");
  }, [supported, realCss, body, params, targets]);

  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(realCss)) trial.recordUse();
  };

  const setArg = (id: number, name: string, value: string) =>
    setTargets((ts) => ts.map((t) => (t.id === id ? { ...t, args: { ...t.args, [name]: value } } : t)));

  const addParam = () => setParams((p) => [...p, { name: `--opt-${p.length + 1}`, def: "" }]);
  const removeParam = (name: string) => setParams((p) => p.filter((x) => x.name !== name));
  const editParam = (old: string, patch: Partial<Param>) =>
    setParams((p) => p.map((x) => (x.name === old ? { ...x, ...patch } : x)));

  return (
    <ToolPageShell toolId="css-mixins-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Mixins Playground" left={trial.left} />
      <style>{previewCss}</style>

      {supported === false && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser does not support @mixin yet.</span> The preview
            below is expanded with JavaScript to look exactly like the mixin output. Native @mixin/@apply needs Chrome
            133+ or Edge 133+. The code is the real syntax.
          </p>
        </div>
      )}
      {supported === true && (
        <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser supports @mixin.</span> The preview cards below
            are styled by the actual @mixin and @apply rules this page generates. Edit them live.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Mixin name</p>
            <div className="flex items-center gap-1 font-mono text-sm">
              <span className="text-muted-foreground">@mixin</span>
              <input
                value={mixinName}
                onChange={(e) => setMixinName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm"
                spellCheck={false}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Parameters</p>
              <button type="button" onClick={addParam} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-bold text-muted-foreground hover:border-primary/40">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {params.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <input
                    value={p.name}
                    onChange={(e) => editParam(p.name, { name: e.target.value })}
                    className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs"
                    spellCheck={false}
                  />
                  <input
                    value={p.def}
                    onChange={(e) => editParam(p.name, { def: e.target.value })}
                    placeholder="default"
                    className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs"
                    spellCheck={false}
                  />
                  <button type="button" onClick={() => removeParam(p.name)} className="rounded p-1 text-muted-foreground hover:text-red-500" aria-label="Remove parameter">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Mixin body</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed"
            />
            <p className="mt-1 text-xs text-muted-foreground">Reference params with <span className="font-mono">var(--name)</span>.</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-bold">Apply with different arguments</p>
          <div className="grid gap-4 md:grid-cols-2">
            {targets.map((t) => (
              <div key={t.id} className="space-y-3 rounded-xl border border-border bg-background p-4">
                <div className={cn("min-h-[150px]", t.cls)}>
                  <p className="text-sm font-extrabold text-slate-900">{t.label}</p>
                  <p className="mt-1 text-xs text-slate-600">Styled by @apply with the arguments below.</p>
                  <button type="button" className="mt-3 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white">Action</button>
                </div>
                <div className="space-y-1.5">
                  {params.map((p) => (
                    <label key={p.name} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 font-mono text-muted-foreground">{p.name}</span>
                      <input
                        value={t.args[p.name] ?? ""}
                        placeholder={p.def || "default"}
                        onChange={(e) => setArg(t.id, p.name, e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-card px-2 py-1 font-mono text-xs"
                        spellCheck={false}
                      />
                    </label>
                  ))}
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">.{t.cls} {"{ @apply --"}{cleanName}(...); {"}"}</p>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Clear an argument to fall back to the parameter default. Unlike Sass mixins, native @mixin runs in the
            browser, so it can read <span className="font-mono">var()</span>, container queries and the cascade.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Copy the CSS</h2>
          <ActionButton disabled={!trial.canUse} onClick={copy}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{realCss}</pre>
        {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of 5 free copies left.</p>}
      </div>
    </ToolPageShell>
  );
}
