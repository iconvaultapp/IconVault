// /tools/graphql-studio - Paste a GraphQL SDL schema, explore its types,
// build queries with a visual field picker and generate matching mock
// responses. 100% client-side; nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/tools_/graphql-studio")({
  head: () => {
    const seo = getToolSeoMeta("graphql-studio");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: GraphqlStudioTool,
});

interface GqlArg { name: string; type: string }
interface GqlField { name: string; args: GqlArg[]; type: string }
interface GqlType {
  name: string;
  kind: "object" | "enum" | "input" | "scalar" | "interface" | "union";
  fields: GqlField[];
  values: string[];
  members: string[];
}

const SAMPLE_SDL = `type Query {
  user(id: ID!): User
  posts(limit: Int = 10, tag: String): [Post!]!
  search(q: String!): [SearchResult!]!
}

type User {
  id: ID!
  name: String!
  email: String
  role: Role!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  body: String
  published: Boolean!
  author: User!
}

union SearchResult = User | Post

enum Role {
  ADMIN
  EDITOR
  READER
}`;

function namedType(t: string): string {
  return t.replace(/[[\]!]/g, "").trim();
}
function isList(t: string): boolean {
  return t.includes("[");
}

function parseSDL(src: string): { types: Record<string, GqlType>; errors: string[] } {
  const types: Record<string, GqlType> = {};
  const errors: string[] = [];
  const clean = src
    .split("\n")
    .map((l) => {
      const i = l.indexOf("#");
      return i >= 0 ? l.slice(0, i) : l;
    })
    .join("\n");

  const re = /(?:extend\s+)?\b(type|interface|enum|input|scalar|union)\s+([A-Za-z_]\w*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const kind = m[1] as GqlType["kind"];
    const name = m[2] as string;
    let idx = m.index + m[0].length;
    while (idx < clean.length && /\s/.test(clean[idx] ?? "")) idx++;
    let body = "";
    if (clean[idx] === "{") {
      let depth = 0;
      let j = idx;
      for (; j < clean.length; j++) {
        if (clean[j] === "{") depth++;
        else if (clean[j] === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      body = clean.slice(idx + 1, j);
      re.lastIndex = j + 1;
    } else if (kind === "union") {
      const line = clean.slice(idx, clean.indexOf("\n", idx));
      const eq = line.match(/=\s*([A-Za-z_][\w\s|]*)/);
      if (eq?.[1]) {
        types[name] = { name, kind, fields: [], values: [], members: eq[1].split("|").map((s) => s.trim()).filter(Boolean) };
        continue;
      }
    }

    if (kind === "enum") {
      const values = body.split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^[A-Za-z_]\w*$/.test(s));
      types[name] = { name, kind, fields: [], values, members: [] };
      continue;
    }
    if (kind === "scalar") {
      types[name] = { name, kind, fields: [], values: [], members: [] };
      continue;
    }
    const fields: GqlField[] = [];
    const fre = /([A-Za-z_]\w*)\s*(\(([^)]*)\))?\s*:\s*([^\s,}{()]+)/g;
    let fm: RegExpExecArray | null;
    while ((fm = fre.exec(body)) !== null) {
      const args: GqlArg[] = [];
      const argSrc = fm[3] ?? "";
      const are = /([A-Za-z_]\w*)\s*:\s*([^\s,)=]+)(?:\s*=\s*[^,)]+)?/g;
      let am: RegExpExecArray | null;
      while ((am = are.exec(argSrc)) !== null) {
        args.push({ name: am[1] as string, type: am[2] as string });
      }
      fields.push({ name: fm[1] as string, args, type: fm[4] as string });
    }
    types[name] = { name, kind, fields, values: [], members: [] };
  }

  if (Object.keys(types).length === 0 && src.trim()) errors.push("No type definitions found. Paste valid GraphQL SDL.");
  return { types, errors };
}

const SCALARS = new Set(["String", "Int", "Float", "Boolean", "ID"]);

function sampleScalar(named: string, types: Record<string, GqlType>, rnd: () => number): unknown {
  if (named === "Int") return Math.floor(rnd() * 1000);
  if (named === "Float") return Math.round(rnd() * 1000) / 100;
  if (named === "Boolean") return rnd() > 0.5;
  if (named === "ID") return `id-${Math.floor(rnd() * 90000 + 10000)}`;
  if (named === "String") {
    const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];
    return `Sample ${words[Math.floor(rnd() * words.length)] ?? "text"}`;
  }
  const t = types[named];
  if (t?.kind === "enum" && t.values.length) return t.values[0];
  return "sample";
}

