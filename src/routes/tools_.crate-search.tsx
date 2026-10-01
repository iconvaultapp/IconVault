// /tools/crate-search - Explore Rust crates from crates.io with one-click
// `cargo add` copy. Data comes from the public crates.io API.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Check, Copy, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/crate-search")({
  head: () => {
    const seo = getToolSeoMeta("crate-search");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CrateSearchTool,
});

interface Crate {
  name: string;
  description: string | null;
  newest_version: string;
  downloads: number;
  updated_at: string;
  documentation: string | null;
  repository: string | null;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (!Number.isFinite(d) || d < 0) return "unknown";
  if (d < 1) return "today";
  if (d < 30) return `${Math.round(d)}d ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

function CrateSearchTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("crate-search", isPro);
  const seo = getToolSeo("crate-search");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [crates, setCrates] = useState<Crate[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const search = async () => {
    if (!q.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(
        `https://crates.io/api/v1/crates?q=${encodeURIComponent(q.trim())}&per_page=12&sort=relevance`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`crates.io returned HTTP ${res.status}. Try again shortly.`);
      const data = await res.json();
      setCrates(data.crates ?? []);
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      toast.success(`Copied: ${text}`);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  };

  return (
    <ToolPageShell toolId="crate-search" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Crate Search" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">Search crates.io</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
                placeholder="e.g. serde, tokio, web server"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 font-mono text-sm outline-none focus:border-primary/50"
              />
            </div>
            <ActionButton busy={busy} disabled={!q.trim() || !trial.canUse} onClick={search}>
              <Search className="h-4 w-4" /> {busy ? "Searching…" : "Search"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free searches left.
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {searched && !busy && crates.length === 0 && !error && (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No crates matched. Try a shorter keyword.
          </p>
        )}

        <div className="space-y-3">
          {crates.map((c) => (
            <div key={c.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-base font-bold">
                    {c.name}{" "}
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 align-middle font-mono text-xs text-primary">
                      v{c.newest_version}
                    </span>
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {c.description || "No description provided."}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" /> {fmt(c.downloads)} downloads
                    </span>
                    <span>updated {timeAgo(c.updated_at)}</span>
                    {(c.documentation || c.repository) && (
                      <a
                        href={c.documentation || c.repository || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {c.documentation ? "docs" : "repo"} <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(`cargo add ${c.name}`)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-3.5 py-2 font-mono text-xs font-semibold transition hover:border-primary/50",
                    copied === `cargo add ${c.name}` && "border-emerald-500/50 text-emerald-500",
                  )}
                >
                  {copied === `cargo add ${c.name}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  cargo add {c.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}
