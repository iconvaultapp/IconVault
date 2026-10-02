// /tools/changelog-generator - Keep-a-Changelog style CHANGELOG.md builder.
// Add entries under Added / Changed / Fixed / Deprecated / Removed /
// Security, grouped by version with dates. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, History, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/changelog-generator")({
  head: () => {
    const seo = getToolSeoMeta("changelog-generator");
    const canonical = "https://iconvault.site/tools/changelog-generator";
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
  component: ChangelogGeneratorTool,
});

const TYPES = ["Added", "Changed", "Fixed", "Deprecated", "Removed", "Security"] as const;
type ChangeType = (typeof TYPES)[number];

interface Entry {
  id: number;
  version: string; // "" = Unreleased
  date: string;
  type: ChangeType;
  text: string;
}

let entryId = 1;

const today = () => new Date().toISOString().slice(0, 10);

function ChangelogGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("changelog-generator", isPro);
  const seo = getToolSeo("changelog-generator");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [version, setVersion] = useState("1.0.0");
  const [date, setDate] = useState(today);
  const [type, setType] = useState<ChangeType>("Added");
  const [text, setText] = useState("");

  const addEntry = () => {
    const t = text.trim();
    if (!t) {
      toast.error("Write the change description first.");
      return;
    }
    setEntries((e) => [...e, { id: entryId++, version: version.trim(), date, type, text: t }]);
    setText("");
    toast.success("Entry added");
  };

  const delEntry = (id: number) => setEntries((e) => e.filter((x) => x.id !== id));

  const markdown = useMemo(() => {
    const lines = [
      "# Changelog",
      "",
      "All notable changes to this project will be documented in this file.",
      "",
      "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),",
      "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
      "",
    ];
    // Preserve first-seen order of versions
    const order: string[] = [];
    for (const e of entries) {
      if (!order.includes(e.version)) order.push(e.version);
    }
    for (const v of order) {
      const group = entries.filter((e) => e.version === v);
      const heading = v === "" ? "## [Unreleased]" : `## [${v}] - ${group[0]!.date || today()}`;
      lines.push(heading, "");
      for (const t of TYPES) {
        const items = group.filter((e) => e.type === t);
        if (!items.length) continue;
        lines.push(`### ${t}`, "");
        for (const item of items) lines.push(`- ${item.text}`);
        lines.push("");
      }
    }
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }, [entries]);

  const copyMd = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(markdown);
      trial.recordUse();
      toast.success("CHANGELOG.md copied to clipboard");
    } catch {
      toast.error("Copy failed, select the text manually.");
    }
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown" }), "CHANGELOG.md");
    trial.recordUse();
    toast.success("CHANGELOG.md downloaded");
  };

  return (
    <ToolPageShell toolId="changelog-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Changelog Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
            <History className="h-4 w-4" /> Add a changelog entry
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Version</label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.2.0 (blank = Unreleased)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Change type</p>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-bold transition",
                    type === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">What changed</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="e.g. Dark mode toggle in the header"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addEntry(); }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">Tip: Ctrl/⌘ + Enter adds the entry.</p>
          </div>

          <ActionButton onClick={addEntry}>
            <Plus className="h-4 w-4" /> Add entry
          </ActionButton>

          {entries.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Entries ({entries.length})</p>
              <ul className="max-h-48 space-y-1.5 overflow-auto">
                {entries.map((e) => (
                  <li key={e.id} className="flex items-start gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
                    <span className="mt-0.5 shrink-0 rounded bg-primary/15 px-1.5 py-0.5 font-bold text-primary">{e.type}</span>
                    <span className="flex-1 text-foreground/80">
                      <span className="font-mono font-bold">{e.version || "Unreleased"}</span> - {e.text}
                    </span>
                    <button type="button" onClick={() => delEntry(e.id)} aria-label="Delete entry" className="text-muted-foreground transition hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton disabled={!trial.canUse} onClick={download}>
              <Download className="h-4 w-4" /> Download CHANGELOG.md
            </ActionButton>
            <button
              type="button"
              disabled={!trial.canUse}
              onClick={copyMd}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">Everything stays in your browser.</p>}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <p className="text-sm font-bold">CHANGELOG.md preview</p>
          </div>
          {entries.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <History className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">No entries yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first entry on the left. Entries are grouped under each version in Keep-a-Changelog format.
              </p>
            </div>
          ) : (
            <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-relaxed">{markdown}</pre>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
