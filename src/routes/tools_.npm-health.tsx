// /tools/npm-health - Package health checker: 9 real metrics from the npm
// registry plus an A-F grade. Everything runs in your browser; the registry
// is queried directly from this page.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, HeartPulse, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/npm-health";
import toolSeoMeta from "@/lib/tool-seo-meta-data/npm-health";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/npm-health")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/npm-health";
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
  component: NpmHealthTool,
});

interface Metric {
  label: string;
  detail: string;
  ok: boolean;
  warn: boolean;
}

interface HealthResult {
  name: string;
  version: string;
  modified: string;
  metrics: Metric[];
  score: number;
  grade: string;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

function gradeFor(score: number): string {
  if (score >= 8.5) return "A";
  if (score >= 7) return "B";
  if (score >= 5) return "C";
  if (score >= 3) return "D";
  return "F";
}

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  B: "bg-lime-500/15 text-lime-600 border-lime-500/30",
  C: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  D: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  F: "bg-red-500/15 text-red-500 border-red-500/30",
};

function m(label: string, detail: string, ok: boolean, warn = false): Metric {
  return { label, detail, ok, warn };
}

async function checkHealth(name: string): Promise<HealthResult> {
  const clean = name.trim().toLowerCase();
  const metaRes = await fetch(`https://registry.npmjs.org/${encodeURIComponent(clean)}`);
  if (metaRes.status === 404) throw new Error(`No package named "${clean}" on npm.`);
  if (!metaRes.ok) throw new Error(`npm registry returned HTTP ${metaRes.status}. Try again shortly.`);
  const meta = await metaRes.json();
  const latestTag: string = meta["dist-tags"]?.latest ?? "";
  const latest = (meta.versions?.[latestTag] ?? {}) as Record<string, unknown>;
  const times = meta.time as Record<string, string> | undefined;
  const modified = times?.["modified"] ?? "";
  const age = daysSince(modified);

  let weekly = 0;
  try {
    const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(clean)}`);
    if (dlRes.ok) weekly = (await dlRes.json()).downloads ?? 0;
  } catch {
    /* downloads endpoint failed; keep 0 and let the metric warn */
  }

  const maintainers: unknown[] = Array.isArray(meta.maintainers) ? meta.maintainers : [];
  const versions: string[] = meta.versions ? Object.keys(meta.versions) : [];
  const readme: string = typeof meta.readme === "string" ? meta.readme : "";
  const licenseRaw = latest["license"];
  const license = typeof licenseRaw === "string" ? licenseRaw : (licenseRaw as { type?: string } | null)?.type ?? "";
  const deprecated: string | undefined = (latest["deprecated"] as string) ?? undefined;
  const repo = latest["repository"] as { url?: string } | string | undefined;
  const repoUrl = typeof repo === "string" ? repo : repo?.url ?? "";
  const deps = latest["dependencies"] as Record<string, string> | undefined;
  const depCount = deps ? Object.keys(deps).length : 0;

  const metrics: Metric[] = [
    m(
      "Actively maintained",
      age === Infinity ? "No publish date in registry metadata." : `Last published ${Math.round(age)} days ago.`,
      age <= 180,
      age > 180 && age <= 365,
    ),
    m(
      "Download volume",
      weekly > 0 ? `${fmt(weekly)} downloads last week.` : "Could not read download stats.",
      weekly >= 100_000,
      weekly > 0 && weekly < 100_000,
    ),
    m("Not deprecated", deprecated ? `Latest version is deprecated: ${deprecated}` : "Latest version is not deprecated.", !deprecated),
    m(
      "License declared",
      license ? `Declared license: ${license}.` : "No license field in the latest version.",
      Boolean(license) && !/^unknown$/i.test(license),
    ),
    m("Repository linked", repoUrl ? "A repository URL is published in the metadata." : "No repository link in the metadata.", Boolean(repoUrl)),
    m(
      "README present",
      readme.length > 200 ? `${fmt(readme.length)} characters of README.` : "README is missing or nearly empty.",
      readme.length > 200,
      readme.length > 0 && readme.length <= 200,
    ),
    m(
      "Maintainer bus factor",
      maintainers.length >= 2 ? `${maintainers.length} maintainers.` : maintainers.length === 1 ? "Only 1 maintainer." : "No maintainers listed.",
      maintainers.length >= 2,
      maintainers.length === 1,
    ),
    m(
      "Release history",
      `${versions.length} published version${versions.length === 1 ? "" : "s"}.`,
      versions.length >= 5,
      versions.length > 1 && versions.length < 5,
    ),
    m(
      "Dependency weight",
      depCount === 0 ? "Zero runtime dependencies." : `${depCount} runtime dependencies.`,
      depCount <= 20,
      depCount > 20 && depCount <= 50,
    ),
  ];

  const score = metrics.reduce((a, x) => a + (x.ok ? 1 : x.warn ? 0.5 : 0), 0);
  return { name: clean, version: latestTag || "?", modified, metrics, score, grade: gradeFor(score) };
}

function NpmHealthTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("npm-health", isPro);
  const seo = toolSeo;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!name.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const r = await checkHealth(name);
      setResult(r);
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell toolId="npm-health" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="NPM Health" left={trial.left} />

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">npm package name</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void run(); }}
                placeholder="e.g. react, lodash, zod"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 font-mono text-sm outline-none focus:border-primary/50"
              />
            </div>
            <ActionButton busy={busy} disabled={!name.trim() || !trial.canUse} onClick={run}>
              <HeartPulse className="h-4 w-4" /> {busy ? "Checking…" : "Check health"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free checks left. Data comes live from registry.npmjs.org.
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {result && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className={cn("flex h-20 w-20 items-center justify-center rounded-2xl border-2 text-4xl font-black", GRADE_STYLES[result.grade])}>
                {result.grade}
              </div>
              <div>
                <p className="font-mono text-lg font-bold">{result.name}</p>
                <p className="text-sm text-muted-foreground">
                  v{result.version} · scored {result.score.toFixed(1)} / 9
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              {result.metrics.map((met) => (
                <div key={met.label} className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  {met.ok ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : met.warn ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">{met.label}</p>
                    <p className="text-xs text-muted-foreground">{met.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
