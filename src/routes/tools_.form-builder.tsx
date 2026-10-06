// /tools/form-builder - Add form fields, tune labels and options, see a
// live preview, then export as HTML, React or Vue code.
// 100% client-side, nothing is uploaded.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Check, Copy, Download, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/form-builder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/form-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/form-builder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/form-builder";
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
  component: FormBuilderTool,
});

const FIELD_TYPES = [
  { id: "text", label: "Text" },
  { id: "email", label: "Email" },
  { id: "number", label: "Number" },
  { id: "password", label: "Password" },
  { id: "textarea", label: "Textarea" },
  { id: "select", label: "Select" },
  { id: "checkbox", label: "Checkbox" },
  { id: "radio", label: "Radio" },
  { id: "date", label: "Date" },
  { id: "file", label: "File" },
] as const;

type FieldType = (typeof FIELD_TYPES)[number]["id"];
type ExportTab = "html" | "react" | "vue";

interface FieldDef {
  id: number;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
}

const HAS_PLACEHOLDER: FieldType[] = ["text", "email", "number", "password", "textarea", "date"];
const HAS_OPTIONS: FieldType[] = ["select", "radio"];

const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";

const slug = (s: string, fallback: string) => {
  const v = s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return v || fallback;
};

function fieldName(f: FieldDef, i: number) {
  return slug(f.label, `field_${i + 1}`);
}

function buildHtml(fields: FieldDef[]): string {
  const lines = ['<form action="#" method="post">'];
  fields.forEach((f, i) => {
    const name = fieldName(f, i);
    const req = f.required ? " required" : "";
    const ph = f.placeholder ? ` placeholder="${f.placeholder}"` : "";
    lines.push("  <div>");
    if (f.type === "checkbox") {
      lines.push(`    <label><input type="checkbox" name="${name}"${req} /> ${f.label}</label>`);
    } else if (f.type === "radio") {
      lines.push(`    <fieldset><legend>${f.label}</legend>`);
      f.options.forEach((o) => lines.push(`      <label><input type="radio" name="${name}" value="${o}"${req} /> ${o}</label>`));
      lines.push("    </fieldset>");
    } else if (f.type === "select") {
      lines.push(`    <label for="${name}">${f.label}</label>`);
      lines.push(`    <select id="${name}" name="${name}"${req}>`);
      f.options.forEach((o) => lines.push(`      <option value="${o}">${o}</option>`));
      lines.push("    </select>");
    } else if (f.type === "textarea") {
      lines.push(`    <label for="${name}">${f.label}</label>`);
      lines.push(`    <textarea id="${name}" name="${name}"${ph}${req}></textarea>`);
    } else {
      lines.push(`    <label for="${name}">${f.label}</label>`);
      lines.push(`    <input type="${f.type}" id="${name}" name="${name}"${ph}${req} />`);
    }
    lines.push("  </div>");
  });
  lines.push('  <button type="submit">Submit</button>');
  lines.push("</form>");
  return lines.join("\n");
}

function buildReact(fields: FieldDef[]): string {
  const lines = [
    "export default function GeneratedForm() {",
    "  const handleSubmit = (e) => {",
    "    e.preventDefault();",
    "    // handle the form data here",
    "  };",
    "",
    "  return (",
    '    <form onSubmit={handleSubmit}>',
  ];
  fields.forEach((f, i) => {
    const name = fieldName(f, i);
    const req = f.required ? " required" : "";
    const ph = f.placeholder ? ` placeholder="${f.placeholder}"` : "";
    lines.push("      <div>");
    if (f.type === "checkbox") {
      lines.push(`        <label><input type="checkbox" name="${name}"${req} /> ${f.label}</label>`);
    } else if (f.type === "radio") {
      lines.push(`        <fieldset><legend>${f.label}</legend>`);
      f.options.forEach((o) => lines.push(`          <label><input type="radio" name="${name}" value="${o}"${req} /> ${o}</label>`));
      lines.push("        </fieldset>");
    } else if (f.type === "select") {
      lines.push(`        <label htmlFor="${name}">${f.label}</label>`);
      lines.push(`        <select id="${name}" name="${name}"${req}>`);
      f.options.forEach((o) => lines.push(`          <option value="${o}">${o}</option>`));
      lines.push("        </select>");
    } else if (f.type === "textarea") {
      lines.push(`        <label htmlFor="${name}">${f.label}</label>`);
      lines.push(`        <textarea id="${name}" name="${name}"${ph}${req} />`);
    } else {
      lines.push(`        <label htmlFor="${name}">${f.label}</label>`);
      lines.push(`        <input type="${f.type}" id="${name}" name="${name}"${ph}${req} />`);
    }
    lines.push("      </div>");
  });
  lines.push('      <button type="submit">Submit</button>');
  lines.push("    </form>");
  lines.push("  );");
  lines.push("}");
  return lines.join("\n");
}

