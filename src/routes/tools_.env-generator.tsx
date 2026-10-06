// /tools/env-generator - Build a .env file from KEY=VALUE rows with comments,
// live validation of KEY format, then generate both .env and .env.example
// (values blanked, keys + comments kept). Copy + download both files.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileKey, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/env-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/env-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/env-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/env-generator";
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
  component: EnvGeneratorTool,
});

interface EnvRow {
  id: number;
  key: string;
  value: string;
  comment: string;
}

let rowId = 1;

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Quote a value when it needs it (spaces, #, quotes, empty-ish). */
function encodeValue(v: string): string {
  if (v === "") return "";
  if (/[\s#"']/.test(v)) return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return v;
}

function EnvGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("env-generator", isPro);
  const seo = toolSeo;

  const [rows, setRows] = useState<EnvRow[]>([
    { id: rowId++, key: "DATABASE_URL", value: "postgres://user:pass@localhost:5432/app", comment: "Primary database" },
    { id: rowId++, key: "PORT", value: "3000", comment: "" },
  ]);
  const [tab, setTab] = useState<".env" | ".env.example">(".env");

  const setRow = (id: number, patch: Partial<EnvRow>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addRow = () => setRows((r) => [...r, { id: rowId++, key: "", value: "", comment: "" }]);
  const delRow = (id: number) => setRows((r) => r.filter((x) => x.id !== id));

  const problems = useMemo(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    const bad = new Set<number>();
    for (const r of rows) {
      const k = r.key.trim();
      if (k && !KEY_RE.test(k)) bad.add(r.id);
      if (k) {
        if (seen.has(k)) dup.add(k);
        seen.add(k);
      }
    }
    return { bad, dup };
  }, [rows]);

  const hasErrors = problems.bad.size > 0 || problems.dup.size > 0;

  const dotenv = useMemo(() => {
    const lines: string[] = [];
    for (const r of rows) {
      const k = r.key.trim();
      if (!k) continue;
      if (r.comment.trim()) lines.push(`# ${r.comment.trim()}`);
      lines.push(`${k}=${encodeValue(r.value)}`);
    }
    return lines.join("\n") + (lines.length ? "\n" : "");
  }, [rows]);

  const example = useMemo(() => {
    const lines: string[] = [];
    for (const r of rows) {
      const k = r.key.trim();
      if (!k) continue;
      if (r.comment.trim()) lines.push(`# ${r.comment.trim()}`);
      lines.push(`${k}=`);
    }
    return lines.join("\n") + (lines.length ? "\n" : "");
  }, [rows]);

  const activeText = tab === ".env" ? dotenv : example;

  const copyText = async (text: string, label: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(label);
    } catch {
      toast.error("Copy failed, select the text manually.");
    }
  };

  const download = (text: string, filename: string) => {
    if (!trial.canUse || hasErrors) return;
    downloadBlob(new Blob([text], { type: "text/plain" }), filename);
    trial.recordUse();
    toast.success(`${filename} downloaded`);
  };

  return (
    <ToolPageShell toolId="env-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Env Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
            <FileKey className="h-4 w-4" /> Environment variables
          </p>

          <div className="space-y-2">
            {rows.map((r) => {
              const badKey = r.key.trim() !== "" && !KEY_RE.test(r.key.trim());
              const dupKey = r.key.trim() !== "" && problems.dup.has(r.key.trim());
              return (
                <div key={r.id} className={cn("rounded-xl border p-2.5", badKey || dupKey ? "border-red-400" : "border-border")}>
                  <div className="flex gap-2">
                    <input
                      value={r.key}
                      onChange={(e) => setRow(r.id, { key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/gi, "") })}
                      placeholder="KEY"
                      spellCheck={false}
                      className="w-2/5 rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-sm font-bold outline-none focus:border-primary"
                    />
                    <input
                      value={r.value}
                      onChange={(e) => setRow(r.id, { value: e.target.value })}
                      placeholder="value"
                      spellCheck={false}
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => delRow(r.id)}
                      aria-label="Remove variable"
                      className="rounded-lg border border-border px-2.5 text-muted-foreground transition hover:border-red-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    value={r.comment}
                    onChange={(e) => setRow(r.id, { comment: e.target.value })}
                    placeholder="# optional comment for this variable"
                    className="mt-2 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  {badKey && <p className="mt-1 text-xs font-semibold text-red-500">KEY must start with a letter or _, then letters, digits or _.</p>}
                  {dupKey && <p className="mt-1 text-xs font-semibold text-red-500">Duplicate key: {r.key.trim()}</p>}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add variable
          </button>

          {hasErrors && (
            <p className="text-xs font-semibold text-red-500">Fix the key errors above before downloading.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-2.5">
            {([".env", ".env.example"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-mono text-sm font-bold transition",
                  tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
            <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
              {tab === ".env.example" ? "Same keys and comments, values blanked for safe sharing." : "Values are auto-quoted when they contain spaces or #."}
            </span>
          </div>
          <pre className="max-h-[420px] min-h-[240px] overflow-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-relaxed">
            {activeText || <span className="text-muted-foreground">Add a variable on the left to generate the file.</span>}
          </pre>
          <div className="flex flex-wrap gap-2 border-t border-border p-5">
            <ActionButton disabled={!trial.canUse || hasErrors || !activeText} onClick={() => download(activeText, tab)}>
              <Download className="h-4 w-4" /> Download {tab}
            </ActionButton>
            <ActionButton disabled={!trial.canUse || hasErrors || !dotenv} onClick={() => download(dotenv, ".env")}>
              <Download className="h-4 w-4" /> .env
            </ActionButton>
            <ActionButton disabled={!trial.canUse || hasErrors || !example} onClick={() => download(example, ".env.example")}>
              <Download className="h-4 w-4" /> .env.example
            </ActionButton>
            <button
              type="button"
              disabled={!trial.canUse || !activeText}
              onClick={() => void copyText(activeText, `${tab} copied`)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy {tab}
            </button>
          </div>
          {!isPro && (
            <p className="px-5 pb-4 text-xs text-muted-foreground">
              Never commit real secrets. The .env.example file is safe to share because every value is blank.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
