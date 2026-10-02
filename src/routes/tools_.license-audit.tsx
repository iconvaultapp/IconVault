// /tools/license-audit - Upload or paste a package.json, resolve each
// dependency's real license from the npm registry, and flag conflicts or
// copyleft risk against your project's license.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileUp, Scale, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/license-audit")({
  head: () => {
    const seo = getToolSeoMeta("license-audit");
    const canonical = "https://iconvault.site/tools/license-audit";
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
  component: LicenseAuditTool,
});

const PROJECT_LICENSES = ["MIT", "ISC", "Apache-2.0", "BSD-3-Clause", "GPL-3.0-only", "Unlicense", "Proprietary"] as const;

const STRONG_COPYLEFT = new Set(["GPL-2.0-only", "GPL-2.0-or-later", "GPL-3.0-only", "GPL-3.0-or-later", "AGPL-1.0-only", "AGPL-3.0-only", "AGPL-3.0-or-later"]);
const WEAK_COPYLEFT = new Set(["LGPL-2.0-only", "LGPL-2.1-only", "LGPL-3.0-only", "LGPL-2.0-or-later", "LGPL-3.0-or-later", "MPL-2.0", "EPL-2.0", "CDDL-1.0"]);
const PERMISSIVE = new Set(["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "Unlicense", "CC0-1.0", "WTFPL", "Python-2.0"]);

type Verdict = "ok" | "review" | "conflict" | "unknown";

interface Row {
  name: string;
  range: string;
  license: string;
  verdict: Verdict;
  note: string;
}

function normalizeLicense(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object") {
    const t = (raw as { type?: string }).type;
    if (typeof t === "string") return t.trim();
  }
  return "UNKNOWN";
}

function verdictFor(depLicense: string, project: string): { verdict: Verdict; note: string } {
  const parts = depLicense.split(/\s+OR\s+/i).map((s) => s.trim());
  if (depLicense === "UNKNOWN" || !depLicense) {
    return { verdict: "unknown", note: "License could not be resolved; verify manually before shipping." };
  }
  if (parts.some((p) => STRONG_COPYLEFT.has(p))) {
    const projectPermissive = PERMISSIVE.has(project) || project === "Proprietary";
    if (projectPermissive) {
      return {
        verdict: "conflict",
        note: `Strong copyleft (${depLicense}) requires your ${project} project to adopt the same license.`,
      };
    }
    return { verdict: "review", note: `Strong copyleft (${depLicense}); make sure your distribution terms comply.` };
  }
  if (parts.some((p) => WEAK_COPYLEFT.has(p))) {
    return { verdict: "review", note: `Weak copyleft (${depLicense}); dynamic linking is usually fine, static linking needs review.` };
  }
  if (parts.some((p) => PERMISSIVE.has(p))) {
    return { verdict: "ok", note: `Permissive (${depLicense}); keep the copyright notice in your distribution.` };
  }
  if (/proprietary/i.test(depLicense)) {
    return { verdict: "review", note: "Proprietary terms; confirm your usage is covered by a license you hold." };
  }
  return { verdict: "unknown", note: `Unrecognized license text "${depLicense}"; verify manually.` };
}

async function resolveLicense(name: string): Promise<string> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
    if (!res.ok) return "UNKNOWN";
    const data = await res.json();
    return normalizeLicense(data.license);
  } catch {
    return "UNKNOWN";
  }
}

function LicenseAuditTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("license-audit", isPro);
  const seo = getToolSeo("license-audit");
  const [project, setProject] = useState<string>("MIT");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const auditText = async (raw: string, label: string) => {
    setError(null);
    setRows(null);
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      setError("That file is not valid JSON.");
      return;
    }
    const depObj = (pkg["dependencies"] ?? {}) as Record<string, string>;
    const devObj = (pkg["devDependencies"] ?? {}) as Record<string, string>;
    const names = [...new Set([...Object.keys(depObj), ...Object.keys(devObj)])];
    if (names.length === 0) {
      setError("No dependencies or devDependencies found in this package.json.");
      return;
    }
    const capped = names.slice(0, 40);
    setFileName(label);
    setBusy(true);
    const out: Row[] = [];
    for (let i = 0; i < capped.length; i++) {
      const n = capped[i];
      if (n === undefined) continue;
      setProgress(`Resolving ${i + 1} of ${capped.length}: ${n}`);
      const license = await resolveLicense(n);
      const { verdict, note } = verdictFor(license, project);
      out.push({ name: n, range: depObj[n] ?? devObj[n] ?? "", license, verdict, note });
    }
    if (names.length > 40) {
      toast.message(`First 40 of ${names.length} dependencies audited`);
    }
    setRows(out);
    setProgress("");
    setBusy(false);
    trial.recordUse();
  };

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => void auditText(String(reader.result ?? ""), f.name);
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(f);
  };

  const counts = rows
    ? {
        conflict: rows.filter((r) => r.verdict === "conflict").length,
        review: rows.filter((r) => r.verdict === "review").length,
        unknown: rows.filter((r) => r.verdict === "unknown").length,
        ok: rows.filter((r) => r.verdict === "ok").length,
      }
    : null;

  return (
    <ToolPageShell toolId="license-audit" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="License Audit" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">
            Your project's license
          </label>
          <div className="mb-5 flex flex-wrap gap-2">
            {PROJECT_LICENSES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setProject(l)}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
                  project === l ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {l}
              </button>
            ))}
          </div>

          <label className="mb-2 block text-[13px] font-medium text-foreground/80">
            Upload package.json
          </label>
          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition hover:border-primary/40"
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{fileName || "Drop package.json here or click to browse"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Dependencies are resolved live from the npm registry</p>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
            />
          </div>
          {busy && <p className="mt-3 font-mono text-xs text-muted-foreground">{progress}</p>}
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free audits left.
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {rows && counts && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-red-500">{counts.conflict} conflicts</span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1.5 text-amber-500">{counts.review} to review</span>
              <span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{counts.unknown} unknown</span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-emerald-500">{counts.ok} clear</span>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.name} className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  {r.verdict === "ok" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />}
                  {r.verdict === "review" && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
                  {r.verdict === "conflict" && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
                  {r.verdict === "unknown" && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold">
                      {r.name} <span className="text-muted-foreground">{r.range}</span>
                    </p>
                    <p className="mt-0.5 text-xs">
                      <span className="font-semibold">{r.license}</span>
                      <span className="text-muted-foreground"> · {r.note}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Heuristic guidance, not legal advice. Dual licenses (MIT OR Apache-2.0) are treated as their most permissive option.
            </p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
