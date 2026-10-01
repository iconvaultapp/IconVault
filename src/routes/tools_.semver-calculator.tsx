// /tools/semver-calculator - Hand-written semver engine (no semver npm
// package): parse versions, bump major/minor/patch/prerelease, test ranges
// (^, ~, >=, <=, >, <, =), and compare two versions. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUp, Copy, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/semver-calculator")({
  head: () => {
    const seo = getToolSeoMeta("semver-calculator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SemverCalculatorTool,
});

type PreId = string | number;

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: PreId[];
  build: string[];
}

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function parseSemver(input: string): SemVer | null {
  const v = input.trim().replace(/^v/i, "");
  const m = SEMVER_RE.exec(v);
  if (!m) return null;
  const pre: PreId[] = m[4]
    ? m[4].split(".").map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p))
    : [];
  return {
    major: parseInt(m[1]!, 10),
    minor: parseInt(m[2]!, 10),
    patch: parseInt(m[3]!, 10),
    prerelease: pre,
    build: m[5] ? m[5].split(".") : [],
  };
}

function stringify(v: SemVer): string {
  let s = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease.length) s += `-${v.prerelease.join(".")}`;
  if (v.build.length) s += `+${v.build.join(".")}`;
  return s;
}

function comparePre(a: PreId[], b: PreId[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1; // no prerelease > prerelease
  if (b.length === 0) return -1;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x === y) continue;
    const xn = typeof x === "number";
    const yn = typeof y === "number";
    if (xn && yn) return x < y ? -1 : 1;
    if (xn) return -1; // numeric < alphanumeric
    if (yn) return 1;
    return x < y ? -1 : 1;
  }
  return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
}

function compare(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return comparePre(a.prerelease, b.prerelease);
}

type BumpKind = "major" | "minor" | "patch" | "premajor" | "preminor" | "prepatch" | "prerelease";

function bump(v: SemVer, kind: BumpKind): SemVer {
  const next: SemVer = { major: v.major, minor: v.minor, patch: v.patch, prerelease: [], build: [] };
  switch (kind) {
    case "major": next.major += 1; next.minor = 0; next.patch = 0; break;
    case "minor": next.minor += 1; next.patch = 0; break;
    case "patch": next.patch += 1; break;
    case "premajor": next.major += 1; next.minor = 0; next.patch = 0; next.prerelease = [0]; break;
    case "preminor": next.minor += 1; next.patch = 0; next.prerelease = [0]; break;
    case "prepatch": next.patch += 1; next.prerelease = [0]; break;
    case "prerelease": {
      const pre = [...v.prerelease];
      const last = pre[pre.length - 1];
      if (typeof last === "number") pre[pre.length - 1] = last + 1;
      else if (pre.length === 0) pre.push(0);
      else pre.push(0);
      next.prerelease = pre;
      break;
    }
  }
  return next;
}

interface Comparator {
  op: ">=" | "<=" | ">" | "<" | "=";
  v: SemVer;
}

/** Parse a simple range: space-separated comparators, plus ^ and ~ sugar. */
function parseRange(range: string): Comparator[] | null {
  const tokens = range.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  const out: Comparator[] = [];
  for (const tok of tokens) {
    let t = tok;
    if (t === "*" || t.toLowerCase() === "x") return []; // matches everything
    if (t.startsWith("^") || t.startsWith("~")) {
      const base = parseSemver(t.slice(1));
      if (!base) return null;
      out.push({ op: ">=", v: base });
      const upper: SemVer =
        t.startsWith("^")
          ? base.major > 0
            ? { ...base, major: base.major + 1, minor: 0, patch: 0, prerelease: [], build: [] }
            : base.minor > 0
              ? { ...base, minor: base.minor + 1, patch: 0, prerelease: [], build: [] }
              : { ...base, patch: base.patch + 1, prerelease: [], build: [] }
          : { ...base, minor: base.minor + 1, patch: 0, prerelease: [], build: [] };
      out.push({ op: "<", v: upper });
      continue;
    }
    const m = /^(>=|<=|>|<|=)?(.+)$/.exec(t);
    if (!m) return null;
    const base = parseSemver(m[2]!);
    if (!base) return null;
    out.push({ op: (m[1] as Comparator["op"]) || "=", v: base });
  }
  return out;
}

function satisfies(version: SemVer, comps: Comparator[]): boolean {
  for (const c of comps) {
    const r = compare(version, c.v);
    const ok =
      c.op === ">=" ? r >= 0
      : c.op === "<=" ? r <= 0
      : c.op === ">" ? r > 0
      : c.op === "<" ? r < 0
      : r === 0;
    if (!ok) return false;
  }
  return true;
}

const BUMPS: { kind: BumpKind; label: string; hint: string }[] = [
  { kind: "major", label: "major", hint: "breaking changes" },
  { kind: "minor", label: "minor", hint: "new features" },
  { kind: "patch", label: "patch", hint: "bug fixes" },
  { kind: "premajor", label: "premajor", hint: "breaking beta" },
  { kind: "preminor", label: "preminor", hint: "feature beta" },
  { kind: "prepatch", label: "prepatch", hint: "fix beta" },
  { kind: "prerelease", label: "prerelease", hint: "bump beta number" },
];

function SemverCalculatorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("semver-calculator", isPro);
  const seo = getToolSeo("semver-calculator");

  const [version, setVersion] = useState("1.2.3");
  const [bumpResult, setBumpResult] = useState("");
  const [range, setRange] = useState("^1.2.0");
  const [candidates, setCandidates] = useState("1.0.0\n1.2.3\n1.9.0\n2.0.0");
  const [va, setVa] = useState("1.2.3");
  const [vb, setVb] = useState("1.3.0");

  const parsed = useMemo(() => parseSemver(version), [version]);
  const rangeComps = useMemo(() => parseRange(range), [range]);

  const rangeResults = useMemo(() => {
    if (!rangeComps) return null;
    return candidates
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((raw) => {
        const p = parseSemver(raw);
        return { raw, ok: p ? satisfies(p, rangeComps) : null as boolean | null };
      });
  }, [candidates, rangeComps]);

  const compareResult = useMemo(() => {
    const a = parseSemver(va);
    const b = parseSemver(vb);
    if (!a || !b) return null;
    const r = compare(a, b);
    return r === 0 ? "equal" : r < 0 ? "older" : "newer";
  }, [va, vb]);

  const copyText = async (text: string, label: string) => {
    if (!trial.canUse || !text) return;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(label);
    } catch {
      toast.error("Copy failed, select the text manually.");
    }
  };

  return (
    <ToolPageShell toolId="semver-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Semver Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Parse + bump */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
            <Tag className="h-4 w-4" /> Parse and bump
          </p>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Version</label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.2.3 or 2.0.0-beta.1"
              className={cn(
                "w-full rounded-xl border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary",
                parsed ? "border-border" : "border-red-400",
              )}
            />
            {!parsed && <p className="mt-1.5 text-xs font-semibold text-red-500">Not a valid semver version.</p>}
          </div>

          {parsed && (
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                ["major", parsed.major],
                ["minor", parsed.minor],
                ["patch", parsed.patch],
                ["pre", parsed.prerelease.join(".") || "-"],
                ["build", parsed.build.join(".") || "-"],
              ].map(([k, val]) => (
                <div key={k as string} className="rounded-xl bg-muted/50 px-2 py-2.5">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">{k}</p>
                  <p className="truncate font-mono text-sm font-bold">{val as string | number}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Bump it</p>
            <div className="flex flex-wrap gap-2">
              {BUMPS.map((b) => (
                <button
                  key={b.kind}
                  type="button"
                  disabled={!parsed}
                  title={b.hint}
                  onClick={() => {
                    const next = stringify(bump(parsed!, b.kind));
                    setBumpResult(next);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowUp className="h-3.5 w-3.5 text-primary" /> {b.label}
                </button>
              ))}
            </div>
          </div>

          {bumpResult && (
            <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
              <span className="font-mono text-lg font-extrabold text-primary">{bumpResult}</span>
              <button
                type="button"
                onClick={() => void copyText(bumpResult, "Bumped version copied")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
          )}
        </div>

        {/* Range test */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="text-[13px] font-semibold text-foreground/80">Range matching</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Range</label>
              <input
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="^1.2.0, ~2.1.0, >=1.0.0 <2.0.0"
                className={cn(
                  "w-full rounded-xl border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary",
                  rangeComps ? "border-border" : "border-red-400",
                )}
              />
              {rangeComps === null && <p className="mt-1.5 text-xs font-semibold text-red-500">Could not parse that range.</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Test versions <span className="text-muted-foreground">(one per line)</span></label>
              <textarea
                value={candidates}
                onChange={(e) => setCandidates(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {rangeResults && (
            <ul className="space-y-1.5">
              {rangeResults.map((r, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 font-mono text-sm">
                  <span className={r.ok === null ? "text-muted-foreground line-through" : ""}>{r.raw}</span>
                  {r.ok === null ? (
                    <span className="text-xs font-bold text-muted-foreground">invalid</span>
                  ) : r.ok ? (
                    <span className="text-xs font-bold text-emerald-600">matches</span>
                  ) : (
                    <span className="text-xs font-bold text-red-500">no match</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[13px] font-semibold text-foreground/80">Compare two versions</p>
            <div className="flex items-center gap-2">
              <input
                value={va}
                onChange={(e) => setVa(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
              <span className="font-bold text-muted-foreground">vs</span>
              <input
                value={vb}
                onChange={(e) => setVb(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {compareResult === null ? (
                "Enter two valid versions to compare."
              ) : compareResult === "equal" ? (
                <span><span className="font-mono font-bold text-foreground">{va.trim()}</span> and <span className="font-mono font-bold text-foreground">{vb.trim()}</span> are the same release.</span>
              ) : (
                <span><span className="font-mono font-bold text-foreground">{vb.trim()}</span> is <span className="font-bold text-primary">{compareResult}</span> than <span className="font-mono font-bold text-foreground">{va.trim()}</span>.</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