function mockField(type: string, types: Record<string, GqlType>, rnd: () => number, depth: number): unknown {
  const named = namedType(type);
  const val = depth > 3 || SCALARS.has(named) || types[named]?.kind !== "object" && types[named]?.kind !== "interface"
    ? sampleScalar(named, types, rnd)
    : (() => {
        const t = types[named];
        const obj: Record<string, unknown> = {};
        if (t) {
          for (const f of t.fields) obj[f.name] = mockField(f.type, types, rnd, depth + 1);
        }
        return obj;
      })();
  return isList(type) ? [val, val] : val;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function GraphqlStudioTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("graphql-studio", isPro);
  const seo = getToolSeo("graphql-studio");

  const [sdl, setSdl] = useState(SAMPLE_SDL);
  const [activeType, setActiveType] = useState<string>("Query");
  const [queryField, setQueryField] = useState("");
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<string[]>([]);
  const [mock, setMock] = useState<string | null>(null);

  const parsed = useMemo(() => parseSDL(sdl), [sdl]);
  const typeNames = useMemo(() => Object.keys(parsed.types).sort(), [parsed.types]);
  const queryType = parsed.types["Query"];

  const fieldDef = queryType?.fields.find((f) => f.name === queryField) ?? null;
  const returnNamed = fieldDef ? namedType(fieldDef.type) : "";
  const returnType = parsed.types[returnNamed] ?? null;
  const expandable = returnType && (returnType.kind === "object" || returnType.kind === "interface");

  const queryString = useMemo(() => {
    if (!fieldDef) return "";
    const argStr = fieldDef.args
      .filter((a) => (argValues[a.name] ?? "").trim() !== "")
      .map((a) => {
        const raw = (argValues[a.name] ?? "").trim();
        const named = namedType(a.type);
        const asValue = named === "Int" || named === "Float" || named === "Boolean" ? raw : JSON.stringify(raw);
        return `${a.name}: ${asValue}`;
      })
      .join(", ");
    const head = `${fieldDef.name}${argStr ? `(${argStr})` : ""}`;
    if (!expandable || checked.length === 0) return `query {\n  ${head}\n}`;
    const sub = (returnType?.fields ?? [])
      .filter((f) => checked.includes(f.name))
      .map((f) => {
        const n = namedType(f.type);
        const t = parsed.types[n];
        if ((t?.kind === "object" || t?.kind === "interface") && t.fields.length) {
          const deep = t.fields.filter((df) => SCALARS.has(namedType(df.type)) || parsed.types[namedType(df.type)]?.kind === "enum");
          const inner = deep.length ? `\n      ${deep.map((d) => d.name).join("\n      ")}\n    ` : "";
          return `${f.name} {${inner}}`;
        }
        return f.name;
      })
      .join("\n    ");
    return `query {\n  ${head} {\n    ${sub}\n  }\n}`;
  }, [fieldDef, argValues, checked, expandable, returnType, parsed.types]);

  const toggleChecked = (name: string) =>
    setChecked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const generateMock = () => {
    if (!fieldDef || !trial.canUse) return;
    const rnd = mulberry(Date.now() % 2147483647);
    const data: Record<string, unknown> = {};
    if (!expandable || checked.length === 0) {
      data[fieldDef.name] = mockField(fieldDef.type, parsed.types, rnd, 0);
    } else {
      const obj: Record<string, unknown> = {};
      for (const f of (returnType?.fields ?? []).filter((x) => checked.includes(x.name))) {
        obj[f.name] = mockField(f.type, parsed.types, rnd, 1);
      }
      data[fieldDef.name] = isList(fieldDef.type) ? [obj, obj] : obj;
    }
    setMock(JSON.stringify({ data }, null, 2));
    trial.recordUse();
    toast.success("Mock response generated.");
  };

  const copy = async (text: string, label: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${label} copied.`);
    else toast.error("Could not copy to clipboard.");
  };

  const detail = parsed.types[activeType];

  return (
    <ToolPageShell toolId="graphql-studio" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GraphQL Studio" left={trial.left} />

      <div className="mb-5 rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-[13px] font-medium text-foreground/80">GraphQL SDL schema</Label>
          <button
            type="button"
            onClick={() => setSdl(SAMPLE_SDL)}
            className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Restore sample
          </button>
        </div>
        <Textarea
          value={sdl}
          onChange={(e) => {
            setSdl(e.target.value);
            setMock(null);
            setChecked([]);
            setQueryField("");
          }}
          rows={8}
          spellCheck={false}
          className="font-mono text-[13px]"
          placeholder="type Query { ... }"
        />
        {parsed.errors.map((e) => (
          <p key={e} className="mt-1.5 text-sm font-medium text-red-500">{e}</p>
        ))}
      </div>

      <Tabs defaultValue="explore">
        <TabsList>
          <TabsTrigger value="explore">Type explorer</TabsTrigger>
          <TabsTrigger value="build">Query builder</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="pt-4">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="space-y-1 rounded-2xl border border-border bg-card p-3">
              {typeNames.length === 0 && <p className="p-3 text-sm text-muted-foreground">No types parsed yet.</p>}
              {typeNames.map((n) => {
                const t = parsed.types[n] as GqlType;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setActiveType(n)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                      activeType === n ? "bg-primary/10 font-semibold text-primary" : "text-foreground/80 hover:bg-muted",
                    )}
                  >
                    <span className="font-mono">{n}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.kind}</span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              {!detail ? (
                <p className="text-sm text-muted-foreground">Select a type on the left.</p>
              ) : (
                <div>
                  <p className="mb-1 font-mono text-lg font-bold">{detail.name}</p>
                  <p className="mb-4 text-xs uppercase tracking-wide text-muted-foreground">{detail.kind}</p>
                  {(detail.kind === "object" || detail.kind === "interface" || detail.kind === "input") && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="py-2 pr-4">Field</th>
                            <th className="py-2 pr-4">Arguments</th>
                            <th className="py-2">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.fields.map((f) => (
                            <tr key={f.name} className="border-b border-border/50 last:border-0">
                              <td className="py-2 pr-4 font-mono font-semibold">{f.name}</td>
                              <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                                {f.args.length ? f.args.map((a) => `${a.name}: ${a.type}`).join(", ") : "-"}
                              </td>
                              <td className="py-2 font-mono text-xs text-primary">{f.type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {detail.kind === "enum" && (
                    <div className="flex flex-wrap gap-2">
                      {detail.values.map((v) => (
                        <span key={v} className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold">{v}</span>
                      ))}
                    </div>
                  )}
                  {detail.kind === "union" && (
                    <p className="font-mono text-sm">= {detail.members.join(" | ")}</p>
                  )}
                  {detail.kind === "scalar" && (
                    <p className="text-sm text-muted-foreground">Custom scalar, serialized as a string in mocks.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="build" className="pt-4">
          {!queryType ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Braces className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold">No Query type found</p>
              <p className="mt-1 text-sm text-muted-foreground">Add a <span className="font-mono">type Query {"{ ... }"}</span> block to your schema to build queries.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
                <div>
                  <Label className="mb-2 block text-[13px] font-medium text-foreground/80">Query field</Label>
                  <Select
                    value={queryField}
                    onValueChange={(v) => {
                      setQueryField(v);
                      setChecked([]);
                      setArgValues({});
                      setMock(null);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Pick a query field" /></SelectTrigger>
                    <SelectContent>
                      {queryType.fields.map((f) => (
                        <SelectItem key={f.name} value={f.name}>
                          <span className="font-mono">{f.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">: {f.type}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fieldDef && fieldDef.args.length > 0 && (
                  <div>
                    <Label className="mb-2 block text-[13px] font-medium text-foreground/80">Arguments</Label>
                    <div className="space-y-2">
                      {fieldDef.args.map((a) => (
                        <div key={a.name} className="flex items-center gap-2">
                          <span className="w-32 shrink-0 truncate font-mono text-xs">{a.name}: {a.type}</span>
                          <Input
                            value={argValues[a.name] ?? ""}
                            onChange={(e) => setArgValues((p) => ({ ...p, [a.name]: e.target.value }))}
                            placeholder="value (empty = omit)"
                            className="font-mono text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fieldDef && expandable && (
                  <div>
                    <Label className="mb-2 block text-[13px] font-medium text-foreground/80">
                      Subfields of {returnNamed}
                    </Label>
                    <div className="max-h-64 space-y-1.5 overflow-y-auto">
                      {(returnType?.fields ?? []).map((f) => (
                        <label key={f.name} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted">
                          <Checkbox checked={checked.includes(f.name)} onCheckedChange={() => toggleChecked(f.name)} />
                          <span className="font-mono font-medium">{f.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">{f.type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <ActionButton busy={false} disabled={!trial.canUse || !fieldDef} onClick={generateMock}>
                  <Sparkles className="h-4 w-4" /> Generate mock response
                </ActionButton>
                {!isPro && (
                  <p className="text-xs text-muted-foreground">
                    {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - runs fully in your browser, nothing is uploaded.
                  </p>
                )}
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[13px] font-medium text-foreground/80">Query</p>
                    <button
                      type="button"
                      onClick={() => copy(queryString, "Query")}
                      disabled={!queryString}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-xl bg-muted p-4 font-mono text-[13px] leading-relaxed">
                    {queryString || "// Pick a query field to build the query"}
                  </pre>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[13px] font-medium text-foreground/80">Mock response</p>
                    <button
                      type="button"
                      onClick={() => copy(mock ?? "", "Mock response")}
                      disabled={!mock}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-xl bg-muted p-4 font-mono text-[13px] leading-relaxed">
                    {mock ?? "// Generate a mock response to see sample JSON"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </ToolPageShell>
  );
}
