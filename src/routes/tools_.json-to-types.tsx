// /tools/json-to-types - Paste JSON and generate type definitions for
// TypeScript, Go, Python, Rust or C#. 100% client-side, runs in your browser,
// nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Code2, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-to-types")({
  head: () => {
    const seo = getToolSeoMeta("json-to-types");
    const canonical = "https://iconvault.site/tools/json-to-types";
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
  component: JsonToTypesTool,
});

type Lang = "ts" | "go" | "py" | "rs" | "cs";

const LANGS: { id: Lang; label: string; ext: string }[] = [
  { id: "ts", label: "TypeScript", ext: "ts" },
  { id: "go", label: "Go", ext: "go" },
  { id: "py", label: "Python", ext: "py" },
  { id: "rs", label: "Rust", ext: "rs" },
  { id: "cs", label: "C#", ext: "cs" },
];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pascal(s: string): string {
  const clean = s.replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const name = clean || "Value";
  return /^[A-Za-z]/.test(name) ? name : `T${name}`;
}

interface Field {
  jsonName: string;
  type: string;
  optional: boolean;
}

interface TypeDef {
  name: string;
  fields: Field[];
}

type PrimKey = "string" | "int" | "float" | "bool" | "any";
const PRIM: Record<Lang, Record<PrimKey, string>> = {
  ts: { string: "string", int: "number", float: "number", bool: "boolean", any: "any" },
  go: { string: "string", int: "int", float: "float64", bool: "bool", any: "interface{}" },
  py: { string: "str", int: "int", float: "float", bool: "bool", any: "Any" },
  rs: { string: "String", int: "i64", float: "f64", bool: "bool", any: "serde_json::Value" },
  cs: { string: "string", int: "int", float: "double", bool: "bool", any: "object" },
};

function inferType(v: unknown, suggest: string, lang: Lang, defs: TypeDef[], seen: Map<string, string>): string {
  const P = PRIM[lang];
  if (v === null) return P["any"];
  if (typeof v === "string") return P["string"];
  if (typeof v === "boolean") return P["bool"];
  if (typeof v === "number") return Number.isInteger(v) ? P["int"] : P["float"];
  if (Array.isArray(v)) {
    if (v.length === 0) return lang === "ts" ? `${P["any"]}[]` : arrayOf(P["any"], lang);
    const kinds = new Set(v.map((el) => inferType(el, suggest, lang, defs, seen)));
    if (kinds.size === 1) {
      const el = [...kinds][0] ?? "";
      return lang === "ts" ? `${el}[]` : arrayOf(el, lang);
    }
    return lang === "ts" ? `${P["any"]}[]` : arrayOf(P["any"], lang);
  }
  if (isPlainObject(v)) {
    const name = uniqueName(pascal(suggest), seen);
    buildDef(v, name, lang, defs, seen);
    return name;
  }
  return P["any"];
}

function arrayOf(el: string, lang: Lang): string {
  switch (lang) {
    case "go": return `[]${el}`;
    case "py": return `List[${el}]`;
    case "rs": return `Vec<${el}>`;
    case "cs": return `List<${el}>`;
    default: return `${el}[]`;
  }
}

function uniqueName(base: string, seen: Map<string, string>): string {
  let name = base;
  let n = 2;
  while (seen.has(name)) {
    name = `${base}${n}`;
    n++;
  }
  seen.set(name, name);
  return name;
}

function buildDef(obj: Record<string, unknown>, name: string, lang: Lang, defs: TypeDef[], seen: Map<string, string>) {
  const fields: Field[] = [];
  for (const k of Object.keys(obj)) {
    const t = inferType(obj[k], `${name}${pascal(k)}`, lang, defs, seen);
    fields.push({ jsonName: k, type: t, optional: obj[k] === null || obj[k] === undefined });
  }
  // detect optionality across array-of-object merges is handled by caller passing merged objects
  defs.push({ name, fields });
}

function fieldDecl(lang: Lang, def: TypeDef, f: Field): string {
  const t = f.type;
  switch (lang) {
    case "ts":
      return `  ${f.jsonName}${f.optional ? "?" : ""}: ${f.optional && t !== "any" ? `${t} | null` : t};`;
    case "go": {
      const gt = f.optional && !t.startsWith("[]") && t !== "interface{}" ? `*${t}` : t;
      return `  ${pascal(f.jsonName)} ${gt} \`json:"${f.jsonName}"\``;
    }
    case "py":
      return `  ${f.jsonName}: ${f.optional ? `Optional[${t}]` : t}${f.optional ? " = None" : ""}`;
    case "rs":
      return `  pub ${f.jsonName}: ${f.optional ? `Option<${t}>` : t},`;
    case "cs": {
      const nullable = f.optional && t !== "string" && t !== "object" ? "?" : "";
      return `  [JsonPropertyName("${f.jsonName}")]\n  public ${t}${nullable} ${pascal(f.jsonName)} { get; set; }`;
    }
  }
}

