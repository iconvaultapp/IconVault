// /tools/github-profile-generator - Build a beautiful GitHub profile README
// with live stats cards, top languages, streak and trophy badges, 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/github-profile-generator")({
  head: () => {
    const seo = getToolSeoMeta("github-profile-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: GithubProfileTool,
});

const THEMES = [
  "default", "github_dark", "github", "dracula", "tokyonight", "radical",
  "gruvbox", "nord", "dark", "merko", "cobalt",
];

const SAMPLE_USERS = ["torvalds", "sindresorhus", "yyx990803", "gaearon"];

function buildMarkdown(opts: {
  username: string; theme: string; stats: boolean; langs: boolean; streak: boolean; trophies: boolean;
}): string {
  const { username, theme, stats, langs, streak, trophies } = opts;
  const u = encodeURIComponent(username.trim());
  const t = encodeURIComponent(theme);
  const lines: string[] = [`# Hi there, I'm @${username.trim()} 👋`, ""];
  if (stats) lines.push(`![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${u}&theme=${t}&show_icons=true)`, "");
  if (langs) lines.push(`![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=${u}&theme=${t}&layout=compact)`, "");
  if (streak) lines.push(`![GitHub Streak](https://streak-stats.demolab.com?user=${u}&theme=${t})`, "");
  if (trophies) lines.push(`![GitHub Trophies](https://github-profile-trophy.vercel.app/?username=${u}&theme=${t})`, "");
  return lines.join("\n").trimEnd() + "\n";
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium transition hover:border-primary/40"
    >
      <span>{label}</span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary/60";

function GithubProfileTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("github-profile-generator", isPro);
  const seo = getToolSeo("github-profile-generator");

  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState("dracula");
  const [showStats, setShowStats] = useState(true);
  const [showLangs, setShowLangs] = useState(true);
  const [showStreak, setShowStreak] = useState(true);
  const [showTrophies, setShowTrophies] = useState(false);

  const user = username.trim();
  const markdown = useMemo(
    () => (user ? buildMarkdown({ username: user, theme, stats: showStats, langs: showLangs, streak: showStreak, trophies: showTrophies }) : ""),
    [user, theme, showStats, showLangs, showStreak, showTrophies],
  );

  const imgUrls = useMemo(() => {
    if (!user) return [] as string[];
    const u = encodeURIComponent(user);
    const t = encodeURIComponent(theme);
    const out: string[] = [];
    if (showStats) out.push(`https://github-readme-stats.vercel.app/api?username=${u}&theme=${t}&show_icons=true`);
    if (showLangs) out.push(`https://github-readme-stats.vercel.app/api/top-langs/?username=${u}&theme=${t}&layout=compact`);
    if (showStreak) out.push(`https://streak-stats.demolab.com?user=${u}&theme=${t}`);
    if (showTrophies) out.push(`https://github-profile-trophy.vercel.app/?username=${u}&theme=${t}`);
    return out;
  }, [user, theme, showStats, showLangs, showStreak, showTrophies]);

  const trySample = () => setUsername(SAMPLE_USERS[Math.floor(Math.random() * SAMPLE_USERS.length)]!);

  const copy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      trial.recordUse();
      toast.success("README markdown copied");
    } catch {
      toast.error("Copy failed. Your browser blocked clipboard access.");
    }
  };

  const download = () => {
    if (!markdown || !trial.canUse) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown" }), "README.md");
    trial.recordUse();
    toast.success("README.md downloaded");
  };

  return (
    <ToolPageShell toolId="github-profile-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GitHub Profile Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">GitHub username</label>
            <div className="flex gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                placeholder="e.g. torvalds"
                className={inputCls}
              />
              <button
                type="button"
                onClick={trySample}
                title="Try a sample username"
                className="shrink-0 rounded-xl border border-border px-3 transition hover:border-primary/40"
              >
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Card theme</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className={inputCls}>
              {THEMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-foreground/80">Cards to include</p>
            <Toggle label="GitHub stats card" checked={showStats} onChange={setShowStats} />
            <Toggle label="Top languages card" checked={showLangs} onChange={setShowLangs} />
            <Toggle label="Contribution streak" checked={showStreak} onChange={setShowStreak} />
            <Toggle label="Profile trophies" checked={showTrophies} onChange={setShowTrophies} />
          </div>

          <div className="flex gap-2">
            <ActionButton disabled={!markdown} onClick={copy}>
              <Copy className="h-4 w-4" /> Copy markdown
            </ActionButton>
            <ActionButton disabled={!markdown || !trial.canUse} onClick={download}>
              <Download className="h-4 w-4" /> Download
            </ActionButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste into a repo named exactly like your username and GitHub shows it on your profile.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!user ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="font-semibold">Enter your GitHub username</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The preview renders the real badge images for that username, so what you see is what your profile shows.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Hi there, I'm @{user}</h3>
              {imgUrls.map((src) => (
                <img key={src} src={src} alt="GitHub profile card" loading="lazy" className="max-w-full" />
              ))}
              <details className="rounded-xl bg-muted/40 p-4">
                <summary className="cursor-pointer text-sm font-semibold">View generated markdown</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">{markdown}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
