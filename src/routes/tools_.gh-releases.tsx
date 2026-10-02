// /tools/gh-releases - Browse release notes for any GitHub repo with a
// version filter. Data comes from the public GitHub API.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, Download, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/gh-releases")({
  head: () => {
    const seo = getToolSeoMeta("gh-releases");
    const canonical = "https://iconvault.site/tools/gh-releases";
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
  component: GhReleasesTool,
});

interface Asset {
  name: string;
  download_count: number;
}

interface Release {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
  body: string | null;
  html_url: string;
  assets: Asset[];
}

function parseRepo(input: string): string | null {
  const t = input.trim().replace(/\/+$/, "");
  if (!t) return null;
  const gh = t.match(/github\.com\/([^/]+\/[^/?#]+)/i);
  const slug = gh?.[1];
  if (slug) return slug.replace(/\.git$/i, "");
  const parts = t.split("/").filter(Boolean);
  const owner = parts[0];
  const name = parts[1];
  if (parts.length === 2 && owner && name && /^[A-Za-z0-9_.-]+$/.test(owner) && /^[A-Za-z0-9_.-]+$/.test(name)) {
    return `${owner}/${name}`;
  }
  return null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "unpublished";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "unknown";
}

function GhReleasesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gh-releases", isPro);
  const seo = getToolSeo("gh-releases");
  const [repoInput, setRepoInput] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    if (busy || !trial.canUse) return;
    const slug = parseRepo(repoInput);
    if (!slug) {
      setError("Enter a repo as owner/name or a github.com URL.");
      return;
    }
    setBusy(true);
    setError(null);
    setReleases(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${slug}/releases?per_page=30`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (res.status === 404) throw new Error(`Repo "${slug}" not found, or it has no public releases.`);
      if (res.status === 403) throw new Error("GitHub API rate limit hit (60 requests/hour for anonymous use). Wait a bit and retry.");
      if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status}. Try again shortly.`);
      const data = (await res.json()) as Release[];
      setReleases(data);
      setRepo(slug);
      setExpanded(new Set());
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load releases.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (tag: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  const visible = (releases ?? []).filter((r) =>
    filter.trim() ? r.tag_name.toLowerCase().includes(filter.trim().toLowerCase()) : true,
  );

  return (
    <ToolPageShell toolId="gh-releases" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GitHub Releases" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">Repository</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void load(); }}
              placeholder="facebook/react or a github.com URL"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
            />
            <ActionButton busy={busy} disabled={!repoInput.trim() || !trial.canUse} onClick={load}>
              <Tag className="h-4 w-4" /> {busy ? "Loading…" : "Load releases"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free lookups left. Uses the public GitHub API (60 requests/hour anonymous).
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {releases && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-sm font-bold">{repo}</p>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by version…"
                spellCheck={false}
                autoComplete="off"
                className="rounded-xl border border-border bg-background px-3.5 py-2 font-mono text-xs outline-none focus:border-primary/50"
              />
            </div>
            {visible.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {releases.length === 0 ? "No releases published yet." : "No releases match that filter."}
              </p>
            )}
            <div className="space-y-3">
              {visible.map((r) => {
                const open = expanded.has(r.tag_name);
                const body = r.body ?? "";
                const short = body.length > 400 && !open ? body.slice(0, 400) + "…" : body;
                const totalDl = r.assets.reduce((a, x) => a + (x.download_count || 0), 0);
                return (
                  <div key={r.tag_name} className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary">
                        {r.tag_name}
                      </span>
                      {r.prerelease && (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-500">pre-release</span>
                      )}
                      {r.draft && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">draft</span>
                      )}
                      <span className="text-xs text-muted-foreground">{fmtDate(r.published_at)}</span>
                      {r.assets.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Download className="h-3.5 w-3.5" /> {r.assets.length} files · {totalDl.toLocaleString()} downloads
                        </span>
                      )}
                      <a
                        href={r.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Open on GitHub <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    {r.name && r.name !== r.tag_name && (
                      <p className="mt-2 text-sm font-semibold">{r.name}</p>
                    )}
                    {body && (
                      <div className="mt-2">
                        <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-muted-foreground">
                          {short}
                        </pre>
                        {body.length > 400 && (
                          <button
                            type="button"
                            onClick={() => toggle(r.tag_name)}
                            className={cn("mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline")}
                          >
                            {open ? "Show less" : "Read full notes"}
                            <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
