// /tools/npm-compare - Side-by-side npm package comparison: downloads,
// version, license, dependencies, size, last publish. Data comes live from
// registry.npmjs.org and api.npmjs.org.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Columns2, ExternalLink, GitCompareArrows, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/npm-compare")({
  head: () => {
    const seo = getToolSeoMeta("npm-compare");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: NpmCompareTool,
});

interface Pkg {
  name: string;
  version: string;
  description: string;
  license: string;
  deps: number;
  size: number | null;
  lastPublished: string;
  downloads: number;
  homepage: string;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function fmtSize(n: number | null): string {
  if (n == null) return "n/a";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "n/a" : d.toISOString().slice(0, 10);
}

async function fetchPkg(name: string): Promise<Pkg> {
  const metaRes = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  if (metaRes.status === 404) throw new Error(`Package "${name}" not found on npm.`);
  if (!metaRes.ok) throw new Error(`"${name}": registry returned HTTP ${metaRes.status}.`);
  const meta = (await metaRes.json()) as {
    description?: string;
    "dist-tags"?: Record<string, string>;
    versions?: Record<
      string,
      { license?: string; dependencies?: Record<string, string>; dist?: { unpackedSize?: number } }
    >;
    time?: Record<string, string>;
    homepage?: string;
  };
  const latest = meta["dist-tags"]?.["latest"];
  if (!latest || !meta.versions?.[latest]) throw new Error(`"${name}" has no publishable version.`);
  const v = meta.versions[latest]!;
  let downloads = 0;
  try {
    const dl = await fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(name)}`);
    if (dl.ok) downloads = ((await dl.json()) as { downloads?: number }).downloads ?? 0;
  } catch {
    // keep 0
  }
  return {
    name,
    version: latest,
    description: meta.description ?? "",
    license: v.license ?? "n/a",
    deps: Object.keys(v.dependencies ?? {}).length,
    size: v.dist?.unpackedSize ?? null,
    lastPublished: meta.time?.[latest] ?? "",
    downloads,
    homepage: meta.homepage ?? "",
  };
}

function NpmCompareTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("npm-compare", isPro);
  const seo = getToolSeo("npm-compare");

  const [input, setInput] = useState("");
  const [names, setNames] = useState<string[]>(["react", "vue", "svelte"]);
  const [rows, setRows] = useState<Pkg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addName = () => {
    const v = input.trim().toLowerCase();
    if (!v) return;
    if (names.includes(v)) {
      toast.message(`${v} is already in the comparison`);
      return;
    }
    if (names.length >= 4) {
      toast.error("Maximum 4 packages per comparison");
      return;
    }
    setNames((p) => [...p, v]);
    setInput("");
  };

  const removeName = (n: string) => setNames((p) => p.filter((x) => x !== n));

  const run = useCallback(async () => {
    if (names.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const results = await Promise.all(names.map((n) => fetchPkg(n)));
      setRows(results);
      trial.recordUse();
      toast.success("Comparison loaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed. The npm registry may be unreachable.");
    } finally {
      setBusy(false);
    }
  }, [names, busy, trial]);

  const maxDl = Math.max(1, ...rows.map((r) => r.downloads));
  const bestDl = rows.length > 0 ? Math.max(...rows.map((r) => r.downloads)) : 0;
  const fewestDeps = rows.length > 0 ? Math.min(...rows.map((r) => r.deps)) : 0;

  const metrics: { label: string; render: (p: Pkg) => React.ReactNode; best?: (p: Pkg) => boolean }[] = [
    { label: "Latest version", render: (p) => <span className="font-mono font-bold">v{p.version}</span> },
    {
      label: "Downloads (30 days)",
      render: (p) => (
        <div>
          <p className="font-bold">{fmt(p.downloads)}</p>
          <div className="mt-1 h-1.5 w-full rounded bg-muted">
            <div className="h-1.5 rounded bg-primary" style={{ width: `${(p.downloads / maxDl) * 100}%` }} />
          </div>
        </div>
      ),
      best: (p) => p.downloads === bestDl && bestDl > 0,
    },
    { label: "License", render: (p) => p.license },
    {
      label: "Dependencies",
      render: (p) => <span className="font-bold">{p.deps}</span>,
      best: (p) => p.deps === fewestDeps,
    },
    { label: "Unpacked size", render: (p) => fmtSize(p.size) },
    { label: "Last published", render: (p) => fmtDate(p.lastPublished) },
    {
      label: "Links",
      render: (p) => (
        <span className="flex gap-3">
          <a href={`https://www.npmjs.com/package/${p.name}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-primary hover:underline">
            <ExternalLink className="h-3 w-3" /> npm
          </a>
          {p.homepage && (
            <a href={p.homepage} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-primary hover:underline">
              <ExternalLink className="h-3 w-3" /> site
            </a>
          )}
        </span>
      ),
    },
  ];

  return (
    <ToolPageShell toolId="npm-compare" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="NPM Compare" left={trial.left} />

      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-2 text-[13px] font-medium text-foreground/80">Packages to compare (up to 4)</p>
          <div className="flex flex-wrap gap-2">
            {names.map((n) => (
              <span
                key={n}
                className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 py-1.5 font-mono text-sm font-bold"
              >
                {n}
                <button
                  type="button"
                  onClick={() => removeName(n)}
                  className="text-muted-foreground transition hover:text-red-500"
                  aria-label={`Remove ${n}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addName();
              }}
              spellCheck={false}
              placeholder="Add a package, e.g. axios"
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
            <button
              type="button"
              onClick={addName}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
            >
              Add
            </button>
            <ActionButton busy={busy} disabled={names.length === 0 || !trial.canUse} onClick={run}>
              <GitCompareArrows className="h-4 w-4" /> {busy ? "Loading..." : "Compare"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-2 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free comparisons left. Live data from the npm registry.
            </p>
          )}
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {rows.length > 0 ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Metric</th>
                  {rows.map((r) => (
                    <th key={r.name} className="px-4 py-3 text-left">
                      <span className="font-mono font-bold">{r.name}</span>
                      {r.description && (
                        <span className="block max-w-[220px] truncate text-xs font-normal text-muted-foreground" title={r.description}>
                          {r.description}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{m.label}</td>
                    {rows.map((r) => (
                      <td key={r.name} className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          {m.render(r)}
                          {m.best?.(r) && (
                            <span className="h-2 w-2 rounded-full bg-green-500" title="Best in this comparison" />
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
            <Columns2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">Your comparison appears here</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add up to 4 packages and compare downloads, size, dependencies and licenses side by side.
            </p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
