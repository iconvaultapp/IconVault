// /tools/eslint-config-generator - Visual flat-config (eslint.config.js)
// builder. Language preset, per-rule severity pickers, ignore patterns,
// live JS output, copy + download. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/eslint-config-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/eslint-config-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/eslint-config-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/eslint-config-generator";
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
  component: EslintTool,
});

type Lang = "js" | "ts" | "react" | "vue";
type Sev = "off" | "warn" | "error";

interface RuleDef {
  name: string;
  desc: string;
  def: Sev;
  optHint?: string;
}

const BASE_RULES: RuleDef[] = [
  { name: "no-unused-vars", desc: "Disallow unused variables and function arguments", def: "error" },
  { name: "no-console", desc: "Disallow console.log in shipped code", def: "warn" },
  { name: "no-debugger", desc: "Disallow debugger statements", def: "error" },
  { name: "eqeqeq", desc: "Require === and !==", def: "warn" },
  { name: "prefer-const", desc: "Prefer const for never-reassigned bindings", def: "warn" },
  { name: "no-var", desc: "Disallow var, use let or const", def: "error" },
  { name: "curly", desc: "Require braces around every block", def: "off" },
  { name: "no-eval", desc: "Disallow eval()", def: "error" },
  { name: "no-alert", desc: "Disallow alert(), confirm() and prompt()", def: "warn" },
  { name: "no-throw-literal", desc: "Only throw Error objects, never literals", def: "error" },
  { name: "semi", desc: "Require (or ban) semicolons", def: "off", optHint: '"never" or "always"' },
  { name: "quotes", desc: "Enforce a quote style", def: "off", optHint: '"single" or "double"' },
];

const EXTRA_RULES: Record<Exclude<Lang, "js">, RuleDef[]> = {
  ts: [
    { name: "@typescript-eslint/no-explicit-any", desc: "Ban the any type", def: "warn" },
    { name: "@typescript-eslint/no-non-null-assertion", desc: "Ban the ! non-null assertion", def: "warn" },
  ],
  react: [
    { name: "@typescript-eslint/no-explicit-any", desc: "Ban the any type", def: "warn" },
    { name: "react/no-unescaped-entities", desc: "Disallow raw > } ' in JSX text", def: "warn" },
    { name: "react-hooks/rules-of-hooks", desc: "Enforce the Rules of Hooks", def: "error" },
  ],
  vue: [
    { name: "vue/no-multiple-template-root", desc: "Disallow multiple template roots", def: "error" },
    { name: "vue/require-v-for-key", desc: "Require :key with v-for", def: "error" },
  ],
};

