// /tools/json-excel-converter - Paste a JSON array to download a real .xlsx
// spreadsheet, or upload an .xlsx to preview it as a table and download JSON.
// The spreadsheet library loads on demand only. 100% client-side, runs in
// your browser, nothing is uploaded.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, FileSpreadsheet, FileUp, Table2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { brandFilename } from "@/lib/logo-builder";

export const Route = createFileRoute("/tools_/json-excel-converter")({
  head: () => {
    const seo = getToolSeoMeta("json-excel-converter");
    const canonical = "https://iconvault.site/tools/json-excel-converter";
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
  component: JsonExcelConverterTool,
});

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAMPLE_JSON = `[
  { "name": "IconVault", "price": 29, "inStock": true },
  { "name": "Thumbnail Studio", "price": 0, "inStock": true },
  { "name": "Logo Builder", "price": 0, "inStock": false }
]`;

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function JsonExcelConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-excel-converter", isPro);
  const seo = getToolSeo("json-excel-converter");

  const [jsonText, setJsonText] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [busyDown, setBusyDown] = useState(false);

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [busyUp, setBusyUp] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadXlsx = async () => {
    if (!trial.canUse || busyDown) return;
    setBusyDown(true);
    setJsonError(null);
    try {
      const parsed: unknown = JSON.parse(jsonText);
      const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length === 0) throw new Error("JSON array is empty, nothing to convert");
      if (!arr.every(isPlainObject)) throw new Error("JSON must be an array of objects (e.g. [{...}, {...}])");
      const safeSheet = (sheetName.trim() || "Sheet1").replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet1";
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(arr as Record<string, unknown>[]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, safeSheet);
      XLSX.writeFile(wb, "data.xlsx");
      trial.recordUse();
      toast.success("Spreadsheet downloaded");
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusyDown(false);
    }
  };

  const loadXlsx = async (f: File) => {
    setBusyUp(true);
    setFileError(null);
    setCopied(false);
    try {
      const buf = await f.arrayBuffer();
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "array" });
      const first = wb.SheetNames[0];
      if (!first) throw new Error("No sheets found in this workbook");
      const sheet = wb.Sheets[first];
      if (!sheet) throw new Error("No sheets found in this workbook");
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (data.length === 0) throw new Error("The first sheet is empty");
      setRows(data);
      setFileName(f.name);
      toast.success(`${data.length} row${data.length === 1 ? "" : "s"} loaded from "${first}"`);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Could not read that file");
      setRows([]);
    } finally {
      setBusyUp(false);
    }
  };

  const downloadJson = () => {
    if (rows.length === 0 || !trial.canUse) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = brandFilename(`${fileName.replace(/\.[^.]+$/, "") || "data"}.json`);
    a.click();
    URL.revokeObjectURL(url);
    trial.recordUse();
    toast.success("JSON downloaded");
  };

  const copyJson = async () => {
    if (rows.length === 0) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
      setCopied(true);
      toast.success("JSON copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const columns = rows.length > 0 ? [...new Set(rows.flatMap((r) => Object.keys(r)))] : [];
  const preview = rows.slice(0, 8);

  return (
    <ToolPageShell toolId="json-excel-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON to Excel" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold">JSON to Excel</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Paste a JSON array of objects, then download a real .xlsx spreadsheet.
          </p>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='[{"name": "IconVault", "price": 29}, ...]'
            spellCheck={false}
            className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          {jsonError && <p className="mt-2 text-sm font-medium text-red-500">{jsonError}</p>}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="sheet-name" className="mb-1.5 block text-[13px] font-medium text-foreground/80">Sheet name</label>
              <input
                id="sheet-name"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Sheet1"
                spellCheck={false}
                className="w-40 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => { setJsonText(SAMPLE_JSON); setJsonError(null); }}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Sample
            </button>
          </div>
          <div className="mt-4">
            <ActionButton busy={busyDown} disabled={!trial.canUse || !jsonText.trim()} onClick={() => void downloadXlsx()}>
              <Download className="h-4 w-4" /> {busyDown ? "Building..." : "Download .xlsx"}
            </ActionButton>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Table2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold">Excel to JSON</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Upload an .xlsx file to preview it as a table and download the JSON.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busyUp}
            className={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              "border-border hover:border-primary/40 disabled:cursor-wait",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{busyUp ? "Reading spreadsheet..." : fileName || "Drop an .xlsx file or click to browse"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Reads the first sheet of the workbook</p>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadXlsx(f); e.target.value = ""; }}
          />
          {fileError && <p className="mt-2 text-sm font-medium text-red-500">{fileError}</p>}

          {rows.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">
                  {fileName} - {rows.length} rows x {columns.length} columns (showing first {preview.length})
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={copyJson}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy JSON"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadJson}
                    disabled={!trial.canUse}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Download JSON
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      {columns.map((c) => (
                        <th key={c} className="whitespace-nowrap border-b border-border p-2 font-bold">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        {columns.map((c) => (
                          <td key={c} className="max-w-[180px] truncate p-2 font-mono">{cellText(r[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left. Runs in your browser, nothing is uploaded.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Note: nested objects and arrays inside cells are stored as JSON text in the spreadsheet. Dates keep Excel date formatting.
      </p>
    </ToolPageShell>
  );
}
