// /tools/css-beautifier - Format messy CSS into clean, indented code with
// optional alphabetical property sorting, stats, copy and download.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wand2, Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-beautifier";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-beautifier";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-beautifier")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-beautifier";
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
  component: CssBeautifierTool,
});

interface Rule {
  selector: string;
  decls: string[];
  children: Rule[];
  raw?: string;
}

interface Stats {
  rules: number;
  selectors: number;
  declarations: number;
  before: number;
  after: number;
}

const SAMPLE = `.card{color:#333;background:#fff;padding:1rem;border-radius:8px}.card h2{font-size:1.5rem;margin:0 0 .5rem}@media (max-width:600px){.card{padding:.5rem}.card h2{font-size:1.2rem}}`;

/** Protect strings and comments so braces/semicolons inside them can't break parsing. */
function protect(css: string): { text: string; restore: (s: string) => string } {
  const saved: string[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (m) => {
    saved.push(m);
    return `\u0000${saved.length - 1}\u0000`;
  });
  return {
    text,
    restore: (s) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => saved[Number(i)] ?? ""),
  };
}

function splitTopLevel(css: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        parts.push(css.slice(start, i + 1));
        start = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      parts.push(css.slice(start, i + 1));
      start = i + 1;
    }
  }
  const tail = css.slice(start).trim();
  if (tail) parts.push(tail);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseRules(css: string): Rule[] {
  return splitTopLevel(css).map((part) => {
    if (!part.endsWith("}")) return { selector: "", decls: [], children: [], raw: part };
    const brace = part.indexOf("{");
    const selector = part.slice(0, brace).trim();
    const inner = part.slice(brace + 1, -1).trim();
    if (selector.startsWith("@") && inner.includes("{")) {
      return { selector, decls: [], children: parseRules(inner) };
    }
    const decls = splitTopLevel(inner)
      .map((d) => d.replace(/;$/, "").trim())
      .filter((d) => d.length > 0 && d.includes(":"));
    return { selector, decls, children: [] };
  });
}

const propName = (d: string) => (d.split(":")[0] ?? "").trim().toLowerCase();

function formatRules(rules: Rule[], indentSize: number, sortProps: boolean, level: number): string[] {
  const indent = " ".repeat(indentSize * level);
  const inner = " ".repeat(indentSize * (level + 1));
  const lines: string[] = [];
  for (const r of rules) {
    if (r.raw !== undefined) {
      lines.push(indent + r.raw);
      continue;
    }
    lines.push(indent + r.selector + " {");
    const decls = sortProps ? [...r.decls].sort((a, b) => propName(a).localeCompare(propName(b))) : r.decls;
    for (const d of decls) lines.push(inner + d + ";");
    if (r.children.length > 0) {
      if (r.decls.length > 0) lines.push("");
      lines.push(...formatRules(r.children, indentSize, sortProps, level + 1));
    }
    lines.push(indent + "}");
  }
  return lines;
}

function countStats(rules: Rule[]): Omit<Stats, "before" | "after"> {
  let rulesN = 0;
  let selectors = 0;
  let declarations = 0;
  const walk = (rs: Rule[]) => {
    for (const r of rs) {
      if (r.raw !== undefined) continue;
      if (!r.selector.startsWith("@")) {
        rulesN++;
        selectors += r.selector.split(",").filter((s) => s.trim()).length;
        declarations += r.decls.length;
      }
      walk(r.children);
    }
  };
  walk(rules);
  return { rules: rulesN, selectors, declarations };
}

function CssBeautifierTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-beautifier", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [sortProps, setSortProps] = useState(false);
  const [indentSize, setIndentSize] = useState(2);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const format = () => {
    if (busy || !trial.canUse) return;
    if (!input.trim()) {
      toast.error("Paste some CSS first.");
      return;
    }
    setBusy(true);
    try {
      const { text, restore } = protect(input);
      const rules = parseRules(text);
      const formatted = restore(formatRules(rules, indentSize, sortProps, 0).join("\n"));
      const counts = countStats(rules);
      setOutput(formatted);
      setStats({ ...counts, before: input.length, after: formatted.length });
      trial.recordUse();
      toast.success("CSS formatted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not format that CSS.");
    } finally {
      setBusy(false);
    }
  };

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("CSS copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const downloadCss = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: "text/css" }), "beautified.css");
    toast.success("CSS file downloaded");
  };

  return (
    <ToolPageShell toolId="css-beautifier" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Beautifier" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Messy CSS</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={16}
              spellCheck={false}
              placeholder=".card{color:#333;padding:1rem}"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3">
              <span className="text-sm font-medium">Sort properties A-Z</span>
              <input
                type="checkbox"
                checked={sortProps}
                onChange={(e) => setSortProps(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
            </label>
            <div className="rounded-xl border border-border px-4 py-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">Indent</span>
                <span className="text-xs font-mono text-muted-foreground">{indentSize} spaces</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={format}>
            <Wand2 className="h-4 w-4" /> {busy ? "Formatting…" : "Format CSS"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free formats left - strings and comments are preserved.
            </p>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Formatted CSS</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyOutput}
                disabled={!output}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40 disabled:opacity-40"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={downloadCss}
                disabled={!output}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40 disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" /> .css
              </button>
            </div>
          </div>
          <pre className="min-h-[300px] max-h-[420px] overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
            {output || "Formatted CSS appears here."}
          </pre>

          {stats && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {[
                { label: "Rules", value: stats.rules },
                { label: "Selectors", value: stats.selectors },
                { label: "Declarations", value: stats.declarations },
                { label: "Before", value: `${stats.before} B` },
                { label: "After", value: `${stats.after} B` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border p-3 text-center">
                  <p className="text-lg font-extrabold text-primary">{s.value}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
