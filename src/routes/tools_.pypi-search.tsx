// /tools/pypi-search - Explore Python packages: details, version history and
// one-click `pip install` copy. Data comes from the public PyPI JSON API.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, Check, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/pypi-search")({
  head: () => {
    const seo = getToolSeoMeta("pypi-search");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PypiSearchTool,
});

interface ReleaseFile {
  upload_time_iso_8601?: string;
}

interface PkgInfo {
  name: string;
  version: string;
  summary: string;
  author: string;
  license: string;
  home_page: string;
  project_url: string;
  requires_python: string;
  keywords: string;
}

interface PkgResult {
  info: PkgInfo;
  releases: { version: string; date: string }[];
}

function PypiSearchTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pypi-search", isPro);
  const seo = getToolSeo("pypi-search");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PkgResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const search = async () => {
    const clean = name.trim();
    if (!clean || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(clean)}/json`);
      if (res.status === 404) throw new Error(`No project named "${clean}" on PyPI.`);
      if (!res.ok) throw new Error(`PyPI returned HTTP ${res.status}. Try again shortly.`);
      const data = await res.json();
      const releases: { version: string; date: string }[] = Object.entries(data.releases ?? {})
        .map(([version, files]) => {
          const f = files as ReleaseFile[];
          const first = Array.isArray(f) && f.length > 0 ? f[0] : null;
          return { version, date: first?.upload_time_iso_8601 ?? "" };
        })
        .filter((r) => r.date)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 15);
      setResult({ info: data.info as PkgInfo, releases });
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const copyInstall = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`pip install ${result.info.name}`);
      setCopied(true);
      toast.success("Install command copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  };

  return (
    <ToolPageShell toolId="pypi-search" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="PyPI Search" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">Python package name</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
                placeholder="e.g. requests, numpy, fastapi"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 font-mono text-sm outline-none focus:border-primary/50"
              />
            </div>
            <ActionButton busy={busy} disabled={!name.trim() || !trial.canUse} onClick={search}>
              <Search className="h-4 w-4" /> {busy ? "Loading…" : "Look up"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free lookups left. Data comes live from pypi.org.
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {result && (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xl font-bold">
                    {result.info.name}{" "}
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 align-middle font-mono text-xs text-primary">
                      v{result.info.version}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{result.info.summary || "No summary."}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyInstall()}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-3.5 py-2 font-mono text-xs font-semibold transition hover:border-primary/50",
                    copied && "border-emerald-500/50 text-emerald-500",
                  )}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  pip install {result.info.name}
                </button>
              </div>

              <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ["Author", result.info.author || "Unknown"],
                  ["License", result.info.license || "Not declared"],
                  ["Requires Python", result.info.requires_python || "Any"],
                  ["Keywords", result.info.keywords || "None"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-muted/50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="mt-1 break-words text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>

              {(result.info.home_page || result.info.project_url) && (
                <a
                  href={result.info.project_url || result.info.home_page}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  Project homepage <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold">
                <CalendarDays className="h-4 w-4 text-primary" /> Version history
              </p>
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {result.releases.length === 0 && (
                  <p className="text-xs text-muted-foreground">No release dates published.</p>
                )}
                {result.releases.map((r) => (
                  <div key={r.version} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <code className="font-mono text-xs font-semibold">{r.version}</code>
                    <span className="text-xs text-muted-foreground">{r.date.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
