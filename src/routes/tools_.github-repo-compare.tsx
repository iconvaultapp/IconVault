// /tools/github-repo-compare - Compare two GitHub repositories side by side:
// stars, forks, issues, watchers, last push, license, languages, topics.
// Uses the public GitHub API only; nothing is uploaded.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/github-repo-compare")({
  head: () => {
    const seo = getToolSeoMeta("github-repo-compare");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: RepoCompareTool,
});

interface RepoInfo {
  fullName: string;
  htmlUrl: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  pushedAt: string;
  license: string;
  languages: string[];
  topics: string[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const days = (Date.now() - d.getTime()) / (24 * 3600 * 1000);
  const date = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  if (days < 1) return `${date} (today)`;
  if (days < 30) return `${date} (${Math.floor(days)}d ago)`;
  if (days < 365) return `${date} (${Math.floor(days / 30)}mo ago)`;
  return `${date} (${(days / 365).toFixed(1)}y ago)`;
}

async function fetchRepo(ref: string): Promise<RepoInfo> {
  const trimmed = ref.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
  if (!/^[\w.-]+\/[\w.-]+$/.test(trimmed)) throw new Error(`"${ref}" does not look like owner/repo.`);
  const res = await fetch(`https://api.github.com/repos/${trimmed}`);
  if (res.status === 404) throw new Error(`Repository "${trimmed}" was not found.`);
  if (res.status === 403) throw new Error("GitHub rate limit reached (60 requests/hour). Try again later.");
  if (!res.ok) throw new Error(`GitHub returned ${res.status}.`);
  const r = await res.json();
  let languages: string[] = [];
  try {
    const lres = await fetch(r.languages_url);
    if (lres.ok) {
      const langs = await lres.json();
      languages = Object.entries(langs)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([k]) => k);
    }
  } catch {
    languages = [];
  }
  return {
    fullName: r.full_name,
    htmlUrl: r.html_url,
    description: r.description ?? "",
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    openIssues: r.open_issues_count ?? 0,
    watchers: r.subscribers_count ?? 0,
    pushedAt: r.pushed_at ?? "",
    license: r.license?.spdx_id ?? r.license?.name ?? "none",
    languages,
    topics: r.topics ?? [],
  };
}

function RepoCompareTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("github-repo-compare", isPro);
  const seo = getToolSeo("github-repo-compare");

  const [aRef, setARef] = useState("");
  const [bRef, setBRef] = useState("");
  const [repos, setRepos] = useState<[RepoInfo, RepoInfo] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(async () => {
    if (!aRef.trim() || !bRef.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setRepos(null);
    try {
      const [a, b] = await Promise.all([fetchRepo(aRef), fetchRepo(bRef)]);
      setRepos([a, b]);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed.");
    } finally {
      setBusy(false);
    }
  }, [aRef, bRef, busy, trial]);

  const [a, b] = repos ?? [null, null];

  const rows: { label: string; av: string; bv: string; win: "a" | "b" | "tie" | null }[] = a && b ? [
    { label: "Stars", av: fmt(a.stars), bv: fmt(b.stars), win: a.stars === b.stars ? "tie" : a.stars > b.stars ? "a" : "b" },
    { label: "Forks", av: fmt(a.forks), bv: fmt(b.forks), win: a.forks === b.forks ? "tie" : a.forks > b.forks ? "a" : "b" },
    { label: "Watchers", av: fmt(a.watchers), bv: fmt(b.watchers), win: a.watchers === b.watchers ? "tie" : a.watchers > b.watchers ? "a" : "b" },
    { label: "Open issues", av: fmt(a.openIssues), bv: fmt(b.openIssues), win: a.openIssues === b.openIssues ? "tie" : a.openIssues < b.openIssues ? "a" : "b" },
    { label: "Last push", av: dateLabel(a.pushedAt), bv: dateLabel(b.pushedAt), win: null },
    { label: "License", av: a.license, bv: b.license, win: null },
    { label: "Top languages", av: a.languages.join(", ") || "-", bv: b.languages.join(", ") || "-", win: null },
    { label: "Topics", av: a.topics.slice(0, 8).join(", ") || "-", bv: b.topics.slice(0, 8).join(", ") || "-", win: null },
  ] : [];

  const cell = (v: string, side: "a" | "b", win: "a" | "b" | "tie" | null) => (
    <td className={cn("px-4 py-2.5", side === "a" ? "text-right" : "text-left", win === side && "font-black text-green-600 dark:text-green-400")}>
      {v}
    </td>
  );

  return (
    <ToolPageShell toolId="github-repo-compare" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Repo Compare" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-medium text-foreground/80">
              Repository A
              <input
                value={aRef}
                onChange={(e) => setARef(e.target.value)}
                placeholder="facebook/react"
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <label className="text-[13px] font-medium text-foreground/80">
              Repository B
              <input
                value={bRef}
                onChange={(e) => setBRef(e.target.value)}
                placeholder="vuejs/vue"
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton busy={busy} disabled={!aRef.trim() || !bRef.trim() || busy || !trial.canUse} onClick={compare}>
              <GitCompareArrows className="h-4 w-4" /> {busy ? "Comparing…" : "Compare"}
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {repos && a && b && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-28 px-4 py-3" />
                  <th className="px-4 py-3 text-right">
                    <a href={a.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono font-bold text-primary hover:underline">
                      {a.fullName} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {a.description && <p className="mt-1 text-xs font-normal text-muted-foreground">{a.description}</p>}
                  </th>
                  <th className="px-4 py-3 text-left">
                    <a href={b.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono font-bold text-primary hover:underline">
                      {b.fullName} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {b.description && <p className="mt-1 text-xs font-normal text-muted-foreground">{b.description}</p>}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</td>
                    {cell(r.av, "a", r.win)}
                    {cell(r.bv, "b", r.win)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Uses the public GitHub API, which allows 60 requests per hour without signing in
          (each comparison uses 4). Green bold values mark the winner for stars, forks,
          watchers and open issues.
        </p>
      </div>
    </ToolPageShell>
  );
}
