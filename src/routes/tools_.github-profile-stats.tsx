// /tools/github-profile-stats - Profile dashboard: repos, stars, languages and
// a repo-creation timeline. Data comes from the public GitHub API.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, GitFork, Star, UserSearch, Users } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/github-profile-stats")({
  head: () => {
    const seo = getToolSeoMeta("github-profile-stats");
    const canonical = "https://iconvault.site/tools/github-profile-stats";
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
  component: GithubProfileStatsTool,
});

interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
}

interface GhRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  pushed_at: string;
  html_url: string;
}

interface Profile {
  user: GhUser;
  repos: GhRepo[];
  stars: number;
  languages: { lang: string; count: number }[];
  timeline: { year: number; count: number }[];
}

const LANG_COLORS = ["#f43f5e", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#06b6d4", "#f97316", "#84cc16"];

async function loadProfile(username: string): Promise<Profile> {
  const u = username.trim();
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (userRes.status === 404) throw new Error(`GitHub user "${u}" not found.`);
  if (userRes.status === 403) throw new Error("GitHub API rate limit hit (60 requests/hour anonymous). Wait a bit and retry.");
  if (!userRes.ok) throw new Error(`GitHub returned HTTP ${userRes.status}.`);
  const user = (await userRes.json()) as GhUser;

  const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}/repos?per_page=100&sort=pushed`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  const repos = (reposRes.ok ? ((await reposRes.json()) as GhRepo[]) : []) as GhRepo[];
  const stars = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);

  const langMap = new Map<string, number>();
  for (const r of repos) {
    if (r.language) langMap.set(r.language, (langMap.get(r.language) ?? 0) + 1);
  }
  const languages = [...langMap.entries()]
    .map(([lang, count]) => ({ lang, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const yearMap = new Map<number, number>();
  for (const r of repos) {
    const y = new Date(r.created_at).getFullYear();
    if (Number.isFinite(y)) yearMap.set(y, (yearMap.get(y) ?? 0) + 1);
  }
  const timeline = [...yearMap.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  return { user, repos, stars, languages, timeline };
}

function GithubProfileStatsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("github-profile-stats", isPro);
  const seo = getToolSeo("github-profile-stats");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timelineRef = useRef<HTMLCanvasElement>(null);

  const run = async () => {
    if (!input.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setProfile(null);
    try {
      setProfile(await loadProfile(input));
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lookup failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const canvas = timelineRef.current;
    if (!canvas || !profile || profile.timeline.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 680;
    const H = 200;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const tl = profile.timeline;
    const max = Math.max(...tl.map((t) => t.count), 1);
    const n = tl.length;
    const slot = W / n;
    const barW = Math.min(36, slot * 0.55);
    const css = getComputedStyle(document.documentElement);
    const muted = css.getPropertyValue("--muted-foreground").trim() || "#888";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    tl.forEach((t, i) => {
      const h = (t.count / max) * (H - 56);
      const x = slot * i + (slot - barW) / 2;
      const y = H - 28 - h;
      const grad = ctx.createLinearGradient(0, y, 0, H - 28);
      grad.addColorStop(0, "#a855f7");
      grad.addColorStop(1, "#3b82f6");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      if (h > 18) ctx.fillText(String(t.count), x + barW / 2, y + 14);
      ctx.fillStyle = muted;
      ctx.fillText(String(t.year), x + barW / 2, H - 12);
    });
    ctx.textAlign = "left";
  }, [profile]);

  const recent = profile ? [...profile.repos].sort((a, b) => (a.pushed_at < b.pushed_at ? 1 : -1)).slice(0, 8) : [];

  return (
    <ToolPageShell toolId="github-profile-stats" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GitHub Profile Stats" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">GitHub username</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void run(); }}
              placeholder="e.g. torvalds"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
            />
            <ActionButton busy={busy} disabled={!input.trim() || !trial.canUse} onClick={run}>
              <UserSearch className="h-4 w-4" /> {busy ? "Loading…" : "Analyze profile"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left. Uses the public GitHub API (60 requests/hour anonymous).
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {profile && (
          <>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-4">
                <img src={profile.user.avatar_url} alt={profile.user.login} className="h-16 w-16 rounded-2xl" />
                <div className="min-w-0">
                  <p className="text-lg font-bold">
                    {profile.user.name || profile.user.login}{" "}
                    <a href={profile.user.html_url} target="_blank" rel="noreferrer" className="font-mono text-sm font-semibold text-primary hover:underline">
                      @{profile.user.login} <ArrowUpRight className="inline h-3.5 w-3.5" />
                    </a>
                  </p>
                  {profile.user.bio && <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.user.bio}</p>}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Public repos", value: profile.user.public_repos.toLocaleString(), icon: GitFork },
                  { label: "Total stars", value: profile.stars.toLocaleString(), icon: Star },
                  { label: "Followers", value: profile.user.followers.toLocaleString(), icon: Users },
                  { label: "Following", value: profile.user.following.toLocaleString(), icon: Users },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-muted/50 px-4 py-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <s.icon className="h-3.5 w-3.5" /> {s.label}
                    </p>
                    <p className="mt-1 text-2xl font-black">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-4 text-sm font-bold">Top languages</p>
                {profile.languages.length === 0 && (
                  <p className="text-xs text-muted-foreground">No language data in the latest 100 repos.</p>
                )}
                <div className="space-y-2.5">
                  {profile.languages.map((l, i) => {
                    const total = profile.languages.reduce((a, x) => a + x.count, 0);
                    return (
                      <div key={l.lang}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold">{l.lang}</span>
                          <span className="text-muted-foreground">{l.count} repos</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(l.count / Math.max(total, 1)) * 100}%`, background: LANG_COLORS[i % LANG_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-4 text-sm font-bold">Repos created per year</p>
                {profile.timeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No timeline data.</p>
                ) : (
                  <canvas ref={timelineRef} className="w-full rounded-xl bg-muted/30" />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-sm font-bold">Recently pushed repos</p>
              <div className="space-y-2">
                {recent.map((r) => (
                  <a
                    key={r.name}
                    href={r.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3 transition hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-primary">{r.name}</p>
                      {r.description && <p className="truncate text-xs text-muted-foreground">{r.description}</p>}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <Star className="h-3.5 w-3.5" /> {r.stargazers_count.toLocaleString()}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ToolPageShell>
  );
}
