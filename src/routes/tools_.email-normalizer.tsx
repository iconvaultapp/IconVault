// /tools/email-normalizer - Canonicalize email lists: lowercase, trim,
// Gmail dot/+ handling, dedupe. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Eraser, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/email-normalizer")({
  head: () => {
    const seo = getToolSeoMeta("email-normalizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: EmailNormalizerTool,
});

interface Row {
  original: string;
  normalized: string;
  valid: boolean;
  dup: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(raw: string, opts: { lower: boolean; gmail: boolean }): string {
  let e = raw.trim();
  if (opts.lower) e = e.toLowerCase();
  if (opts.gmail) {
    const at = e.lastIndexOf("@");
    if (at > 0) {
      let local = e.slice(0, at);
      const domain = e.slice(at + 1);
      if (domain === "gmail.com" || domain === "googlemail.com") {
        local = (local.split("+")[0] ?? "").replace(/\./g, "");
        e = `${local}@gmail.com`;
      }
    }
  }
  return e;
}

function EmailNormalizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("email-normalizer", isPro);
  const seo = getToolSeo("email-normalizer");

  const [input, setInput] = useState("");
  const [lower, setLower] = useState(true);
  const [gmail, setGmail] = useState(true);
  const [rows, setRows] = useState<Row[] | null>(null);

  const normalize = () => {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || !trial.canUse) return;
    const prelim = lines.map((original) => {
      const normalized = normalizeEmail(original, { lower, gmail });
      return { original, normalized, valid: EMAIL_RE.test(normalized), dup: false };
    });
    const counts = new Map<string, number>();
    for (const r of prelim) counts.set(r.normalized, (counts.get(r.normalized) ?? 0) + 1);
    setRows(prelim.map((r) => ({ ...r, dup: (counts.get(r.normalized) ?? 0) > 1 })));
    trial.recordUse();
    toast.success("Emails normalized");
  };

  const stats = useMemo(() => {
    if (!rows) return null;
    const dupCount = rows.filter((r) => r.dup).length;
    const invalid = rows.filter((r) => !r.valid).length;
    const unique = new Set(rows.map((r) => r.normalized)).size;
    return { total: rows.length, dupCount, invalid, unique };
  }, [rows]);

  const deduped = useMemo(() => {
    if (!rows) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      if (r.valid && !seen.has(r.normalized)) {
        seen.add(r.normalized);
        out.push(r.normalized);
      }
    }
    return out;
  }, [rows]);

  const copyDeduped = () => {
    if (deduped.length === 0) return;
    void navigator.clipboard.writeText(deduped.join("\n")).then(() => toast.success(`${deduped.length} emails copied`));
  };

  const downloadDeduped = () => {
    if (deduped.length === 0) return;
    downloadBlob(new Blob([deduped.join("\n")], { type: "text/plain" }), "emails-deduped.txt");
    toast.success("Deduped list downloaded");
  };

  return (
    <ToolPageShell toolId="email-normalizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Email Normalizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label htmlFor="email-input" className="text-sm font-semibold">
            Paste emails, one per line
          </label>
          <textarea
            id="email-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"John.Doe+newsletter@gmail.com\n  SUPPORT@Example.COM"}
            rows={10}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />

          <div className="space-y-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} className="h-4 w-4 accent-primary" />
              Lowercase everything
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={gmail} onChange={(e) => setGmail(e.target.checked)} className="h-4 w-4 accent-primary" />
              Gmail dots and +tags removal <span className="text-xs text-muted-foreground">(j.ohn+news@gmail.com becomes john@gmail.com)</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton busy={false} disabled={!input.trim() || !trial.canUse} onClick={normalize}>
              <MailCheck className="h-4 w-4" /> Normalize
            </ActionButton>
            <button
              type="button"
              onClick={() => { setInput(""); setRows(null); }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
            >
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free normalizations left - lists never leave your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!rows || !stats ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <MailCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Clean your mailing list</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Canonicalize casing and Gmail quirks, spot duplicates and invalid entries, then export the deduped list.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {[
                  { label: "Total", value: stats.total },
                  { label: "Unique", value: stats.unique },
                  { label: "Duplicates", value: stats.dupCount },
                  { label: "Invalid", value: stats.invalid },
                ].map((s) => (
                  <span key={s.label} className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold">
                    {s.label}: <span className="text-primary">{s.value}</span>
                  </span>
                ))}
                <span className="ml-auto flex gap-2">
                  <button type="button" onClick={copyDeduped} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-primary/40">
                    <Copy className="h-3.5 w-3.5" /> Copy deduped
                  </button>
                  <button type="button" onClick={downloadDeduped} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-primary/40">
                    <Download className="h-3.5 w-3.5" /> .txt
                  </button>
                </span>
              </div>
              <div className="max-h-[380px] overflow-auto rounded-xl border border-border">
                <table className="w-full min-w-[480px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="border-b border-border px-3 py-2 text-left font-bold text-foreground/80">Original</th>
                      <th className="border-b border-border px-3 py-2 text-left font-bold text-foreground/80">Normalized</th>
                      <th className="border-b border-border px-3 py-2 text-left font-bold text-foreground/80">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={cn(r.dup ? "bg-amber-500/10" : i % 2 === 1 ? "bg-muted/30" : undefined)}>
                        <td className="max-w-[200px] truncate border-b border-border/60 px-3 py-2 font-mono text-foreground/70">{r.original}</td>
                        <td className="max-w-[200px] truncate border-b border-border/60 px-3 py-2 font-mono text-foreground">{r.normalized}</td>
                        <td className="border-b border-border/60 px-3 py-2">
                          {!r.valid ? (
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-500">invalid</span>
                          ) : r.dup ? (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-500">duplicate</span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-500">ok</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