function emit(lang: Lang, defs: TypeDef[]): string {
  const head: string[] = [];
  if (lang === "py") head.push("from dataclasses import dataclass", "from typing import Any, List, Optional", "");
  if (lang === "rs") head.push("use serde::{Deserialize, Serialize};", "");
  if (lang === "cs") head.push("using System.Collections.Generic;", 'using System.Text.Json.Serialization;', "");
  if (lang === "go") head.push("package main", "");

  const bodies = [...defs].reverse().map((d) => {
    const fields = d.fields.map((f) => fieldDecl(lang, d, f)).join("\n");
    switch (lang) {
      case "ts": return `export interface ${d.name} {\n${fields}\n}`;
      case "go": return `type ${d.name} struct {\n${fields}\n}`;
      case "py": return `@dataclass\nclass ${d.name}:\n${fields || "  pass"}`;
      case "rs": return `#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct ${d.name} {\n${fields}\n}`;
      case "cs": return `public class ${d.name}\n{\n${fields}\n}`;
    }
  });
  return [...head, ...bodies].join("\n\n");
}

const SAMPLE = `{
  "id": 1,
  "name": "IconVault",
  "price": 29.99,
  "inStock": true,
  "tags": ["icons", "tools"],
  "meta": { "author": "Sameer", "license": "MIT" },
  "deletedAt": null
}`;

function JsonToTypesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-to-types", isPro);
  const seo = getToolSeo("json-to-types");

  const [input, setInput] = useState("");
  const [lang, setLang] = useState<Lang>("ts");
  const [rootName, setRootName] = useState("Root");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const generate = () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const parsed: unknown = JSON.parse(input);
      const defs: TypeDef[] = [];
      const seen = new Map<string, string>();
      const root = pascal(rootName.trim() || "Root");
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && parsed.every(isPlainObject)) {
          // merge array-of-objects: fields present in every item are required
          const allKeys = new Set<string>();
          for (const el of parsed) for (const k of Object.keys(el)) allKeys.add(k);
          const merged: Record<string, unknown> = {};
          const optional = new Set<string>();
          for (const k of allKeys) {
            const vals = parsed.filter((el) => k in el).map((el) => (el as Record<string, unknown>)[k]);
            merged[k] = vals.find((v) => v !== null && v !== undefined) ?? null;
            if (vals.length !== parsed.length || vals.some((v) => v === null)) optional.add(k);
          }
          const name = uniqueName(root, seen);
          const fields: Field[] = [];
          for (const k of Object.keys(merged)) {
            fields.push({ jsonName: k, type: inferType(merged[k], `${name}${pascal(k)}`, lang, defs, seen), optional: optional.has(k) });
          }
          defs.push({ name, fields });
          const body = emit(lang, defs);
          setOutput(lang === "ts" ? `export type ${root} = ${name}[];\n\n${body}` : body);
        } else {
          const t = inferType(parsed, root, lang, defs, seen);
          setOutput(lang === "ts" ? `export type ${root} = ${t};` : `// root type: ${t}\n${emit(lang, defs)}`);
        }
      } else if (isPlainObject(parsed)) {
        const name = uniqueName(root, seen);
        buildDef(parsed, name, lang, defs, seen);
        setOutput(emit(lang, defs));
      } else {
        const t = inferType(parsed, root, lang, defs, seen);
        setOutput(lang === "ts" ? `export type ${root} = ${t};` : `// root type: ${t}`);
      }
      trial.recordUse();
      toast.success("Types generated");
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`);
      setOutput("");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Types copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const download = () => {
    if (!output) return;
    const ext = LANGS.find((l) => l.id === lang)?.ext ?? "txt";
    downloadBlob(new Blob([output], { type: "text/plain" }), `${(rootName.trim() || "root").toLowerCase()}.${ext}`);
    toast.success("File downloaded");
  };

  return (
    <ToolPageShell toolId="json-to-types" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON to Types" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">JSON input</span>
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Sample
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            spellCheck={false}
            className="h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Generated types</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
          {output ? (
            <pre className="h-72 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed">
              {output}
            </pre>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Code2 className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">Pick a language and hit Generate</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <span className="mb-2 block text-[13px] font-medium text-foreground/80">Target language</span>
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLang(l.id)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    lang === l.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="root-name" className="mb-2 block text-[13px] font-medium text-foreground/80">Root type name</label>
            <input
              id="root-name"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              placeholder="Root"
              spellCheck={false}
              className="w-48 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="ml-auto">
            <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={generate}>
              <Code2 className="h-4 w-4" /> {busy ? "Generating..." : "Generate"}
            </ActionButton>
          </div>
        </div>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free generations left. Runs in your browser, nothing is uploaded.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Note: nested objects become named types. Nullable fields become Optional / Option / pointers. Mixed-type arrays fall back to Any.
        </p>
      </div>
    </ToolPageShell>
  );
}
