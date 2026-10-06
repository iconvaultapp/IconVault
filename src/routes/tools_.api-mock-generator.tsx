// /tools/api-mock-generator - Design a schema of fields, then generate
// realistic mock data (JSON, CSV, SQL) with a seeded random generator so
// results are reproducible. 100% client-side; nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/api-mock-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/api-mock-generator";
import { downloadBlob } from "@/lib/logo-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/tools_/api-mock-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/api-mock-generator";
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
  component: ApiMockGeneratorTool,
});

const FIELD_TYPES = [
  { id: "fullName", label: "Full name" },
  { id: "firstName", label: "First name" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "uuid", label: "UUID" },
  { id: "int", label: "Integer" },
  { id: "float", label: "Float" },
  { id: "boolean", label: "Boolean" },
  { id: "date", label: "Date (YYYY-MM-DD)" },
  { id: "isoDate", label: "ISO date" },
  { id: "lorem", label: "Lorem words" },
  { id: "sentence", label: "Sentence" },
  { id: "color", label: "Hex color" },
  { id: "ip", label: "IP address" },
  { id: "url", label: "URL" },
] as const;

type FieldTypeId = (typeof FIELD_TYPES)[number]["id"];

interface SchemaRow {
  id: number;
  name: string;
  type: FieldTypeId;
}

const FIRST = ["Aarav", "Diya", "Rohan", "Priya", "Arjun", "Ananya", "Kabir", "Meera", "Vikram", "Sana", "Ishaan", "Riya", "Aditya", "Neha", "Karan"];
const LAST = ["Sharma", "Patel", "Singh", "Gupta", "Reddy", "Iyer", "Khan", "Mehta", "Nair", "Das", "Joshi", "Verma"];
const WORDS = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "labore", "dolore", "magna", "aliqua", "enim", "minim", "veniam"];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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

const pick = (rnd: () => number, arr: string[]): string => arr[Math.floor(rnd() * arr.length)] ?? arr[0] ?? "";

function genValue(type: FieldTypeId, rnd: () => number): string | number | boolean {
  switch (type) {
    case "firstName":
      return pick(rnd, FIRST);
    case "fullName":
      return `${pick(rnd, FIRST)} ${pick(rnd, LAST)}`;
    case "email": {
      const f = pick(rnd, FIRST).toLowerCase();
      const l = pick(rnd, LAST).toLowerCase();
      return `${f}.${l}${Math.floor(rnd() * 900 + 100)}@example.com`;
    }
    case "phone":
      return `+1-${Math.floor(rnd() * 900 + 100)}-${Math.floor(rnd() * 900 + 100)}-${Math.floor(rnd() * 9000 + 1000)}`;
    case "uuid": {
      const h = () => Math.floor(rnd() * 65536).toString(16).padStart(4, "0");
      return `${h()}${h()}-${h()}-4${h().slice(1)}-${(8 + Math.floor(rnd() * 4)).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`;
    }
    case "int":
      return Math.floor(rnd() * 1000);
    case "float":
      return Math.round(rnd() * 10000) / 100;
    case "boolean":
      return rnd() > 0.5;
    case "date": {
      const d = new Date(Date.UTC(2015, 0, 1) + rnd() * (Date.UTC(2026, 0, 1) - Date.UTC(2015, 0, 1)));
      return d.toISOString().slice(0, 10);
    }
    case "isoDate": {
      const d = new Date(Date.UTC(2015, 0, 1) + rnd() * (Date.UTC(2026, 0, 1) - Date.UTC(2015, 0, 1)));
      return d.toISOString();
    }
    case "lorem": {
      const n = 5 + Math.floor(rnd() * 6);
      return Array.from({ length: n }, () => pick(rnd, WORDS)).join(" ");
    }
    case "sentence": {
      const n = 6 + Math.floor(rnd() * 8);
      const s = Array.from({ length: n }, () => pick(rnd, WORDS)).join(" ");
      return s.charAt(0).toUpperCase() + s.slice(1) + ".";
    }
    case "color":
      return `#${Math.floor(rnd() * 16777216).toString(16).padStart(6, "0")}`;
    case "ip":
      return `${Math.floor(rnd() * 223 + 1)}.${Math.floor(rnd() * 256)}.${Math.floor(rnd() * 256)}.${Math.floor(rnd() * 254 + 1)}`;
    case "url":
      return `https://example.com/${pick(rnd, WORDS)}/${Math.floor(rnd() * 1000)}`;
  }
}

const sqlValue = (v: string | number | boolean): string =>
  typeof v === "number" ? String(v) : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : `'${String(v).replace(/'/g, "''")}'`;

const csvCell = (v: string | number | boolean): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

let rowSeq = 1;

function ApiMockGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("api-mock-generator", isPro);
  const seo = toolSeo;

  const [rows, setRows] = useState<SchemaRow[]>([
    { id: rowSeq++, name: "id", type: "uuid" },
    { id: rowSeq++, name: "name", type: "fullName" },
    { id: rowSeq++, name: "email", type: "email" },
    { id: rowSeq++, name: "age", type: "int" },
    { id: rowSeq++, name: "active", type: "boolean" },
  ]);
  const [count, setCount] = useState(10);
  const [seed, setSeed] = useState("iconvault");
  const [table, setTable] = useState("users");

  const data = useMemo(() => {
    const rnd = mulberry(hashSeed(seed || "0"));
    const n = Math.max(1, Math.min(500, count));
    return Array.from({ length: n }, () => {
      const obj: Record<string, string | number | boolean> = {};
      for (const r of rows) {
        if (r.name.trim()) obj[r.name.trim()] = genValue(r.type, rnd);
      }
      return obj;
    });
  }, [rows, count, seed]);

  const columns = useMemo(() => rows.map((r) => r.name.trim()).filter(Boolean), [rows]);

  const jsonOut = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const csvOut = useMemo(
    () => [columns.join(","), ...data.map((r) => columns.map((c) => csvCell(r[c] ?? "")).join(","))].join("\n"),
    [data, columns],
  );
  const sqlOut = useMemo(() => {
    const t = table.trim() || "rows";
    const cols = columns.map((c) => `"${c}"`).join(", ");
    return data.map((r) => `INSERT INTO "${t}" (${cols}) VALUES (${columns.map((c) => sqlValue(r[c] ?? "")).join(", ")});`).join("\n");
  }, [data, columns, table]);

  const addRow = () => setRows((p) => [...p, { id: rowSeq++, name: "", type: "lorem" }]);
  const removeRow = (id: number) => setRows((p) => p.filter((r) => r.id !== id));
  const patchRow = (id: number, patch: Partial<SchemaRow>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const generate = () => {
    if (!trial.canUse || columns.length === 0) return;
    trial.recordUse();
    toast.success(`${data.length} mock rows generated.`);
  };

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${label} copied.`);
    else toast.error("Could not copy to clipboard.");
  };

  const download = (text: string, filename: string, mime: string) => {
    downloadBlob(new Blob([text], { type: mime }), filename);
    toast.success(`${filename} downloaded.`);
  };

  return (
    <ToolPageShell toolId="api-mock-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="API Mock Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-[13px] font-medium text-foreground/80">Schema fields</Label>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add field
              </button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <Input
                    value={r.name}
                    onChange={(e) => patchRow(r.id, { name: e.target.value })}
                    placeholder="field_name"
                    className="font-mono text-xs"
                  />
                  <Select value={r.type} onValueChange={(v) => patchRow(r.id, { type: v as FieldTypeId })}>
                    <SelectTrigger className="w-40 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    aria-label="Remove field"
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {rows.length === 0 && <p className="text-sm text-muted-foreground">Add at least one field.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Rows (1-500)</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(500, parseInt(e.target.value || "1", 10))))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Seed</Label>
              <Input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="any text" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">SQL table name</Label>
            <Input value={table} onChange={(e) => setTable(e.target.value)} className="font-mono" />
          </div>
          <p className="text-xs text-muted-foreground">
            The same seed always produces the same data, so your mocks are reproducible across runs.
          </p>

          <ActionButton busy={false} disabled={!trial.canUse || columns.length === 0} onClick={generate}>
            <Sparkles className="h-4 w-4" /> Generate mock data
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - runs fully in your browser, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Preview (first 10 rows)</p>
            {columns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add schema fields to preview data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {columns.map((c) => (
                        <th key={c} className="whitespace-nowrap px-2 py-1.5 font-mono font-semibold">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        {columns.map((c) => (
                          <td key={c} className="max-w-44 truncate px-2 py-1.5 font-mono text-muted-foreground">{String(r[c] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Export</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(jsonOut, "JSON")} className={cn(exportBtn)}>Copy JSON</button>
              <button type="button" onClick={() => download(jsonOut, "mock-data.json", "application/json")} className={cn(exportBtn)}>
                <Download className="h-3.5 w-3.5" /> JSON
              </button>
              <button type="button" onClick={() => download(csvOut, "mock-data.csv", "text/csv")} className={cn(exportBtn)}>
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button type="button" onClick={() => download(sqlOut, "mock-data.sql", "text/plain")} className={cn(exportBtn)}>
                <Download className="h-3.5 w-3.5" /> SQL
              </button>
              <button type="button" onClick={() => copy(sqlOut, "SQL")} className={cn(exportBtn)}>
                <Copy className="h-3.5 w-3.5" /> Copy SQL
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              JSON and CSV exports are plain downloads. SQL export writes INSERT statements for your table name.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

const exportBtn =
  "inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground";
