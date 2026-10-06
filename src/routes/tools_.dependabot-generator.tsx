// /tools/dependabot-generator - Build a dependabot.yml: pick ecosystems from
// the 14 supported ones, set directories, schedule, target branch, reviewers,
// assignees and labels. Live YAML with copy + download. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/dependabot-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/dependabot-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/dependabot-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/dependabot-generator";
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
  component: DependabotGeneratorTool,
});

const ECOSYSTEMS = [
  { id: "npm", label: "npm", dir: "/" },
  { id: "pip", label: "pip", dir: "/" },
  { id: "bundler", label: "bundler", dir: "/" },
  { id: "cargo", label: "cargo", dir: "/" },
  { id: "composer", label: "composer", dir: "/" },
  { id: "docker", label: "docker", dir: "/" },
  { id: "github-actions", label: "github-actions", dir: "/" },
  { id: "gomod", label: "gomod", dir: "/" },
  { id: "gradle", label: "gradle", dir: "/" },
  { id: "maven", label: "maven", dir: "/" },
  { id: "nuget", label: "nuget", dir: "/" },
  { id: "terraform", label: "terraform", dir: "/" },
  { id: "hex", label: "hex", dir: "/" },
  { id: "elm", label: "elm", dir: "/" },
];

const INTERVALS = ["daily", "weekly", "monthly"] as const;
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function csvToList(v: string): string[] {
  return v.split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean);
}

function DependabotGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("dependabot-generator", isPro);
  const seo = toolSeo;

  const [selected, setSelected] = useState<string[]>(["npm", "github-actions"]);
  const [dirs, setDirs] = useState<Record<string, string>>({});
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>("weekly");
  const [day, setDay] = useState<(typeof DAYS)[number]>("monday");
  const [time, setTime] = useState("09:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [targetBranch, setTargetBranch] = useState("main");
  const [reviewers, setReviewers] = useState("");
  const [assignees, setAssignees] = useState("");
  const [labels, setLabels] = useState("dependencies");
  const [prLimit, setPrLimit] = useState("5");

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const dirFor = (id: string) => dirs[id] ?? ECOSYSTEMS.find((e) => e.id === id)!.dir;

  const yaml = useMemo(() => {
    const lines = ["# Generated with IconVault Dependabot Config", "version: 2", "updates:"];
    const ordered = ECOSYSTEMS.filter((e) => selected.includes(e.id));
    for (const e of ordered) {
      lines.push(`  - package-ecosystem: ${quote(e.id)}`);
      const d = dirFor(e.id).trim() || "/";
      lines.push(`    directory: ${quote(d.startsWith("/") ? d : `/${d}`)}`);
      lines.push(`    schedule:`);
      lines.push(`      interval: ${quote(interval)}`);
      if (interval === "weekly") lines.push(`      day: ${quote(day)}`);
      lines.push(`      time: ${quote(time || "09:00")}`);
      if (timezone.trim()) lines.push(`      timezone: ${quote(timezone.trim())}`);
      if (targetBranch.trim()) lines.push(`    target-branch: ${quote(targetBranch.trim())}`);
      const rev = csvToList(reviewers);
      if (rev.length) {
        lines.push(`    reviewers:`);
        for (const r of rev) lines.push(`      - ${quote(r)}`);
      }
      const asg = csvToList(assignees);
      if (asg.length) {
        lines.push(`    assignees:`);
        for (const a of asg) lines.push(`      - ${quote(a)}`);
      }
      const lab = csvToList(labels);
      if (lab.length) {
        lines.push(`    labels:`);
        for (const l of lab) lines.push(`      - ${quote(l)}`);
      }
      const limit = parseInt(prLimit, 10);
      if (Number.isFinite(limit) && limit > 0) lines.push(`    open-pull-requests-limit: ${limit}`);
    }
    return lines.join("\n") + "\n";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, dirs, interval, day, time, timezone, targetBranch, reviewers, assignees, labels, prLimit]);

  const copyYaml = async () => {
    if (!trial.canUse || !selected.length) return;
    try {
      await navigator.clipboard.writeText(yaml);
      trial.recordUse();
      toast.success("dependabot.yml copied");
    } catch {
      toast.error("Copy failed, select the text manually.");
    }
  };

  const download = () => {
    if (!trial.canUse || !selected.length) return;
    downloadBlob(new Blob([yaml], { type: "text/yaml" }), "dependabot.yml");
    trial.recordUse();
    toast.success("dependabot.yml downloaded");
  };

  return (
    <ToolPageShell toolId="dependabot-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Dependabot Config" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
              <Bot className="h-4 w-4" /> Ecosystems ({selected.length} selected)
            </p>
            <div className="flex flex-wrap gap-2">
              {ECOSYSTEMS.map((e) => {
                const on = selected.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition",
                      on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selected.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Directory per ecosystem</p>
              <div className="max-h-40 space-y-1.5 overflow-auto">
                {ECOSYSTEMS.filter((e) => selected.includes(e.id)).map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="w-32 shrink-0 truncate font-mono text-xs font-bold text-muted-foreground">{e.label}</span>
                    <input
                      value={dirFor(e.id)}
                      onChange={(ev) => setDirs((d) => ({ ...d, [e.id]: ev.target.value }))}
                      placeholder="/"
                      spellCheck={false}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value as (typeof INTERVALS)[number])}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            {interval === "weekly" && (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Day</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value as (typeof DAYS)[number])}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm capitalize outline-none focus:border-primary"
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Timezone</label>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Kolkata"
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Target branch</label>
              <input
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="main"
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">PR limit</label>
              <input
                type="number"
                min={1}
                max={30}
                value={prLimit}
                onChange={(e) => setPrLimit(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Reviewers <span className="text-muted-foreground">(comma separated)</span></label>
            <input
              value={reviewers}
              onChange={(e) => setReviewers(e.target.value)}
              placeholder="sameer, teammate"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Assignees <span className="text-muted-foreground">(comma separated)</span></label>
            <input
              value={assignees}
              onChange={(e) => setAssignees(e.target.value)}
              placeholder="sameer"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Labels <span className="text-muted-foreground">(comma separated)</span></label>
            <input
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="dependencies"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <p className="text-sm font-bold">dependabot.yml <span className="font-normal text-muted-foreground">- live</span></p>
          </div>
          {selected.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <Bot className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">Pick at least one ecosystem</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Select the package ecosystems you want Dependabot to watch, then tune the schedule.
              </p>
            </div>
          ) : (
            <pre className="max-h-[560px] overflow-auto p-5 font-mono text-[13px] leading-relaxed">{yaml}</pre>
          )}
          <div className="flex flex-wrap gap-2 border-t border-border p-5">
            <ActionButton disabled={!trial.canUse || !selected.length} onClick={download}>
              <Download className="h-4 w-4" /> Download dependabot.yml
            </ActionButton>
            <button
              type="button"
              disabled={!trial.canUse || !selected.length}
              onClick={copyYaml}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          {!isPro && (
            <p className="px-5 pb-4 text-xs text-muted-foreground">
              Save it at <code className="rounded bg-muted px-1 font-mono">.github/dependabot.yml</code> in your repo. Everything stays in your browser.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
