import { brandFilename } from "@/lib/logo-builder";
import { downloadWithGate } from "./download-guard";
/** Minimal, dependency-free CSV export helpers used by the account and admin pages. */

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Guard against spreadsheet formula injection while keeping the text readable.
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsv = (headers: string[], rows: unknown[][]): string =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");

export const downloadCsv = (filename: string, headers: string[], rows: unknown[][]) => {
  if (typeof window === "undefined") return;
  const blob = new Blob([`\uFEFF${toCsv(headers, rows)}`], {
    type: "text/csv;charset=utf-8;",
  });
  // v55 site-wide download gate (same parking + resume as downloadBlob).
  downloadWithGate(blob, brandFilename(filename));
};

export const stamp = () => new Date().toISOString().slice(0, 10);
