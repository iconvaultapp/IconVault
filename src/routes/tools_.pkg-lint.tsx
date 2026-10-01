// /tools/pkg-lint - Paste a package.json and get 25+ quality checks with an
// A-F grade. Everything is parsed and checked locally in your browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileCheck2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/pkg-lint")({
  head: () => {
    const seo = getToolSeoMeta("pkg-lint");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PkgLintTool,
});

type Verdict = "pass" | "warn" | "fail";
interface Check {
  label: string;
  detail: string;
  verdict: Verdict;
}

const KNOWN_SPDX = new Set([
  "MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "GPL-2.0-only", "GPL-2.0-or-later",
  "GPL-3.0-only", "GPL-3.0-or-later", "LGPL-2.1-only", "LGPL-3.0-only", "AGPL-3.0-only",
  "AGPL-3.0-or-later", "MPL-2.0", "CDDL-1.0", "EPL-2.0", "Unlicense", "CC0-1.0", "0BSD", "WTFPL",
]);

const SAMPLE = `{
  "name": "my-awesome-lib",
  "version": "1.0.0",
  "description": "Does awesome things",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
`;

function lint(pkg: Record<string, unknown>): Check[] {
  const c = (label: string, detail: string, verdict: Verdict): Check => ({ label, detail, verdict });
  const out: Check[] = [];
  const str = (k: string) => (typeof pkg[k] === "string" ? (pkg[k] as string) : "");
  const has = (k: string) => pkg[k] !== undefined && pkg[k] !== null && pkg[k] !== "";

  // name (3)
  if (!has("name")) out.push(c("name present", "Every package.json needs a name.", "fail"));
  else {
    const n = str("name");
    const valid = n.length <= 214 && !/^[._]/.test(n) && !/\s/.test(n) && /^[a-z0-9._~@/-]+$/i.test(n) && n === n.toLowerCase();
    out.push(c("name present", `name: "${n}".`, "pass"));
    out.push(c("name valid for npm", valid ? "Follows npm naming rules." : "Breaks npm naming rules (case, spaces, leading . or _).", valid ? "pass" : "fail"));
    out.push(c("name length", `${n.length} of 214 characters max.`, n.length <= 214 ? "pass" : "fail"));
  }

  // version (3)
  const v = str("version");
  if (!v) out.push(c("version present", "Missing version. Publishing requires one.", "fail"));
  else {
    out.push(c("version present", `version: "${v}".`, "pass"));
    const semver = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(v);
    out.push(c("version is semver", semver ? "Valid semantic version." : "Not valid semver; tools like npm version may break.", semver ? "pass" : "fail"));
    out.push(c("version past 0.0.0", v === "0.0.0" ? "Still 0.0.0, bump it before publishing." : "Not a placeholder version.", v === "0.0.0" ? "warn" : "pass"));
  }

  // metadata (6)
  out.push(c("description", has("description") && str("description").length > 10 ? "Clear description present." : "Missing or too short; npm search ranks on it.", has("description") && str("description").length > 10 ? "pass" : "warn"));
  const kw = pkg["keywords"];
  out.push(c("keywords", Array.isArray(kw) && kw.length > 0 ? `${kw.length} keywords.` : "No keywords; discoverability suffers.", Array.isArray(kw) && kw.length > 0 ? "pass" : "warn"));
  out.push(c("author", has("author") ? "Author declared." : "No author field.", has("author") ? "pass" : "warn"));
  out.push(c("repository", has("repository") ? "Repository link declared." : "No repository field; npm cannot link your code.", has("repository") ? "pass" : "warn"));
  out.push(c("bugs", has("bugs") ? "Bugs/issues URL declared." : "No bugs field.", has("bugs") ? "pass" : "warn"));
  out.push(c("homepage", has("homepage") ? "Homepage declared." : "No homepage field.", has("homepage") ? "pass" : "warn"));

  // license (2)
  const lic = str("license");
  if (!lic) out.push(c("license declared", "No license field. npm defaults to proprietary.", "fail"));
  else {
    out.push(c("license declared", `License: ${lic}.`, "pass"));
    out.push(c("license is known SPDX", KNOWN_SPDX.has(lic) ? "Recognized SPDX identifier." : `"${lic}" is not a standard SPDX id; use one for tooling support.`, KNOWN_SPDX.has(lic) ? "pass" : "warn"));
  }

  // entry points (3)
  const hasMain = has("main");
  const hasExports = typeof pkg["exports"] === "object" && pkg["exports"] !== null;
  out.push(c("entry point", hasMain || hasExports ? "main or exports declared." : "No main or exports; consumers cannot import it.", hasMain || hasExports ? "pass" : "fail"));
  out.push(c("types field", has("types") || has("typings") ? "Type declarations declared." : "No types/typings field; TS users lose autocomplete.", has("types") || has("typings") ? "pass" : "warn"));
  out.push(c("sideEffects flag", has("sideEffects") ? "sideEffects declared for tree-shaking." : "No sideEffects field; bundlers must assume the worst.", has("sideEffects") ? "pass" : "warn"));

  // scripts (2)
  const scripts = (pkg["scripts"] ?? {}) as Record<string, string>;
  const test = scripts["test"] ?? "";
  out.push(c("test script", test && !/echo.*exit 1/.test(test) ? "Real test script found." : "Default placeholder test script still in place.", test && !/echo.*exit 1/.test(test) ? "pass" : "warn"));
  out.push(c("build script", scripts["build"] ? "Build script declared." : "No build script.", scripts["build"] ? "pass" : "warn"));

  // engines + files (2)
  out.push(c("engines.node", has("engines") ? "Engines field pins supported Node versions." : "No engines field; version drift surprises await.", has("engines") ? "pass" : "warn"));
  out.push(c("files allowlist", Array.isArray(pkg["files"]) && pkg["files"].length > 0 ? `${(pkg["files"] as unknown[]).length} entries in files allowlist.` : "No files field; you may publish tests and configs by accident.", Array.isArray(pkg["files"]) && (pkg["files"] as unknown[]).length > 0 ? "pass" : "warn"));

  // dependencies (4)
  const deps = (pkg["dependencies"] ?? {}) as Record<string, string>;
  const depEntries = Object.entries(deps);
  const unversioned = depEntries.filter(([, r]) => r === "latest" || r === "*");
  out.push(c("pinned ranges", unversioned.length === 0 ? "No unpinned latest/* ranges." : `${unversioned.join(", ")} use latest/*.`, unversioned.length === 0 ? "pass" : "warn"));
  out.push(c("devDependencies present", typeof pkg["devDependencies"] === "object" && pkg["devDependencies"] !== null ? "devDependencies declared." : "No devDependencies.", typeof pkg["devDependencies"] === "object" && pkg["devDependencies"] !== null ? "pass" : "warn"));
  out.push(c("dependency count", `${depEntries.length} runtime dependencies.`, depEntries.length <= 20 ? "pass" : depEntries.length <= 50 ? "warn" : "fail"));
  out.push(c("packageManager", has("packageManager") ? "packageManager field pins the tooling." : "No packageManager field.", has("packageManager") ? "pass" : "warn"));

  return out;
}

function gradeFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  B: "bg-lime-500/15 text-lime-600 border-lime-500/30",
  C: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  D: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  F: "bg-red-500/15 text-red-500 border-red-500/30",
};

interface VerdictIconProps { v: Verdict }

function VerdictIcon({ v }: VerdictIconProps) {
  if (v === "pass") return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />;
  if (v === "warn") return <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />;
  return <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />;
}

function PkgLintTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pkg-lint", isPro);
  const seo = getToolSeo("pkg-lint");
  const [text, setText] = useState(SAMPLE);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (!trial.canUse) return;
    setError(null);
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Top level must be a JSON object.");
      }
      const list = lint(parsed);
      const fails = list.filter((x) => x.verdict === "fail").length;
      const warns = list.filter((x) => x.verdict === "warn").length;
      setScore(Math.max(0, Math.round(100 - fails * 4 - warns * 1.5)));
      setChecks(list);
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON.";
      setError(msg);
      setChecks(null);
      toast.error(msg);
    }
  };

  const grade = gradeFor(score);
  const fails = checks?.filter((x) => x.verdict === "fail").length ?? 0;
  const warns = checks?.filter((x) => x.verdict === "warn").length ?? 0;

  return (
    <ToolPageShell toolId="pkg-lint" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Package.json Linter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">Paste package.json</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            rows={20}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed outline-none focus:border-primary/50"
          />
          <div className="mt-4">
            <ActionButton disabled={!text.trim() || !trial.canUse} onClick={run}>
              <FileCheck2 className="h-4 w-4" /> Lint package.json
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free lints left. Nothing is uploaded; parsing is local.
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!checks ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
              <FileCheck2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Results appear here</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                25+ checks across naming, versioning, metadata, licensing, entry points, scripts and dependencies.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-3xl font-black", GRADE_STYLES[grade])}>
                  {grade}
                </div>
                <div>
                  <p className="text-2xl font-black">{score}/100</p>
                  <p className="text-xs text-muted-foreground">
                    {checks.length} checks · {fails} failed · {warns} warnings
                  </p>
                </div>
              </div>
              <div className="mt-4 max-h-[480px] space-y-2 overflow-y-auto pr-1">
                {checks.map((ch) => (
                  <div key={ch.label} className="flex items-start gap-3 rounded-xl bg-muted/50 px-3.5 py-2.5">
                    <VerdictIcon v={ch.verdict} />
                    <div>
                      <p className="text-sm font-semibold">{ch.label}</p>
                      <p className="text-xs text-muted-foreground">{ch.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
