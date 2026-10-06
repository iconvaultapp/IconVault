// /tools/can-i-npm - Check npm package name availability with batch check,
// name validation and suggestions. 404 on the registry means available.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Lightbulb, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/can-i-npm";
import toolSeoMeta from "@/lib/tool-seo-meta-data/can-i-npm";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/can-i-npm")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/can-i-npm";
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
  component: CanINpmTool,
});

interface Check {
  name: string;
  valid: boolean;
  invalidReason?: string;
  available: boolean | null;
  error?: string;
}

function validateName(name: string): string | null {
  if (!name) return "Empty name.";
  if (name.length > 214) return "Over 214 characters.";
  if (name.startsWith(".") || name.startsWith("_")) return "Cannot start with . or _.";
  if (name !== name.toLowerCase()) return "Must be lowercase.";
  if (/\s/.test(name)) return "No spaces allowed.";
  if (!/^[a-z0-9._~@/-]+$/.test(name)) return "Contains characters npm rejects.";
  if (name.startsWith("@")) {
    const parts = name.split("/");
    if (parts.length !== 2 || !parts[1]) return "Scoped names look like @scope/name.";
  }
  return null;
}

function suggestionsFor(name: string): string[] {
  const base = name.replace(/^@[^/]+\//, "");
  const out = [`get-${base}`, `${base}-js`, `${base}-cli`, `${base}-tool`, `${base}-hq`, `${base}-lib`];
  return out.filter((s) => s.length <= 214).slice(0, 6);
}

async function checkOne(name: string): Promise<Check> {
  const invalidReason = validateName(name);
  if (invalidReason) return { name, valid: false, invalidReason, available: null };
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (res.status === 404) return { name, valid: true, available: true };
    if (res.ok) return { name, valid: true, available: false };
    return { name, valid: true, available: null, error: `Registry returned HTTP ${res.status}.` };
  } catch {
    return { name, valid: true, available: null, error: "Network error, could not reach the registry." };
  }
}

function CanINpmTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("can-i-npm", isPro);
  const seo = toolSeo;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Check[]>([]);
  const [suggested, setSuggested] = useState<Record<string, string[]>>({});

  const run = async () => {
    const names = [...new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];
    if (names.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setChecks([]);
    setSuggested({});
    try {
      const results = await Promise.all(names.map(checkOne));
      setChecks(results);
      const sug: Record<string, string[]> = {};
      for (const r of results) {
        if (r.valid && r.available === false) sug[r.name] = suggestionsFor(r.name);
      }
      setSuggested(sug);
      trial.recordUse();
    } catch {
      toast.error("Batch check failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const available = checks.filter((c) => c.available === true);
  const taken = checks.filter((c) => c.available === false);

  return (
    <ToolPageShell toolId="can-i-npm" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Can I NPM" left={trial.left} />

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">
            Package names to check (one per line, or comma separated)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"my-awesome-lib\nanother-package\n@myorg/toolkit"}
            spellCheck={false}
            autoComplete="off"
            rows={4}
            className="w-full rounded-xl border border-border bg-background p-4 font-mono text-sm outline-none focus:border-primary/50"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton busy={busy} disabled={!text.trim() || !trial.canUse} onClick={run}>
              <Search className="h-4 w-4" /> {busy ? "Checking…" : "Check availability"}
            </ActionButton>
            {checks.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-emerald-500">{available.length} available</span>
                {" · "}
                <span className="font-bold text-red-500">{taken.length} taken</span>
              </p>
            )}
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free batch checks left. One batch counts as one use.
            </p>
          )}
        </div>

        {checks.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="space-y-2">
              {checks.map((c) => (
                <div key={c.name} className="rounded-xl bg-muted/50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{c.name}</span>
                    {!c.valid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-500">
                        <XCircle className="h-3.5 w-3.5" /> Invalid: {c.invalidReason}
                      </span>
                    ) : c.available === true ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Available
                      </span>
                    ) : c.available === false ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-500">
                        <XCircle className="h-3.5 w-3.5" /> Taken
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">{c.error}</span>
                    )}
                  </div>
                  {c.available === false && suggested[c.name] && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5" /> Try:
                      </span>
                      {(suggested[c.name] ?? []).map((s) => (
                        <code key={s} className="rounded-lg bg-background px-2.5 py-1 font-mono text-xs text-primary">
                          {s}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className={cn("mt-4 text-xs text-muted-foreground")}>
              Availability is checked live against registry.npmjs.org. A name taken by an unpublished placeholder package cannot be registered.
            </p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