function buildVue(fields: FieldDef[]): string {
  const lines = ["<template>", '  <form @submit.prevent="handleSubmit">'];
  fields.forEach((f, i) => {
    const name = fieldName(f, i);
    const req = f.required ? " required" : "";
    const ph = f.placeholder ? ` placeholder="${f.placeholder}"` : "";
    lines.push("    <div>");
    if (f.type === "checkbox") {
      lines.push(`      <label><input type="checkbox" name="${name}"${req} /> ${f.label}</label>`);
    } else if (f.type === "radio") {
      lines.push(`      <fieldset><legend>${f.label}</legend>`);
      f.options.forEach((o) => lines.push(`        <label><input type="radio" name="${name}" value="${o}"${req} /> ${o}</label>`));
      lines.push("      </fieldset>");
    } else if (f.type === "select") {
      lines.push(`      <label for="${name}">${f.label}</label>`);
      lines.push(`      <select id="${name}" name="${name}"${req}>`);
      f.options.forEach((o) => lines.push(`        <option value="${o}">${o}</option>`));
      lines.push("      </select>");
    } else if (f.type === "textarea") {
      lines.push(`      <label for="${name}">${f.label}</label>`);
      lines.push(`      <textarea id="${name}" name="${name}"${ph}${req}></textarea>`);
    } else {
      lines.push(`      <label for="${name}">${f.label}</label>`);
      lines.push(`      <input type="${f.type}" id="${name}" name="${name}"${ph}${req} />`);
    }
    lines.push("    </div>");
  });
  lines.push('    <button type="submit">Submit</button>');
  lines.push("  </form>");
  lines.push("</template>");
  lines.push("");
  lines.push("<script setup>");
  lines.push("function handleSubmit() {");
  lines.push("  // handle the form data here");
  lines.push("}");
  lines.push("</script>");
  return lines.join("\n");
}

const EXPORT_META: { id: ExportTab; label: string; ext: string; mime: string }[] = [
  { id: "html", label: "HTML", ext: "html", mime: "text/html" },
  { id: "react", label: "React", ext: "jsx", mime: "text/jsx" },
  { id: "vue", label: "Vue", ext: "vue", mime: "text/plain" },
];

function FormBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("form-builder", isPro);
  const seo = toolSeo;

  const idRef = useRef(1);
  const [fields, setFields] = useState<FieldDef[]>([
    { id: 0, type: "text", label: "Full name", placeholder: "Jane Doe", required: true, options: [] },
    { id: -1, type: "email", label: "Email", placeholder: "jane@example.com", required: true, options: [] },
    { id: -2, type: "select", label: "Plan", placeholder: "", required: false, options: ["Free", "Pro"] },
  ]);
  const [selectedId, setSelectedId] = useState<number | null>(0);
  const [tab, setTab] = useState<ExportTab>("html");
  const [copied, setCopied] = useState(false);

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  const addField = (type: FieldType) => {
    const id = idRef.current++;
    const typeLabel = FIELD_TYPES.find((t) => t.id === type)!.label;
    setFields((p) => [
      ...p,
      { id, type, label: `${typeLabel} field`, placeholder: "", required: false, options: HAS_OPTIONS.includes(type) ? ["Option 1", "Option 2"] : [] },
    ]);
    setSelectedId(id);
  };

  const update = (id: number, patch: Partial<FieldDef>) =>
    setFields((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const remove = (id: number) => {
    setFields((p) => p.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const move = (id: number, dir: -1 | 1) =>
    setFields((p) => {
      const i = p.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.length) return p;
      const next = p.slice();
      const a = next[i];
      const b = next[j];
      if (a === undefined || b === undefined) return p;
      next[i] = b;
      next[j] = a;
      return next;
    });

  const code = useMemo(() => {
    if (tab === "html") return buildHtml(fields);
    if (tab === "react") return buildReact(fields);
    return buildVue(fields);
  }, [fields, tab]);
  const meta = EXPORT_META.find((m) => m.id === tab)!;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const download = () => {
    if (!trial.canUse || fields.length === 0) return;
    downloadBlob(new Blob([code], { type: meta.mime }), `form.${meta.ext}`);
    trial.recordUse();
    toast.success("Form code downloaded");
  };

  const previewField = (f: FieldDef, i: number) => {
    const name = fieldName(f, i);
    const common = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
    if (f.type === "checkbox") {
      return (
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" required={f.required} className="h-4 w-4 accent-primary" />
          {f.label} {f.required && <span className="text-red-500">*</span>}
        </label>
      );
    }
    if (f.type === "radio") {
      return (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">{f.label} {f.required && <span className="text-red-500">*</span>}</legend>
          <div className="space-y-1.5">
            {f.options.map((o, oi) => (
              <label key={oi} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name={`preview-${name}`} value={o} required={f.required} className="h-4 w-4 accent-primary" />
                {o}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }
    if (f.type === "select") {
      return (
        <div>
          <label className={labelCls}>{f.label} {f.required && <span className="text-red-500">*</span>}</label>
          <select required={f.required} className={common}>
            {f.options.map((o, oi) => (
              <option key={oi}>{o}</option>
            ))}
          </select>
        </div>
      );
    }
    if (f.type === "textarea") {
      return (
        <div>
          <label className={labelCls}>{f.label} {f.required && <span className="text-red-500">*</span>}</label>
          <textarea rows={3} placeholder={f.placeholder || undefined} required={f.required} className={common} />
        </div>
      );
    }
    return (
      <div>
        <label className={labelCls}>{f.label} {f.required && <span className="text-red-500">*</span>}</label>
        <input type={f.type} placeholder={f.placeholder || undefined} required={f.required} className={common} />
      </div>
    );
  };

  return (
    <ToolPageShell toolId="form-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Form Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Add a field</p>
            <div className="flex flex-wrap gap-2">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addField(t.id)}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  <Plus className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Fields ({fields.length})</p>
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No fields yet. Add one above.</p>
            )}
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 transition",
                    selectedId === f.id ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <button type="button" onClick={() => setSelectedId(f.id)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold">{f.label || "(no label)"}</span>
                    <span className="text-xs text-muted-foreground">
                      {FIELD_TYPES.find((t) => t.id === f.type)!.label}{f.required ? " · required" : ""}
                    </span>
                  </button>
                  <button type="button" onClick={() => move(f.id, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1 hover:bg-muted disabled:opacity-30">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(f.id, 1)} disabled={i === fields.length - 1} aria-label="Move down" className="rounded p-1 hover:bg-muted disabled:opacity-30">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(f.id)} aria-label="Remove field" className="rounded p-1 text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {selected && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-sm font-bold">Edit field</p>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Label</label>
                  <input value={selected.label} onChange={(e) => update(selected.id, { label: e.target.value })} className={inputCls} />
                </div>
                {HAS_PLACEHOLDER.includes(selected.type) && (
                  <div>
                    <label className={labelCls}>Placeholder</label>
                    <input value={selected.placeholder} onChange={(e) => update(selected.id, { placeholder: e.target.value })} className={inputCls} />
                  </div>
                )}
                {HAS_OPTIONS.includes(selected.type) && (
                  <div>
                    <label className={labelCls}>Options</label>
                    <div className="space-y-2">
                      {selected.options.map((o, oi) => (
                        <div key={oi} className="flex gap-2">
                          <input
                            value={o}
                            onChange={(e) =>
                              update(selected.id, { options: selected.options.map((x, xi) => (xi === oi ? e.target.value : x)) })
                            }
                            className={inputCls}
                          />
                          <button
                            type="button"
                            onClick={() => update(selected.id, { options: selected.options.filter((_, xi) => xi !== oi) })}
                            aria-label="Remove option"
                            className="shrink-0 rounded-lg border border-border px-2.5 text-red-500 hover:border-red-500/50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => update(selected.id, { options: [...selected.options, `Option ${selected.options.length + 1}`] })}
                        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add option
                      </button>
                    </div>
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={selected.required}
                    onChange={(e) => update(selected.id, { required: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  Required
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="mb-4 text-sm font-bold">Live preview</p>
            {fields.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Add fields to see the preview.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.info("Preview only: this form does not submit anywhere.");
                }}
                className="mx-auto max-w-md space-y-4"
              >
                {fields.map((f, i) => (
                  <div key={f.id}>{previewField(f, i)}</div>
                ))}
                <button type="submit" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                  Submit
                </button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 rounded-lg border border-border p-1">
                {EXPORT_META.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTab(m.id)}
                    className={cn(
                      "rounded-md px-4 py-1.5 text-xs font-bold transition",
                      tab === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  disabled={fields.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <ActionButton busy={false} disabled={!trial.canUse || fields.length === 0} onClick={download}>
                  <Download className="h-4 w-4" /> .{meta.ext}
                </ActionButton>
              </div>
            </div>
            <pre className="max-h-[440px] overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
              {fields.length === 0 ? "Add fields to generate code." : code}
            </pre>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free downloads left. Building and copying are unlimited. The exported code is a starting point: style and validation are up to you.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
