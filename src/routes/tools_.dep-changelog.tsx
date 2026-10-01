// /tools/dep-changelog - See what changed in dependencies: npm version
// timeline between two versions plus GitHub releases matched to that range.
// Falls back gracefully when GitHub is unreachable or rate-limited.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileDiff, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/dep-changelog")({
  head: () => {
    const seo = getToolSeoMeta("dep-changelog");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: DepChangelogTool,
});

interface VersionRow {
  version: string;
  date: string;
}

interface ReleaseNote {
  tag: string;
  name: string;
  date: string;
  body: string;
  url: string;
}

interface Result {
  name: string;
  from: string;
  to: string;
  repoUrl: string | null;
  repoPath: string | null;
  versions: VersionRow[];
  releases: ReleaseNote[];
  releaseNote: string;
}

function parseRepo(input: unknown): string | null {
  let url: string | null = null;
  if (typeof input === "string") url = input;
  else if (input && typeof input === "object") {
    const r = input as { url?: string };
    if (typeof r.url === "string") url = r.url;
  }
  if (!url) return null;
  const m = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git|\/|$)/i);
  return m ? m[1]!.replace(/\/$/, "") : null;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

async function lookup(name: string, from: string, to: string): Promise<Result> {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  if (res.status === 404) throw new Error(`Package "${name}" not found on npm.`);
  if (!res.ok) throw new Error(`registry.npmjs.org returned HTTP ${res.status}.`);
  const doc = (await res.json()) as {
    versions?: Record<string, unknown>;
    time?: Record<string, string>;
    repository?: unknown;
  };
  const time = doc.time ?? {};
  if (!time[from]) throw new Error(`Version "${from}" was never published for ${name}.`);
  if (!time[to]) throw new Error(`Version "${to}" was never published for ${name}.`);

  const fromDate = new Date(time[from]!).getTime();
  const toDate = new Date(time[to]!).getTime();
  const [lo, hi] = fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
  const [loV, hiV] = fromDate <= toDate ? [from, to] : [to, from];

  const versions: VersionRow[] = Object.entries(time)
    .filter(([v]) => v !== "created" && v !== "modified" && doc.versions?.[v])
    .map(([version, date]) => ({ version, date: date as string }))
    .filter((v) => {
      const t = new Date(v.date).getTime();
      return t >= lo && t <= hi;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const repoPath = parseRepo(doc.repository);
  const repoUrl = repoPath ? `https://github.com/${repoPath}` : null;
  const releases: ReleaseNote[] = [];
  let releaseNote = "";

  if (repoPath) {
    try {
      const gres = await fetch(`https://api.github.com/repos/${repoPath}/releases?per_page=100`);
      if (gres.status === 403) {
        releaseNote = "GitHub API rate limit reached (60 requests/hour for anonymous calls). Version timeline below is still accurate; open the repo to read release notes.";
      } else if (gres.ok) {
        const list = (await gres.json()) as {
          tag_name: string;
          name: string;
          published_at: string;
          body: string;
          html_url: string;
        }[];
        for (const r of list) {
          const tag = r.tag_name.replace(/^v/i, "");
          const match = versions.some((v) => v.version === tag || r.tag_name.toLowerCase().includes(v.version.toLowerCase()));
          if (match) {
            releases.push({
              tag: r.tag_name,
              name: r.name || r.tag_name,
              date: r.published_at,
              body: (r.body || "").slice(0, 1500),
              url: r.html_url,
            });
          }
        }
        releases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (releases.length === 0) {
          releaseNote = "No GitHub releases matched these versions. The project may use a changelog file or a different tagging scheme.";
        }
      } else {
        releaseNote = `GitHub returned HTTP ${gres.status}. Version timeline below is still accurate.`;
      }
    } catch {
      releaseNote = "GitHub was unreachable from this browser. Version timeline below is still accurate.";
    }
  } else {
    releaseNote = "No GitHub repository is listed for this package, so only the npm version timeline is shown.";
  }

  return { name, from: loV, to: hiV, repoUrl, repoPath, versions, releases, releaseNote };
}

function DepChangelogTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("dep-changelog", isPro);
  const seo = getToolSeo("dep-changelog");

  const [name, setName] = useState("react");
  const [from, setFrom] = useState("18.0.0");
  const [to, setTo] = useState("18.2.0");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    const n = name.trim().toLowerCase();
    if (!n || !from.trim() || !to.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const r = await lookup(n, from.trim(), to.trim());
      setResult(r);
      trial.recordUse();
      toast.success(`Changelog for ${n}: ${r.versions.length} versions in range`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed. The npm registry may be unreachable.");
    } finally {
      setBusy(false);
    }
  }, [name, from, to, busy, trial]);

  return (
    <ToolPageShell toolId="dep-changelog" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Dep Changelog" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Package</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              spellCheck={false}
              placeholder="react"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">From version</p>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                spellCheck={false}
                placeholder="18.0.0"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">To version</p>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                spellCheck={false}
                placeholder="18.2.0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void run();
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <ActionButton busy={busy} disabled={!name.trim() || !from.trim() || !to.trim() || !trial.canUse} onClick={run}>
            <FileDiff className="h-4 w-4" /> {busy ? "Looking up..." : "Show changelog"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free lookups left. Live data from npm and GitHub.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4">
          {!result ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">The changelog appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter a package and two versions to see everything published between them, with
                release notes matched from GitHub.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card p-5">
                <p className="font-mono text-lg font-bold">{result.name}</p>
                <p className="text-sm text-muted-foreground">
                  {result.from} to {result.to} - {result.versions.length} versions
                </p>
                {result.repoUrl && (
                  <a
                    href={result.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Repository
                  </a>
                )}
                {result.repoPath && (
                  <a
                    href={`https://github.com/${result.repoPath}/compare/v${result.from}...v${result.to}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Compare on GitHub
                  </a>
                )}
              </div>

              {result.releases.length > 0 ? (
                <div className="space-y-4">
                  {result.releases.map((r) => (
                    <div key={r.tag} className="rounded-2xl border border-border bg-card p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-sm font-bold text-primary hover:underline"
                        >
                          {r.tag}
                        </a>
                        <span className="text-sm font-semibold">{r.name}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(r.date)}</span>
                      </div>
                      {r.body ? (
                        <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                          {r.body}
                        </pre>
                      ) : (
                        <p className="text-sm text-muted-foreground">No release notes written for this tag.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                  {result.releaseNote}
                </p>
              )}

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-[13px] font-medium text-foreground/80">
                  npm versions published in this range
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {result.versions.map((v) => (
                    <li
                      key={v.version}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3.5 py-2",
                        v.version === result.from || v.version === result.to
                          ? "border-primary/50 bg-primary/5"
                          : "border-border",
                      )}
                    >
                      <span className="font-mono text-sm font-bold">{v.version}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(v.date)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
