// /tools/formdata-inspector - Build a FormData object field by field and
// see the exact multipart body it would send. 100% client-side.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardPaste, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/formdata-inspector")({
  head: () => {
    const seo = getToolSeoMeta("formdata-inspector");
    const canonical = "https://iconvault.site/tools/formdata-inspector";
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
  component: FormDataInspector,
});

interface Field {
  id: number;
  name: string;
  kind: "text" | "file";
  text: string;
  file: File | null;
}

interface Preview {
  boundary: string;
  body: string;
  estimatedBytes: number;
  entries: { name: string; kind: string; detail: string }[];
}

let nextId = 1;

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function FormDataInspector() {
  const { isPro } = usePlan();
  const trial = useToolTrial("formdata-inspector", isPro);
  const seo = getToolSeo("formdata-inspector");

  const [fields, setFields] = useState<Field[]>([
    { id: nextId++, name: "username", kind: "text", text: "sameer", file: null },
    { id: nextId++, name: "avatar", kind: "file", text: "", file: null },
  ]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const update = (id: number, patch: Partial<Field>) =>
    setFields((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const addField = () =>
    setFields((p) => [...p, { id: nextId++, name: `field${p.length + 1}`, kind: "text", text: "", file: null }]);

  const removeField = (id: number) => setFields((p) => p.filter((f) => f.id !== id));

  const build = () => {
    if (!trial.canUse) return;
    const named = fields.filter((f) => f.name.trim() !== "");
    if (named.length === 0) {
      toast.error("Add at least one field with a name.");
      return;
    }
    const boundary = "----IconVault" + Math.random().toString(16).slice(2, 14);
    const parts: string[] = [];
    let estimated = 0;
    const entries: Preview["entries"] = [];

    // Prove it with a real FormData object too
    const fd = new FormData();
    for (const f of named) {
      if (f.kind === "text") {
        fd.append(f.name, f.text);
      } else if (f.file) {
        fd.append(f.name, f.file, f.file.name);
      } else {
        fd.append(f.name, new Blob([]), "empty.bin");
      }
    }

    for (const [name, value] of fd.entries()) {
      if (typeof value === "string") {
        parts.push(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
        );
        entries.push({ name, kind: "text", detail: value === "" ? "(empty string)" : value });
      } else {
        const file = value as File;
        parts.push(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${file.name}"\r\n` +
            `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n<${fmtBytes(file.size)} of binary data>\r\n`,
        );
        estimated += file.size;
        entries.push({ name, kind: "file", detail: `${file.name} (${fmtBytes(file.size)})` });
      }
    }
    parts.push(`--${boundary}--\r\n`);
    const body = parts.join("");
    estimated += new TextEncoder().encode(body.replace(/<\d+(\.\d+)? (B|KB|MB) of binary data>/g, "")).length;

    setPreview({ boundary, body, estimatedBytes: estimated, entries });
    trial.recordUse();
    toast.success("Multipart body built");
  };

  const download = () => {
    if (!preview) return;
    downloadBlob(new Blob([preview.body], { type: "text/plain" }), "multipart-body.txt");
    toast.success("Body preview downloaded");
  };

  return (
    <ToolPageShell toolId="formdata-inspector" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="FormData Inspector" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Fields</p>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add field
            </button>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {fields.map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={f.name}
                    onChange={(e) => update(f.id, { name: e.target.value })}
                    placeholder="field name"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs"
                  />
                  <select
                    value={f.kind}
                    onChange={(e) => update(f.id, { kind: e.target.value as "text" | "file" })}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold"
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeField(f.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {f.kind === "text" ? (
                  <input
                    value={f.text}
                    onChange={(e) => update(f.id, { text: e.target.value })}
                    placeholder="value"
                    className="mt-2 w-full rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs"
                  />
                ) : (
                  <div className="mt-2">
                    <input
                      ref={(el) => {
                        fileRefs.current[f.id] = el;
                      }}
                      type="file"
                      className="hidden"
                      onChange={(e) => update(f.id, { file: e.target.files?.[0] ?? null })}
                    />
                    <button
                      type="button"
                      onClick={() => fileRefs.current[f.id]?.click()}
                      className={cn(
                        "w-full rounded-lg border border-dashed px-2.5 py-2 text-left font-mono text-xs transition",
                        f.file
                          ? "border-primary/50 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {f.file ? `${f.file.name} (${fmtBytes(f.file.size)})` : "Choose a file..."}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <ActionButton disabled={!trial.canUse} onClick={build}>
            <ClipboardPaste className="h-4 w-4" /> Build multipart preview
          </ActionButton>
          {preview && (
            <button
              type="button"
              onClick={download}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Download className="h-4 w-4" /> Download body (.txt)
            </button>
          )}
        </div>

        <div className="space-y-5">
          {!preview ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
              <ClipboardPaste className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your multipart body appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add fields on the left, then build to see every entry plus the exact wire format with
                boundaries, as the server would receive it.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">Entries ({preview.entries.length})</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Content-Type: multipart/form-data; boundary={preview.boundary}
                  </p>
                </div>
                <div className="space-y-2">
                  {preview.entries.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          e.kind === "text"
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                            : "bg-violet-500/15 text-violet-600 dark:text-violet-400",
                        )}
                      >
                        {e.kind}
                      </span>
                      <span className="font-mono text-xs font-semibold">{e.name}</span>
                      <span className="truncate font-mono text-xs text-muted-foreground">{e.detail}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Estimated request size: <span className="font-bold text-foreground">{fmtBytes(preview.estimatedBytes)}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-sm font-bold">Raw multipart body</p>
                <pre className="max-h-[420px] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200">
                  {preview.body}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