const LANG_META: Record<Lang, { label: string; note: string; imports: string[]; packages: string; extras: string[] }> = {
  js: {
    label: "JavaScript",
    note: "Plain JavaScript and Node projects. Uses only ESLint's own recommended set.",
    imports: ['import js from "@eslint/js";'],
    packages: "eslint @eslint/js",
    extras: ["js.configs.recommended,"],
  },
  ts: {
    label: "TypeScript",
    note: "TypeScript projects. Adds typescript-eslint recommended rules on top of the JS set.",
    imports: ['import js from "@eslint/js";', 'import tseslint from "typescript-eslint";'],
    packages: "eslint @eslint/js typescript-eslint",
    extras: ["js.configs.recommended,", "...tseslint.configs.recommended,"],
  },
  react: {
    label: "React + TS",
    note: "React apps with TypeScript. Adds the React and React Hooks plugins.",
    imports: [
      'import js from "@eslint/js";',
      'import tseslint from "typescript-eslint";',
      'import react from "eslint-plugin-react";',
      'import reactHooks from "eslint-plugin-react-hooks";',
    ],
    packages: "eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks",
    extras: ["js.configs.recommended,", "...tseslint.configs.recommended,", "react.configs.flat.recommended,", "reactHooks.configs.flat.recommended,"],
  },
  vue: {
    label: "Vue",
    note: "Vue 3 projects. Adds eslint-plugin-vue with the flat essential rules.",
    imports: ['import js from "@eslint/js";', 'import vue from "eslint-plugin-vue";'],
    packages: "eslint @eslint/js eslint-plugin-vue",
    extras: ["js.configs.recommended,", "...vue.configs['flat/essential'],"],
  },
};

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function EslintTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("eslint-config-generator", isPro);
  const seo = toolSeo;

  const [lang, setLang] = useState<Lang>("ts");
  const [sevs, setSevs] = useState<Record<string, Sev>>(() =>
    Object.fromEntries([...BASE_RULES, ...EXTRA_RULES.ts].map((r) => [r.name, r.def])),
  );
  const [opts, setOpts] = useState<Record<string, string>>({});
  const [ignores, setIgnores] = useState("node_modules/\ndist/\n.next/");
  const [copied, setCopied] = useState(false);

  const rules = useMemo(
    () => (lang === "js" ? BASE_RULES : [...BASE_RULES, ...EXTRA_RULES[lang]]),
    [lang],
  );

  const switchLang = (l: Lang) => {
    setLang(l);
    setSevs((prev) => {
      const next = { ...prev };
      for (const r of l === "js" ? BASE_RULES : [...BASE_RULES, ...EXTRA_RULES[l]]) {
        if (!(r.name in next)) next[r.name] = r.def;
      }
      return next;
    });
  };

  const output = useMemo(() => {
    const meta = LANG_META[lang];
    const lines: string[] = [];
    lines.push("// Generated with IconVault's ESLint Config Builder");
    lines.push("// Install: npm i -D " + meta.packages);
    lines.push("");
    lines.push(...meta.imports);
    lines.push("");
    lines.push("export default [");
    const ig = ignores.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (ig.length) {
      lines.push("  {");
      lines.push("    ignores: [");
      for (const p of ig) lines.push(`      "${p}",`);
      lines.push("    ],");
      lines.push("  },");
    }
    for (const e of meta.extras) lines.push(`  ${e}`);
    const active = rules.filter((r) => (sevs[r.name] ?? r.def) !== "off");
    if (active.length) {
      lines.push("  {");
      lines.push("    rules: {");
      for (const r of active) {
        const sev = sevs[r.name] ?? r.def;
        const opt = (opts[r.name] ?? "").trim();
        const value = opt ? `["${sev}", ${opt}]` : `"${sev}"`;
        lines.push(`      "${r.name}": ${value},`);
      }
      lines.push("    },");
      lines.push("  },");
    }
    lines.push("];");
    return lines.join("\n");
  }, [lang, rules, sevs, opts, ignores]);

  const doCopy = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(output);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success("eslint.config.js copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const doDownload = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output + "\n"], { type: "text/javascript" }), "eslint.config.js");
    trial.recordUse();
    toast.success("eslint.config.js downloaded");
  };

  return (
    <ToolPageShell toolId="eslint-config-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ESLint Config Generator" left={trial.left} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Language preset:</span>
        {(Object.keys(LANG_META) as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => switchLang(l)}
            title={LANG_META[l].note}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-bold transition",
              lang === l ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:text-primary",
            )}
          >
            {LANG_META[l].label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_500px]">
        <div className="space-y-5">
          <div className="space-y-2.5">
            <p className="text-sm font-bold">Rules - pick a severity for each</p>
            {rules.map((r) => {
              const sev = sevs[r.name] ?? r.def;
              return (
                <div key={r.name} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-bold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {(["off", "warn", "error"] as Sev[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSevs((p) => ({ ...p, [r.name]: s }))}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                            sev === s
                              ? s === "error"
                                ? "border-red-500 bg-red-500/10 text-red-500"
                                : s === "warn"
                                  ? "border-amber-500 bg-amber-500/10 text-amber-600"
                                  : "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {r.optHint && sev !== "off" && (
                    <input
                      value={opts[r.name] ?? ""}
                      onChange={(e) => setOpts((p) => ({ ...p, [r.name]: e.target.value }))}
                      placeholder={`Rule options, ${r.optHint} (raw JS, optional)`}
                      className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div>
            <p className="mb-1.5 text-sm font-bold">Ignore patterns (one per line)</p>
            <textarea
              value={ignores}
              onChange={(e) => setIgnores(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">eslint.config.js - live preview</p>
            <pre className="max-h-[560px] overflow-auto whitespace-pre rounded-xl bg-muted p-4 font-mono text-[12px] leading-relaxed">
              {output}
            </pre>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionButton disabled={!trial.canUse} onClick={() => void doCopy()}>
                {copied ? <Check className="h-4 w-4 text-green-200" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </ActionButton>
              <ActionButton disabled={!trial.canUse} onClick={doDownload}>
                <Download className="h-4 w-4" /> Download
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
            <div className="mt-4 flex gap-2 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <span>
                This is the modern flat config format (ESLint 9+). The install command at the top of the file lists every package your preset needs.
              </span>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
