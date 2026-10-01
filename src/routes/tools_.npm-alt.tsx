// /tools/npm-alt - Find alternative npm packages by keyword overlap with the
// reference package, ranked by shared keywords and monthly downloads.
// Data comes live from registry.npmjs.org and api.npmjs.org.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, ExternalLink, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/npm-alt")({
  head: () => {
    const seo = getToolSeoMeta("npm-alt");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: NpmAltTool,
});

interface Alt {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  shared: number;
  downloads: number;
  score: number;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

async function findAlternatives(name: string): Promise<{ alts: Alt[]; keywords: string[] }> {
  const metaRes = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  if (metaRes.status === 404) throw new Error(`Package "${name}" not found on npm.`);
  if (!metaRes.ok) throw new Error(`registry.npmjs.org returned HTTP ${metaRes.status}.`);
  const meta = (await metaRes.json()) as { keywords?: string[] };
  const keywords = (meta.keywords ?? []).map((k) => String(k).toLowerCase()).filter(Boolean);
  if (keywords.length === 0) throw new Error(`"${name}" has no keywords, so overlap search is not possible.`);

  const query = keywords.slice(0, 5).join(" ");
  const searchRes = await fetch(
    `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=40`,
  );
  if (!searchRes.ok) throw new Error(`npm search returned HTTP ${searchRes.status}.`);
  const data = (await searchRes.json()) as {
    objects: { package: { name: string; version: string; description: string; keywords: string[] } }[];
  };

  const candidates = data.objects
    .filter((o) => o.package.name.toLowerCase() !== name.toLowerCase())
    .map((o) => {
      const kws = (o.package.keywords ?? []).map((k) => String(k).toLowerCase());
      const shared = keywords.filter((k) => kws.includes(k)).length;
      return {
        name: o.package.name,
        version: o.package.version,
        description: o.package.description ?? "",
        keywords: kws,
        shared,
      };
    })
    .filter((c) => c.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 10);

  const alts: Alt[] = await Promise.all(
    candidates.map(async (c) => {
      let downloads = 0;
      try {
        const dl = await fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(c.name)}`);
        if (dl.ok) downloads = ((await dl.json()) as { downloads?: number }).downloads ?? 0;
      } catch {
        // keep 0
      }
      return {
        ...c,
        downloads,
        score: c.shared * 2 + Math.log10(downloads + 1),
      };
    }),
  );
  alts.sort((a, b) => b.score - a.score);
  return { alts, keywords };
}

function NpmAltTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("npm-alt", isPro);
  const seo = getToolSeo("npm-alt");

  const [input, setInput] = useState("moment");
  const [alts, setAlts] = useState<Alt[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [searched, setSearched] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    const name = input.trim().toLowerCase();
    if (!name || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const { alts: found, keywords: kws } = await findAlternatives(name);
      setAlts(found);
      setKeywords(kws);
      setSearched(name);
      trial.recordUse();
      toast.success(`Found ${found.length} alternatives to ${name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed. The npm registry may be unreachable.");
    } finally {
      setBusy(false);
    }
  }, [input, busy, trial]);

  const copyInstall = useCallback(async (pkg: string) => {
    try {
      await navigator.clipboard.writeText(`npm install ${pkg}`);
      toast.success("Install command copied");
    } catch {
      toast.error("Copy failed in this browser.");
    }
  }, []);

  return (
    <ToolPageShell toolId="npm-alt" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="NPM Alternatives" left={trial.left} />

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-2 text-[13px] font-medium text-foreground/80">
            Find alternatives to an npm package
          </p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void run();
              }}
              spellCheck={false}
              placeholder="moment"
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
            <ActionButton busy={busy} disabled={!input.trim() || !trial.canUse} onClick={run}>
              <PackageSearch className="h-4 w-4" /> {busy ? "Searching..." : "Find"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-2 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free searches left. Live data from the npm registry.
            </p>
          )}
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Ranked by keyword overlap with the reference package plus monthly downloads. This is a
            discovery heuristic, not a quality audit - always check docs and maintenance before
            switching.
          </p>
        </div>

        {searched && (
          <div className="mt-6">
            <p className="mb-3 text-sm text-muted-foreground">
              Alternatives to <span className="font-mono font-bold text-foreground">{searched}</span>
              {keywords.length > 0 && (
                <>
                  {" "}based on keywords:{" "}
                  {keywords.slice(0, 6).map((k) => (
                    <span key={k} className="mr-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                      {k}
                    </span>
                  ))}
                </>
              )}
            </p>
            {alts.length === 0 ? (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No keyword-overlapping packages found. Try a package with richer keyword metadata.
              </p>
            ) : (
              <ul className="space-y-3">
                {alts.map((a) => (
                  <li key={a.name} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <a
                        href={`https://www.npmjs.com/package/${a.name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-sm font-bold text-primary hover:underline"
                      >
                        {a.name} <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="font-mono text-xs text-muted-foreground">v{a.version}</span>
                      <span className="text-xs text-muted-foreground">{fmt(a.downloads)} downloads/mo</span>
                      <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs font-bold text-green-600 dark:text-green-400">
                        {a.shared} shared keyword{a.shared === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyInstall(a.name)}
                        className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-mono text-xs transition hover:border-primary/40"
                      >
                        <Copy className="h-3 w-3" /> npm install {a.name}
                      </button>
                    </div>
                    {a.description && (
                      <p className="mt-1.5 text-sm text-muted-foreground">{a.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
