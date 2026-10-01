// /tools/npm-name-checker - Check npm package name availability, one per line.
// 404 from the registry means available. 100% in-browser.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Eraser, PackageSearch, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/npm-name-checker")({
  head: () => {
    const seo = getToolSeoMeta("npm-name-checker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: NpmNameCheckerTool,
});

type Status = "checking" | "available" | "taken" | "error";
interface Row { name: string; status: Status }

function normalizeName(raw: string): string | null {
  const n = raw.trim();
  if (!n) return null;
  return n;
}

async function checkName(name: string): Promise<Status> {
  try {
    // encodeURIComponent handles @scope/name correctly (@scope%2fname)
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (res.status === 404) return "available";
    if (res.ok) return "taken";
    return "error";
  } catch {
    return "error";
  }
}

function NpmNameCheckerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("npm-name-checker", isPro);
  const seo = getToolSeo("npm-name-checker");

  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    const names = input.split("\n").map(normalizeName).filter((n): n is string => !!n);
    if (names.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setRows(names.map((name) => ({ name, status: "checking" as Status })));
    const CONCURRENCY = 4;
    const queue = names.slice();
    const update = (name: string, status: Status) =>
      setRows((prev) => prev.map((r) => (r.name === name && r.status === "checking" ? { ...r, status } : r)));
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0) {
          const name = queue.shift()!;
          update(name, await checkName(name));
        }
      }),
    );
    setBusy(false);
    trial.recordUse();
  }, [input, busy, trial]);

  const copyAvailable = useCallback(async () => {
    const avail = rows.filter((r) => r.status === "available").map((r) => r.name);
    if (avail.length === 0) return;
    try {
      await navigator.clipboard.writeText(avail.join("\n"));
      toast.success(`${avail.length} available name${avail.length === 1 ? "" : "s"} copied`);
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  }, [rows]);

  const availableCount = rows.filter((r) => r.status === "available").length;
  const done = rows.length > 0 && !busy && rows.every((r) => r.status !== "checking");

  return (
    <ToolPageShell toolId="npm-name-checker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="npm Name Checker" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-2 text-[13px] font-medium text-foreground/80">Package names, one per line</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"my-cool-lib\n@my-scope/my-cool-lib"}
            spellCheck={false}
            className="h-40 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton busy={busy} disabled={!input.trim() || busy || !trial.canUse} onClick={run}>
              <PackageSearch className="h-4 w-4" /> {busy ? "Checking…" : "Check names"}
            </ActionButton>
            <button type="button" onClick={() => { setInput(""); setRows([]); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                {done
                  ? `${availableCount} of ${rows.length} available`
                  : `Checking ${rows.length} name${rows.length === 1 ? "" : "s"}…`}
              </p>
              {done && availableCount > 0 && (
                <button type="button" onClick={copyAvailable} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Copy className="h-3.5 w-3.5" /> Copy available list
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.name} className="border-b border-border last:border-0">
                      <td className="break-all px-4 py-2.5 font-mono font-semibold">{r.name}</td>
                      <td className="w-40 px-4 py-2.5 text-right">
                        {r.status === "checking" && <span className="text-muted-foreground">Checking…</span>}
                        {r.status === "available" && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-bold text-green-700 dark:text-green-400")}>
                            <Check className="h-3.5 w-3.5" /> Available
                          </span>
                        )}
                        {r.status === "taken" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                            <X className="h-3.5 w-3.5" /> Taken
                          </span>
                        )}
                        {r.status === "error" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                            Unknown
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Scoped names like <code className="rounded bg-muted px-1">@scope/name</code> are supported. A name that shows Available can still be rejected by npm if it violates naming rules.
            </p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
