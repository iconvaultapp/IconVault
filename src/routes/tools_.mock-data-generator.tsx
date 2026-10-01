// /tools/mock-data-generator - Generate realistic fake rows (JSON / CSV / SQL)
// from a field schema, with a seed for repeatable output. 100% in-browser.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2, Dices } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/mock-data-generator")({
  head: () => {
    const seo = getToolSeoMeta("mock-data-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MockDataTool,
});

const TYPES = [
  "fullName", "email", "phone", "company", "uuid", "int", "float",
  "boolean", "date", "isoDate", "ipv4", "url", "color", "words", "sentence",
] as const;
type GenType = (typeof TYPES)[number];

interface Field {
  id: number;
  name: string;
  type: GenType;
  min: string; // int/float min
  max: string; // int/float max
  words: string; // words count
}

const FIRST = ["Aarav", "Priya", "Rahul", "Sneha", "Vikram", "Ananya", "Rohan", "Kavya", "Arjun", "Meera", "Karan", "Divya", "Aditya", "Pooja", "Nikhil", "Ishita", "Varun", "Anika", "Siddharth", "Riya"];
const LAST = ["Sharma", "Patel", "Khan", "Iyer", "Gupta", "Reddy", "Nair", "Singh", "Mehta", "Das", "Joshi", "Kulkarni", "Bose", "Chopra", "Menon", "Pillai", "Verma", "Yadav", "Rao", "Mishra"];
const COMPANIES = ["Nexova", "PixelForge", "CloudNest", "DataQuill", "BrightLoop", "Zentryx", "Mosaic Labs", "SwiftCart", "Hexagonal", "TerraByte", "NovaPay", "Kinetic", "Framewise", "Orbitly", "Quantia"];
const DOMAINS = ["example.com", "mailbox.dev", "sample.io", "testmail.app"];
const WORDS = ["lorem", "quick", "bright", "silent", "market", "cloud", "river", "pixel", "storm", "green", "amber", "signal", "north", "paper", "engine", "harbor", "flame", "stone", "drift", "orbit", "pulse", "valley", "crisp", "noble"];

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const pick = (r: Rand, arr: string[]) => arr[Math.floor(r() * arr.length)] ?? "";
const intOf = (r: Rand, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

function genValue(f: Field, r: Rand): string | number | boolean {
  const first = pick(r, FIRST);
  const last = pick(r, LAST);
  const min = parseInt(f.min, 10);
  const max = parseInt(f.max, 10);
  const wCount = Math.max(1, parseInt(f.words, 10) || 3);
  switch (f.type) {
    case "fullName": return `${first} ${last}`;
    case "email": return `${first.toLowerCase()}.${last.toLowerCase()}@${pick(r, DOMAINS)}`;
    case "phone": return `+${intOf(r, 1, 99)}${intOf(r, 100000000, 999999999)}`;
    case "company": return `${pick(r, COMPANIES)} ${pick(r, ["Inc", "Labs", "Systems", "Studio", "Works"])}`;
    case "uuid": {
      const h = () => Math.floor(r() * 0xffffffff).toString(16).padStart(8, "0");
      const a = h(); const b = h().slice(0, 4);
      return `${a}-${b}-4${h().slice(1, 4)}-${(8 + Math.floor(r() * 4)).toString(16)}${h().slice(1, 4)}-${h()}${h().slice(0, 4)}`;
    }
    case "int": return intOf(r, Number.isFinite(min) ? min : 0, Number.isFinite(max) ? max : 1000);
    case "float": {
      const lo = Number.isFinite(min) ? min : 0;
      const hi = Number.isFinite(max) ? max : 100;
      return +(lo + r() * (hi - lo)).toFixed(2);
    }
    case "boolean": return r() > 0.5;
    case "date": {
      const d = new Date(2020 + Math.floor(r() * 6), Math.floor(r() * 12), 1 + Math.floor(r() * 28));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    case "isoDate": return new Date(Date.UTC(2020, 0, 1) + r() * (Date.UTC(2026, 8, 29) - Date.UTC(2020, 0, 1))).toISOString();
    case "ipv4": return `${intOf(r, 1, 223)}.${intOf(r, 0, 255)}.${intOf(r, 0, 255)}.${intOf(r, 1, 254)}`;
    case "url": return `https://${pick(r, COMPANIES).toLowerCase().replace(/[^a-z]/g, "")}.${pick(r, ["com", "io", "dev"])}/${intOf(r, 1000, 9999)}`;
    case "color": return `#${Math.floor(r() * 0xffffff).toString(16).padStart(6, "0")}`;
    case "words": return Array.from({ length: wCount }, () => pick(r, WORDS)).join(" ");
    case "sentence": {
      const n = intOf(r, 6, 12);
      const s = Array.from({ length: n }, () => pick(r, WORDS)).join(" ");
      return s.charAt(0).toUpperCase() + s.slice(1) + ".";
    }
  }
}

function escapeCsv(v: unknown): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toSql(fields: Field[], rows: (string | number | boolean)[][]): string {
  const cols = fields.map((f) => `\`${f.name || "field"}\``).join(", ");
  const vals = rows.map((row) => `(${row.map((v) => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`)).join(", ")})`);
  return `INSERT INTO \`mock_data\` (${cols}) VALUES\n${vals.join(",\n")};`;
}

let nextId = 1;

function MockDataTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("mock-data-generator", isPro);
  const seo = getToolSeo("mock-data-generator");

  const [fields, setFields] = useState<Field[]>([
    { id: nextId++, name: "name", type: "fullName", min: "0", max: "1000", words: "3" },
    { id: nextId++, name: "email", type: "email", min: "0", max: "1000", words: "3" },
    { id: nextId++, name: "age", type: "int", min: "18", max: "70", words: "3" },
  ]);
  const [count, setCount] = useState("50");
  const [seed, setSeed] = useState("iconvault");

  const update = (id: number, patch: Partial<Field>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id: number) => setFields((fs) => fs.filter((f) => f.id !== id));
  const add = () =>
    setFields((fs) => [...fs, { id: nextId++, name: `field${fs.length + 1}`, type: "words", min: "0", max: "1000", words: "3" }]);

  const rows = useMemo(() => {
    const n = Math.min(Math.max(1, parseInt(count, 10) || 1), 5000);
    const r = mulberry32(hashSeed(seed));
    return Array.from({ length: n }, () => fields.map((f) => genValue(f, r)));
  }, [fields, count, seed]);

  const previewRows = rows.slice(0, 20);

  const exportJson = useCallback(() => {
    if (!trial.canUse) return;
    const objs = rows.map((row) => Object.fromEntries(fields.map((f, i) => [f.name || `field${i + 1}`, row[i]])));
    downloadBlob(new Blob([JSON.stringify(objs, null, 2)], { type: "application/json" }), "mock-data.json");
    trial.recordUse();
    toast.success("JSON downloaded");
  }, [rows, fields, trial]);

  const exportCsv = useCallback(() => {
    if (!trial.canUse) return;
    const head = fields.map((f) => escapeCsv(f.name || "field")).join(",");
    const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    downloadBlob(new Blob([`${head}\n${body}`], { type: "text/csv" }), "mock-data.csv");
    trial.recordUse();
    toast.success("CSV downloaded");
  }, [rows, fields, trial]);

  const exportSql = useCallback(() => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([toSql(fields, rows)], { type: "application/sql" }), "mock-data.sql");
    trial.recordUse();
    toast.success("SQL downloaded");
  }, [rows, fields, trial]);

  const copyJson = useCallback(() => {
    if (!trial.canUse) return;
    const objs = rows.slice(0, 100).map((row) => Object.fromEntries(fields.map((f, i) => [f.name || `field${i + 1}`, row[i]])));
    void navigator.clipboard.writeText(JSON.stringify(objs, null, 2)).then(() => {
      trial.recordUse();
      toast.success("First 100 rows copied as JSON");
    });
  }, [rows, fields, trial]);

  return (
    <ToolPageShell toolId="mock-data-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Mock Data Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Schema ({fields.length} fields)</p>
            <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary/40">
              <Plus className="h-3.5 w-3.5" /> Add field
            </button>
          </div>

          <div className="max-h-[380px] space-y-3 overflow-auto pr-1">
            {fields.map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex gap-2">
                  <input
                    value={f.name}
                    onChange={(e) => update(f.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                    placeholder="field name"
                    className="w-full rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-xs outline-none focus:border-primary"
                  />
                  <button type="button" onClick={() => remove(f.id)} disabled={fields.length <= 1} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-400 hover:text-red-500 disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <select
                  value={f.type}
                  onChange={(e) => update(f.id, { type: e.target.value as GenType })}
                  className="mt-2 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold outline-none focus:border-primary"
                >
                  {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
                {(f.type === "int" || f.type === "float") && (
                  <div className="mt-2 flex gap-2">
                    <input value={f.min} onChange={(e) => update(f.id, { min: e.target.value })} placeholder="min" inputMode="numeric" className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs outline-none focus:border-primary" />
                    <input value={f.max} onChange={(e) => update(f.id, { max: e.target.value })} placeholder="max" inputMode="numeric" className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs outline-none focus:border-primary" />
                  </div>
                )}
                {f.type === "words" && (
                  <input value={f.words} onChange={(e) => update(f.id, { words: e.target.value })} placeholder="word count" inputMode="numeric" className="mt-2 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs outline-none focus:border-primary" />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Rows (max 5000)</label>
              <input value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Seed</label>
              <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="any text" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The same seed always gives the same rows, so tests and demos stay repeatable. Everything is fake and generated in your browser.
          </p>

          <div className="flex flex-wrap gap-2">
            <ActionButton busy={false} disabled={!trial.canUse} onClick={exportJson}>
              <Download className="h-4 w-4" /> JSON
            </ActionButton>
            <button type="button" disabled={!trial.canUse} onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button type="button" disabled={!trial.canUse} onClick={exportSql} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50">
              <Download className="h-4 w-4" /> SQL
            </button>
            <button type="button" disabled={!trial.canUse} onClick={copyJson} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50">
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Preview - first 20 of {rows.length} rows</p>
            <Dices className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] border-collapse text-xs">
              <thead>
                <tr className="bg-muted/60">
                  {fields.map((f) => (
                    <th key={f.id} className="border-b border-border px-3 py-2 text-left font-bold text-foreground/80">{f.name || "field"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className={cn(i % 2 === 1 && "bg-muted/30")}>
                    {row.map((v, j) => (
                      <td key={j} className="max-w-[220px] truncate border-b border-border/60 px-3 py-2 font-mono text-foreground/90">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Export downloads all {rows.length} rows. Copy grabs the first 100 as JSON.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
