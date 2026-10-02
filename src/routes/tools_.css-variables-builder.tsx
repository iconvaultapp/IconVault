// /tools/css-variables-builder - Build a CSS custom-property theme: add
// variables (name + value, color picker when the value is a color), starter
// themes, live preview on sample components, export a :root block. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-variables-builder")({
  head: () => {
    const seo = getToolSeoMeta("css-variables-builder");
    const canonical = "https://iconvault.site/tools/css-variables-builder";
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
  component: CssVariablesTool,
});

interface CssVar {
  id: string;
  name: string;
  value: string;
}

const isColor = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

const THEMES: { name: string; vars: { name: string; value: string }[] }[] = [
  {
    name: "Light",
    vars: [
      { name: "--primary", value: "#4f46e5" },
      { name: "--background", value: "#ffffff" },
      { name: "--card", value: "#f4f5fb" },
      { name: "--text", value: "#111827" },
      { name: "--muted", value: "#6b7280" },
      { name: "--radius", value: "12px" },
    ],
  },
  {
    name: "Dark",
    vars: [
      { name: "--primary", value: "#818cf8" },
      { name: "--background", value: "#0f172a" },
      { name: "--card", value: "#1e293b" },
      { name: "--text", value: "#f1f5f9" },
      { name: "--muted", value: "#94a3b8" },
      { name: "--radius", value: "12px" },
    ],
  },
  {
    name: "Pastel",
    vars: [
      { name: "--primary", value: "#f472b6" },
      { name: "--background", value: "#fdf2f8" },
      { name: "--card", value: "#fce7f3" },
      { name: "--text", value: "#831843" },
      { name: "--muted", value: "#a07d90" },
      { name: "--radius", value: "18px" },
    ],
  },
];

let uid = 0;
const mkVar = (name: string, value: string): CssVar => ({ id: `v${++uid}`, name, value });

function CssVariablesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-variables-builder", isPro);
  const seo = getToolSeo("css-variables-builder");

  const [vars, setVars] = useState<CssVar[]>(THEMES[0]?.vars.map((v) => mkVar(v.name, v.value)) ?? []);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [copied, setCopied] = useState(false);

  const previewStyle = useMemo(() => {
    const s: React.CSSProperties = {};
    for (const v of vars) {
      const n = v.name.trim();
      if (n.startsWith("--")) (s as Record<string, string>)[n] = v.value;
    }
    return s;
  }, [vars]);

  const rootBlock = useMemo(
    () =>
      ":root {\n" +
      vars
        .filter((v) => v.name.trim().startsWith("--"))
        .map((v) => `  ${v.name.trim()}: ${v.value.trim() || "unset"};`)
        .join("\n") +
      "\n}",
    [vars],
  );

  const setVar = (id: string, patch: Partial<CssVar>) =>
    setVars((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const removeVar = (id: string) => setVars((vs) => vs.filter((v) => v.id !== id));

  const addVar = () => {
    const name = newName.trim();
    if (!name.startsWith("--") || name.length < 3) {
      toast.error("Variable name must start with --, e.g. --accent");
      return;
    }
    if (vars.some((v) => v.name === name)) {
      toast.error("That variable already exists");
      return;
    }
    setVars((vs) => [...vs, mkVar(name, newValue.trim() || "initial")]);
    setNewName("");
    setNewValue("");
  };

  const applyTheme = (i: number) => {
    const t = THEMES[i];
    if (!t) return;
    setVars(t.vars.map((v) => mkVar(v.name, v.value)));
    toast.success(`${t.name} theme applied`);
  };

  const copyCss = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(rootBlock).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success(":root block copied");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const validName = (n: string) => n.trim().startsWith("--") && n.trim().length >= 3;

  return (
    <ToolPageShell toolId="css-variables-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Variables Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Starter theme</p>
            <div className="flex gap-2">
              {THEMES.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => applyTheme(i)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Variables ({vars.length})</p>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {vars.map((v) => (
                <div key={v.id} className="flex items-center gap-2">
                  {isColor(v.value) && (
                    <input
                      type="color" value={v.value}
                      onChange={(e) => setVar(v.id, { value: e.target.value })}
                      className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-border"
                      aria-label={`Color picker for ${v.name}`}
                    />
                  )}
                  <input
                    value={v.name}
                    onChange={(e) => setVar(v.id, { name: e.target.value })}
                    className={cn(
                      "w-32 rounded-lg border bg-background px-2 py-1.5 font-mono text-xs outline-none",
                      validName(v.name) ? "border-border" : "border-red-400",
                    )}
                    spellCheck={false}
                  />
                  <input
                    value={v.value}
                    onChange={(e) => setVar(v.id, { value: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none"
                    spellCheck={false}
                  />
                  <button
                    type="button" onClick={() => removeVar(v.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                    aria-label={`Remove ${v.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Add variable</p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="--accent"
                className="w-1/2 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none placeholder:text-muted-foreground/60"
                spellCheck={false}
              />
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="#ff6b6b"
                className="w-1/2 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none placeholder:text-muted-foreground/60"
                spellCheck={false}
              />
              <button
                type="button" onClick={addVar}
                className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90"
                aria-label="Add variable"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ActionButton disabled={!trial.canUse || vars.length === 0} onClick={copyCss}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy :root block"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of 5 free copies left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div style={previewStyle} className="rounded-2xl bg-[var(--background)] p-8 transition-colors">
            <p className="mb-5 text-2xl font-extrabold text-[var(--text)]">Sample heading</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--radius)] bg-[var(--card)] p-5 shadow">
                <p className="font-bold text-[var(--text)]">Sample card</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Cards, headings and buttons on this page follow your variables live.
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Sample button
                </button>
              </div>
              <div className="rounded-[var(--radius)] border-2 border-[var(--primary)] bg-[var(--background)] p-5">
                <p className="font-bold text-[var(--text)]">Outline card</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Edit any value on the left and watch this preview update instantly.
                </p>
                <p className="mt-4 font-mono text-xs text-[var(--primary)]">--primary in action</p>
              </div>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">{rootBlock}</pre>
        </div>
      </div>
    </ToolPageShell>
  );
}
