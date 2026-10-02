// /tools/editorconfig-generator - Visual .editorconfig builder. Root
// toggle, per-section rows ([*], [*.{js,ts}], [Makefile]...), live
// .editorconfig output, copy + download. 100% client-side.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/editorconfig-generator")({
  head: () => {
    const seo = getToolSeoMeta("editorconfig-generator");
    const canonical = "https://iconvault.site/tools/editorconfig-generator";
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
  component: EditorconfigTool,
});

interface Section {
  id: number;
  pattern: string;
  indentStyle: "space" | "tab";
  indentSize: number;
  endOfLine: "lf" | "crlf" | "cr";
  charset: string;
  trimTrailing: boolean;
  insertNewline: boolean;
  maxLine: string;
}

const CHARSETS = ["utf-8", "latin1", "utf-16be", "utf-16le", "unset"];
const EOLS = ["lf", "crlf", "cr"];

function makeSection(id: number, pattern: string, over: Partial<Section> = {}): Section {
  return {
    id,
    pattern,
    indentStyle: "space",
    indentSize: 2,
    endOfLine: "lf",
    charset: "utf-8",
    trimTrailing: true,
    insertNewline: true,
    maxLine: "",
    ...over,
  };
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-left transition hover:border-primary/40"
    >
      <span className="font-mono text-[12px] font-bold">{label}</span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function MiniSel({ label, value, options, onChange, disabled }: { label: string; value: string; options: (string | number)[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className={cn("block", disabled && "opacity-40")}>
      <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-2.5 py-2 font-mono text-[13px] outline-none focus:border-primary disabled:cursor-not-allowed"
      >
        {options.map((o) => (
          <option key={String(o)} value={String(o)}>{o}</option>
        ))}
      </select>
    </label>
  );
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function EditorconfigTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("editorconfig-generator", isPro);
  const seo = getToolSeo("editorconfig-generator");

  const idRef = useRef(4);
  const [root, setRoot] = useState(true);
  const [sections, setSections] = useState<Section[]>([
    makeSection(1, "[*]"),
    makeSection(2, "[*.{js,ts,tsx}]", { indentSize: 2 }),
    makeSection(3, "[Makefile]", { indentStyle: "tab" }),
  ]);
  const [copied, setCopied] = useState(false);

  const patch = (id: number, p: Partial<Section>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const addSection = () => {
    const id = idRef.current++;
    setSections((prev) => [...prev, makeSection(id, "[*.{py,md}]")]);
  };

  const removeSection = (id: number) =>
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  const output = useMemo(() => {
    const lines: string[] = [];
    lines.push("# Generated with IconVault's EditorConfig Generator");
    lines.push(`root = ${root}`);
    for (const s of sections) {
      lines.push("");
      lines.push(s.pattern.trim() || "[*]");
      lines.push(`charset = ${s.charset}`);
      lines.push(`end_of_line = ${s.endOfLine}`);
      if (s.indentStyle === "space") lines.push(`indent_size = ${s.indentSize}`);
      lines.push(`indent_style = ${s.indentStyle}`);
      lines.push(`insert_final_newline = ${s.insertNewline}`);
      lines.push(`trim_trailing_whitespace = ${s.trimTrailing}`);
      if (s.maxLine.trim()) lines.push(`max_line_length = ${s.maxLine.trim()}`);
    }
    return lines.join("\n");
  }, [root, sections]);

  const doCopy = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(output);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success(".editorconfig copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const doDownload = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output + "\n"], { type: "text/plain" }), ".editorconfig");
    trial.recordUse();
    toast.success(".editorconfig downloaded");
  };

  return (
    <ToolPageShell toolId="editorconfig-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="EditorConfig Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <Toggle label="root = true" checked={root} onChange={setRoot} />
            <p className="mt-2 text-xs text-muted-foreground">
              Marks this file as the topmost EditorConfig. Editors stop looking for parent configs when this is true.
            </p>
          </div>

          {sections.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={s.pattern}
                  onChange={(e) => patch(s.id, { pattern: e.target.value })}
                  aria-label="Section pattern"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm font-bold outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => removeSection(s.id)}
                  aria-label="Remove section"
                  className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MiniSel label="indent_style" value={s.indentStyle} options={["space", "tab"]} onChange={(v) => patch(s.id, { indentStyle: v as "space" | "tab" })} />
                <MiniSel label="indent_size" value={String(s.indentSize)} options={[2, 4, 8]} onChange={(v) => patch(s.id, { indentSize: Number(v) })} disabled={s.indentStyle === "tab"} />
                <MiniSel label="end_of_line" value={s.endOfLine} options={EOLS} onChange={(v) => patch(s.id, { endOfLine: v as Section["endOfLine"] })} />
                <MiniSel label="charset" value={s.charset} options={CHARSETS} onChange={(v) => patch(s.id, { charset: v })} />
              </div>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <Toggle label="trim_trailing_whitespace" checked={s.trimTrailing} onChange={(v) => patch(s.id, { trimTrailing: v })} />
                <Toggle label="insert_final_newline" checked={s.insertNewline} onChange={(v) => patch(s.id, { insertNewline: v })} />
              </div>
              <div className="mt-2.5">
                <label className="block">
                  <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">max_line_length (blank = unset)</span>
                  <input
                    value={s.maxLine}
                    onChange={(e) => patch(s.id, { maxLine: e.target.value.replace(/[^0-9]/g, "") })}
                    placeholder="e.g. 100"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSection}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-3.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Add a section
          </button>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">.editorconfig - live preview</p>
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
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left. Everything runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
