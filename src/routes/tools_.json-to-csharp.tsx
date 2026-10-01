// /tools/json-to-csharp - Generate C# DTO classes (System.Text.Json) from JSON,
// and reverse: generate sample JSON from pasted C# classes. 100% in-browser.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, Copy, Download, Eraser } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-to-csharp")({
  head: () => {
    const seo = getToolSeoMeta("json-to-csharp");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: JsonToCsharpTool,
});

function pascalCase(s: string): string {
  return s
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("") || "Property";
}

interface ClassDef {
  name: string;
  props: { csName: string; jsonName: string; type: string }[];
}

function inferType(value: unknown, propName: string, classes: ClassDef[], usedNames: Set<string>): string {
  if (value === null || value === undefined) return "object?";
  if (typeof value === "boolean") return "bool";
  if (typeof value === "string") return "string";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return Math.abs(value) > 2147483647 ? "long" : "int";
    return "double";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "List<object>";
    const elemTypes = value.map((v) => inferType(v, propName, classes, usedNames));
    const first = elemTypes[0];
    const uniform = elemTypes.every((t) => t === first);
    return `List<${uniform ? first : "object"}>`;
  }
  if (typeof value === "object") {
    const base = pascalCase(propName);
    let name = base;
    let n = 2;
    while (usedNames.has(name)) name = `${base}${n++}`;
    usedNames.add(name);
    const def: ClassDef = { name, props: [] };
    classes.push(def);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      def.props.push({
        csName: pascalCase(k),
        jsonName: k,
        type: inferType(v, k, classes, usedNames),
      });
    }
    return name;
  }
  return "object";
}

function generateCsharp(json: string, rootName: string): string {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Root JSON must be an object.");
  }
  const classes: ClassDef[] = [];
  const usedNames = new Set<string>();
  const root: ClassDef = { name: pascalCase(rootName) || "Root", props: [] };
  usedNames.add(root.name);
  classes.push(root);
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    root.props.push({ csName: pascalCase(k), jsonName: k, type: inferType(v, k, classes, usedNames) });
  }
  const body = classes
    .map(
      (c) =>
        `public class ${c.name}\n{\n${c.props
          .map(
            (p) =>
              `    [JsonPropertyName("${p.jsonName}")]\n    public ${p.type} ${p.csName} { get; set; }`,
          )
          .join("\n\n")}\n}`,
    )
    .join("\n\n");
  return `using System.Collections.Generic;\nusing System.Text.Json.Serialization;\n\n${body}\n`;
}

/** Best-effort: parse C# auto-properties into a sample JSON object. */
function csharpToJson(cs: string): string {
  const lines = cs.split("\n");
  const obj: Record<string, unknown> = {};
  const propRe = /public\s+([\w<>\?,\s\[\]]+?)\s+(\w+)\s*\{\s*get;\s*set;\s*\}/;
  for (let i = 0; i < lines.length; i++) {
    const m = (lines[i] ?? "").match(propRe);
    if (!m) continue;
    const type = (m[1] ?? "").trim().replace(/\?$/, "");
    let key = m[2] ?? "";
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      const attr = (lines[j] ?? "").match(/\[JsonPropertyName\("([^"]+)"\)\]/);
      if (attr) { key = attr[1] ?? ""; break; }
    }
    const t = type.replace(/\s+/g, "");
    let sample: unknown;
    if (/^string$/i.test(t)) sample = "";
    else if (/^bool$/i.test(t)) sample = false;
    else if (/^int|long|short|byte$/i.test(t)) sample = 0;
    else if (/^double|float|decimal$/i.test(t)) sample = 0.0;
    else if (/^DateTime$/i.test(t)) sample = "2026-01-01T00:00:00";
    else if (/^Guid$/i.test(t)) sample = "00000000-0000-0000-0000-000000000000";
    else if (/^List</i.test(t)) sample = [];
    else if (/^\w+\[\]$/.test(t)) sample = [];
    else sample = {};
    obj[key] = sample;
  }
  if (Object.keys(obj).length === 0) throw new Error("No public auto-properties found.");
  return JSON.stringify(obj, null, 2) + "\n";
}

function JsonToCsharpTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-to-csharp", isPro);
  const seo = getToolSeo("json-to-csharp");

  const [tab, setTab] = useState<"to-csharp" | "to-json">("to-csharp");
  const [rootName, setRootName] = useState("Root");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    if (!input.trim() || !trial.canUse) return;
    try {
      setOutput(tab === "to-csharp" ? generateCsharp(input, rootName) : csharpToJson(input));
      setError(null);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not convert that input.");
    }
  }, [input, rootName, tab, trial]);

  const copy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Output copied");
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  }, [output]);

  const download = useCallback(() => {
    if (!output) return;
    const ext = tab === "to-csharp" ? "cs" : "json";
    downloadBlob(new Blob([output], { type: "text/plain" }), `${pascalCase(rootName)}.${ext}`);
    toast.success("File downloaded");
  }, [output, tab, rootName]);

  const clear = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  return (
    <ToolPageShell toolId="json-to-csharp" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON to C#" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-border p-1">
              {(
                [
                  { id: "to-csharp", label: "JSON to C#" },
                  { id: "to-json", label: "C# to JSON" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTab(t.id); setOutput(""); setError(null); }}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
                    tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "to-csharp" && (
              <label className="text-[13px] font-medium text-foreground/80">
                Root class name
                <input
                  value={rootName}
                  onChange={(e) => setRootName(e.target.value)}
                  className="ml-2 w-36 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm"
                />
              </label>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tab === "to-csharp" ? 'Paste JSON, e.g. {"name": "Ada", "age": 36}' : "Paste a C# class with auto-properties"}
            spellCheck={false}
            className="h-48 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton disabled={!input.trim() || !trial.canUse} onClick={run}>
              <ArrowRightLeft className="h-4 w-4" /> Generate
            </ActionButton>
            <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Generated output</p>
            {output && (
              <div className="flex gap-2">
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button type="button" onClick={download} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Generated code appears here"
            spellCheck={false}
            className="h-56 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </div>

        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Types are inferred from your JSON: strings, booleans, integers, doubles, nested
          objects (become their own classes) and arrays (become
          <code className="rounded bg-muted px-1">List&lt;T&gt;</code>). Every property gets a
          <code className="rounded bg-muted px-1">[JsonPropertyName]</code> attribute so the
          original JSON keys keep working. Reverse conversion is best-effort and fills sample
          values by type.
        </p>
      </div>
    </ToolPageShell>
  );
}
