// /tools/json-schema-validator - Validate JSON against a JSON Schema, or generate
// a schema from a JSON sample. Supports type, required, properties, items, enum,
// pattern, minimum/maximum and min/max length. 100% client-side, runs in your
// browser, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, ShieldCheck, Wand2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-schema-validator")({
  head: () => {
    const seo = getToolSeoMeta("json-schema-validator");
    const canonical = "https://iconvault.site/tools/json-schema-validator";
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
  component: JsonSchemaValidatorTool,
});

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

function typeMatches(t: string, v: unknown): boolean {
  if (t === "integer") return typeof v === "number" && Number.isInteger(v);
  if (t === "number") return typeof v === "number";
  if (t === "array") return Array.isArray(v);
  if (t === "null") return v === null;
  if (t === "object") return isPlainObject(v);
  return typeof v === t;
}

interface VError {
  path: string;
  message: string;
}

function validate(schema: unknown, data: unknown, path: string, out: VError[]) {
  if (!isPlainObject(schema)) return;
  const label = path || "$";

  const types = schema["type"] === undefined ? [] : Array.isArray(schema["type"]) ? schema["type"] : [schema["type"]];
  if (types.length > 0 && !types.some((t) => typeof t === "string" && typeMatches(t, data))) {
    out.push({ path: label, message: `Expected type ${types.join(" | ")}, got ${typeOf(data)}` });
    return;
  }

  if (schema["enum"] !== undefined && Array.isArray(schema["enum"])) {
    const ok = (schema["enum"] as unknown[]).some((e) => JSON.stringify(e) === JSON.stringify(data));
    if (!ok) out.push({ path: label, message: `Value is not one of the allowed enum values` });
  }

  if (typeof data === "string") {
    if (typeof schema["minLength"] === "number" && data.length < schema["minLength"])
      out.push({ path: label, message: `String is shorter than minLength ${schema["minLength"]}` });
    if (typeof schema["maxLength"] === "number" && data.length > schema["maxLength"])
      out.push({ path: label, message: `String is longer than maxLength ${schema["maxLength"]}` });
    if (typeof schema["pattern"] === "string") {
      try {
        if (!new RegExp(schema["pattern"]).test(data)) out.push({ path: label, message: `String does not match pattern ${schema["pattern"]}` });
      } catch {
        out.push({ path: label, message: `Schema pattern "${schema["pattern"]}" is not a valid regex` });
      }
    }
  }

  if (typeof data === "number") {
    if (typeof schema["minimum"] === "number" && data < schema["minimum"])
      out.push({ path: label, message: `Number ${data} is less than minimum ${schema["minimum"]}` });
    if (typeof schema["maximum"] === "number" && data > schema["maximum"])
      out.push({ path: label, message: `Number ${data} is greater than maximum ${schema["maximum"]}` });
  }

  if (Array.isArray(data)) {
    if (typeof schema["minItems"] === "number" && data.length < schema["minItems"])
      out.push({ path: label, message: `Array has fewer than minItems ${schema["minItems"]} items` });
    if (typeof schema["maxItems"] === "number" && data.length > schema["maxItems"])
      out.push({ path: label, message: `Array has more than maxItems ${schema["maxItems"]} items` });
    if (schema["items"] !== undefined) data.forEach((el, i) => validate(schema["items"], el, `${label}[${i}]`, out));
  }

  if (isPlainObject(data)) {
    const props = isPlainObject(schema["properties"]) ? (schema["properties"] as Record<string, unknown>) : {};
    if (Array.isArray(schema["required"])) {
      for (const k of schema["required"]) {
        if (typeof k === "string" && !(k in data)) {
          const p = path ? `${path}.${k}` : k;
          out.push({ path: p, message: `Missing required property "${k}"` });
        }
      }
    }
    for (const k of Object.keys(data)) {
      if (k in props) validate(props[k], data[k], path ? `${path}.${k}` : k, out);
    }
  }
}

function inferSchema(v: unknown): Record<string, unknown> {
  if (v === null) return { type: "null" };
  if (Array.isArray(v)) {
    if (v.length === 0) return { type: "array", items: {} };
    const kinds = new Set(v.map(typeOf));
    if (kinds.size === 1) {
      const kind = [...kinds][0];
      if (kind === "object") {
        const allKeys = new Set<string>();
        const keyCount = new Map<string, number>();
        for (const el of v as Record<string, unknown>[]) {
          for (const k of Object.keys(el)) {
            allKeys.add(k);
            keyCount.set(k, (keyCount.get(k) ?? 0) + 1);
          }
        }
        const properties: Record<string, unknown> = {};
        for (const k of allKeys) {
          const vals = (v as Record<string, unknown>[]).filter((el) => k in el).map((el) => el[k]);
          const sub = vals.map(inferSchema);
          properties[k] = sub.length > 0 ? sub[0] : {};
        }
        const required = [...allKeys].filter((k) => keyCount.get(k) === v.length);
        return { type: "array", items: { type: "object", properties, ...(required.length ? { required } : {}) } };
      }
      const item = inferSchema(v[0]);
      if ((kind === "string" || kind === "integer" || kind === "number") && v.length <= 20) {
        const uniq = [...new Set(v.map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x));
        if (uniq.length <= 10 && uniq.length < v.length) return { type: "array", items: { ...item, enum: uniq } };
      }
      return { type: "array", items: item };
    }
    return { type: "array" };
  }
  if (isPlainObject(v)) {
    const properties: Record<string, unknown> = {};
    for (const k of Object.keys(v)) properties[k] = inferSchema(v[k]);
    return { type: "object", properties, required: Object.keys(v) };
  }
  if (typeof v === "number") return { type: Number.isInteger(v) ? "integer" : "number" };
  return { type: typeof v };
}

