// /tools/npm-package-checker - Look up an npm package: latest version, license,
// downloads, repo, age and a heuristic health grade. Uses only public registry
// data; nothing is uploaded.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, ExternalLink, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/npm-package-checker")({
  head: () => {
    const seo = getToolSeoMeta("npm-package-checker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: NpmCheckerTool,
});

interface PkgInfo {
  name: string;
  version: string;
  description: string;
  license: string;
  repoUrl: string;
  homepage: string;
  created: string;
  modified: string;
  downloads: number | null;
  keywords: string[];
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function ageLabel(iso: string): string {
  const years = (Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (years < 1 / 12) return "under a month";
  if (years < 1) return `${Math.floor(years * 12)} months`;
  return `${years.toFixed(1)} years`;
}

function sinceLabel(iso: string): string {
  const days = (Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000);
  if (days < 1) return "today";
  if (days < 30) return `${Math.floor(days)} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${(days / 365).toFixed(1)} years ago`;
}

function grade(info: PkgInfo): { letter: string; color: string } {
  let score = 0;
  const dl = info.downloads ?? 0;
  if (dl > 1_000_000) score += 2;
  else if (dl > 100_000) score += 1.5;
  else if (dl > 10_000) score += 1;
  else if (dl > 1_000) score += 0.5;
  const daysSince = (Date.now() - new Date(info.modified).getTime()) / (24 * 3600 * 1000);
  if (daysSince < 90) score += 1;
  else if (daysSince < 365) score += 0.5;
  if (info.license && info.license !== "UNLICENSED") score += 1;
  if (info.repoUrl) score += 0.5;
  if (info.description) score += 0.5;
  const letter = score >= 5 ? "A" : score >= 4 ? "B" : score >= 3 ? "C" : score >= 2 ? "D" : "F";
  const color =
    letter === "A" ? "text-green-600" :
    letter === "B" ? "text-lime-600" :
    letter === "C" ? "text-yellow-600" :
    letter === "D" ? "text-orange-600" : "text-red-600";
  return { letter, color };
}

function NpmCheckerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("npm-package-checker", isPro);
  const seo = getToolSeo("npm-package-checker");

  const [name, setName] = useState("");
  const [info, setInfo] = useState<PkgInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const pkg = name.trim();
    if (!pkg || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    setNotFound(false);
    try {
      const enc = encodeURIComponent(pkg);
      const metaRes = await fetch(`https://registry.npmjs.org/${enc}`);
      if (metaRes.status === 404) {
        setNotFound(true);
        trial.recordUse();
        return;
      }
      if (!metaRes.ok) throw new Error(`Registry returned ${metaRes.status}.`);
      const meta = await metaRes.json();
      const latest: string = meta["dist-tags"]?.latest;
      const ver = meta.versions?.[latest] ?? {};
      let downloads: number | null = null;
      try {
        const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-month/${enc}`);
        if (dlRes.ok) downloads = (await dlRes.json()).downloads ?? null;
      } catch {
        downloads = null;
      }
      const repo = ver.repository ?? meta.repository;
      setInfo({
        name: meta.name ?? pkg,
        version: latest ?? "?",
        description: ver.description ?? meta.description ?? "",
        license: ver.license ?? "",
        repoUrl: typeof repo === "object" ? repo.url ?? "" : repo ?? "",
        homepage: ver.homepage ?? "",
        created: meta.time?.created ?? "",
        modified: meta.time?.modified ?? meta.time?.[latest] ?? "",
        downloads,
        keywords: ver.keywords ?? [],
      });
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }, [name, busy, trial]);

  const copyInstall = useCallback(async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(`npm install ${info.name}`);
      toast.success("Install command copied");
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  }, [info]);

  const g = info ? grade(info) : null;

  return (
    <ToolPageShell toolId="npm-package-checker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="npm Checker" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void check(); }}
              placeholder="Package name, e.g. react or @scope/name"
              spellCheck={false}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm"
            />
            <ActionButton busy={busy} disabled={!name.trim() || busy || !trial.canUse} onClick={check}>
              <PackageSearch className="h-4 w-4" /> {busy ? "Checking…" : "Check package"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-2 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free checks left - runs in your browser, nothing is uploaded.
            </p>
          )}
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
          {notFound && (
            <p className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
              <b className="text-green-700 dark:text-green-400">{name.trim()}</b> is not on npm - this name looks available.
            </p>
          )}
        </div>

        {info && g && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-mono text-xl font-bold">{info.name}</h2>
                {info.description && <p className="mt-1 text-sm text-muted-foreground">{info.description}</p>}
              </div>
              <div className="text-center">
                <div className={cn("font-mono text-4xl font-black", g.color)}>{g.letter}</div>
                <div className="text-xs font-semibold text-muted-foreground">health grade</div>
              </div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Latest version", info.version || "-"],
                ["License", info.license || "not declared"],
                ["Downloads (last 30 days)", info.downloads === null ? "unavailable" : compact(info.downloads)],
                ["Published", info.modified ? sinceLabel(info.modified) : "-"],
                ["Package age", info.created ? ageLabel(info.created) : "-"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="mt-1 font-mono text-sm font-bold">{v}</dd>
                </div>
              ))}
              <div className="rounded-xl border border-border px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Links</dt>
                <dd className="mt-1 flex flex-wrap gap-2 text-sm">
                  {info.repoUrl ? (
                    <a href={info.repoUrl.replace(/^git\+/, "").replace(/\.git$/, "")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                      Repository <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No repo link</span>
                  )}
                  <button type="button" onClick={copyInstall} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    <Copy className="h-3.5 w-3.5" /> npm install
                  </button>
                </dd>
              </div>
            </dl>
            {info.keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {info.keywords.slice(0, 12).map((k) => (
                  <span key={k} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{k}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          This shows public data from the npm registry only. The health grade is a rough
          heuristic based on download volume, release recency, license and repository presence -
          it is not a security audit. Always review a package yourself before adding it to a project.
        </p>
      </div>
    </ToolPageShell>
  );
}