const SAMPLE_JSON = `{
  "name": "IconVault",
  "version": 2,
  "stable": true,
  "tags": ["icons", "tools"]
}`;

const SAMPLE_SCHEMA = `{
  "type": "object",
  "required": ["name", "version"],
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "version": { "type": "integer", "minimum": 1 },
    "stable": { "type": "boolean" },
    "tags": { "type": "array", "items": { "type": "string" } }
  }
}`;

function JsonSchemaValidatorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-schema-validator", isPro);
  const seo = getToolSeo("json-schema-validator");

  const [jsonText, setJsonText] = useState("");
  const [schemaText, setSchemaText] = useState("");
  const [errors, setErrors] = useState<VError[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runValidate = () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    setParseError(null);
    let data: unknown;
    let schema: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      setParseError(`JSON (left) is invalid: ${e instanceof Error ? e.message : "parse error"}`);
      setErrors(null);
      setBusy(false);
      return;
    }
    try {
      schema = JSON.parse(schemaText);
    } catch (e) {
      setParseError(`Schema (right) is invalid: ${e instanceof Error ? e.message : "parse error"}`);
      setErrors(null);
      setBusy(false);
      return;
    }
    const out: VError[] = [];
    validate(schema, data, "", out);
    setErrors(out);
    trial.recordUse();
    setBusy(false);
    toast.success(out.length === 0 ? "Valid! JSON matches the schema" : `${out.length} validation error${out.length === 1 ? "" : "s"}`);
  };

  const generateSchema = () => {
    if (!jsonText.trim()) {
      toast.error("Paste some JSON on the left first");
      return;
    }
    try {
      const data: unknown = JSON.parse(jsonText);
      const inferred = inferSchema(data);
      setSchemaText(JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", ...inferred }, null, 2));
      setErrors(null);
      setParseError(null);
      toast.success("Schema generated from your JSON");
    } catch (e) {
      setParseError(`JSON (left) is invalid: ${e instanceof Error ? e.message : "parse error"}`);
    }
  };

  const copyErrors = async () => {
    if (!errors) return;
    try {
      await navigator.clipboard.writeText(errors.map((e) => `${e.path}: ${e.message}`).join("\n"));
      toast.success("Errors copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const paneClass =
    "h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary";

  return (
    <ToolPageShell toolId="json-schema-validator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON Schema Validator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">JSON document</span>
            <button
              type="button"
              onClick={() => setJsonText(SAMPLE_JSON)}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Sample
            </button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Paste the JSON to validate..."
            spellCheck={false}
            className={paneClass}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">JSON Schema</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSchemaText(SAMPLE_SCHEMA)}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                Sample
              </button>
              <button
                type="button"
                onClick={generateSchema}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Wand2 className="h-3.5 w-3.5" /> Generate from JSON
              </button>
            </div>
          </div>
          <textarea
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
            placeholder="Paste the JSON Schema, or generate one from your JSON..."
            spellCheck={false}
            className={paneClass}
          />
        </div>
      </div>

      <div className="mt-6">
        <ActionButton busy={busy} disabled={!trial.canUse || !jsonText.trim() || !schemaText.trim()} onClick={runValidate}>
          <ShieldCheck className="h-4 w-4" /> {busy ? "Validating..." : "Validate"}
        </ActionButton>
      </div>
      {!isPro && (
        <p className="mt-3 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free validations left. Runs in your browser, nothing is uploaded.
        </p>
      )}

      {parseError && <p className="mt-4 text-sm font-medium text-red-500">{parseError}</p>}

      {errors && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          {errors.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-500/40 bg-green-500/10 p-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-bold text-green-700 dark:text-green-300">Valid JSON</p>
                <p className="text-sm text-green-700/80 dark:text-green-300/80">The document matches every rule in the schema.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-bold">{errors.length} validation error{errors.length === 1 ? "" : "s"}</span>
                <button
                  type="button"
                  onClick={copyErrors}
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5",
                    "text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy errors
                </button>
              </div>
              <div className="max-h-[380px] space-y-2 overflow-auto">
                {errors.map((e, i) => (
                  <div key={i} className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                    <p className="font-mono text-xs font-bold text-red-600 dark:text-red-400">{e.path}</p>
                    <p className="mt-1 text-sm">{e.message}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <span className="mb-2 block text-sm font-bold">What this validator supports</span>
        <div className="flex flex-wrap gap-1.5">
          {["type", "required", "properties", "items", "enum", "pattern", "minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems"].map((k) => (
            <code key={k} className="rounded-lg bg-muted px-2 py-1 font-mono text-xs">{k}</code>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Honest limits: $ref, allOf, oneOf, anyOf, not, if/then and format checks are not supported. For full draft-07
          validation use a dedicated library.
        </p>
      </div>
    </ToolPageShell>
  );
}
