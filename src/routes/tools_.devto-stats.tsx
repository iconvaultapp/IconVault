// /tools/devto-stats - Article performance dashboard for dev.to authors:
// views, reactions, tags and posting patterns. Uses the public dev.to API.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, BarChart3, Eye, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/devto-stats")({
  head: () => {
    const seo = getToolSeoMeta("devto-stats");
    const canonical = "https://iconvault.site/tools/devto-stats";
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
  component: DevtoStatsTool,
});

interface Article {
  id: number;
  title: string;
  url: string;
  published_at: string;
  page_views_count: number;
  public_reactions_count: number;
  comments_count: number;
  tag_list: string[];
  reading_time_minutes: number;
}

interface Dashboard {
  articles: Article[];
  views: number;
  reactions: number;
  comments: number;
  tags: { tag: string; count: number; views: number }[];
  months: { label: string; count: number }[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

async function loadDashboard(username: string): Promise<Dashboard> {
  const u = username.trim().toLowerCase();
  const articles: Article[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://dev.to/api/articles?username=${encodeURIComponent(u)}&per_page=100&page=${page}`);
    if (res.status === 404) throw new Error(`dev.to user "${u}" not found or has no public articles.`);
    if (!res.ok) throw new Error(`dev.to returned HTTP ${res.status}. Try again shortly.`);
    const batch = (await res.json()) as Article[];
    if (batch.length === 0) break;
    articles.push(...batch);
    if (batch.length < 100) break;
  }
  if (articles.length === 0) throw new Error(`dev.to user "${u}" not found or has no public articles.`);

  const views = articles.reduce((a, x) => a + (x.page_views_count || 0), 0);
  const reactions = articles.reduce((a, x) => a + (x.public_reactions_count || 0), 0);
  const comments = articles.reduce((a, x) => a + (x.comments_count || 0), 0);

  const tagMap = new Map<string, { count: number; views: number }>();
  for (const a of articles) {
    for (const t of a.tag_list ?? []) {
      const e = tagMap.get(t) ?? { count: 0, views: 0 };
      e.count += 1;
      e.views += a.page_views_count || 0;
      tagMap.set(t, e);
    }
  }
  const tags = [...tagMap.entries()]
    .map(([tag, s]) => ({ tag, count: s.count, views: s.views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const monthMap = new Map<string, number>();
  for (const a of articles) {
    const d = new Date(a.published_at);
    if (!Number.isFinite(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const sortedKeys = [...monthMap.keys()].sort().slice(-12);
  const months = sortedKeys.map((k) => {
    const [y = 0, m = 0] = k.split("-").map(Number);
    return { label: `${MONTHS[m]} ${String(y).slice(2)}`, count: monthMap.get(k) ?? 0 };
  });

  return { articles, views, reactions, comments, tags, months };
}

function DevtoStatsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("devto-stats", isPro);
  const seo = getToolSeo("devto-stats");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);

  const run = async () => {
    if (!input.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setDash(null);
    try {
      const d = await loadDashboard(input);
      setDash(d);
      setUsername(input.trim().toLowerCase());
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
    const canvas = chartRef.current;
    if (!canvas || !dash || dash.months.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 680;
    const H = 190;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const data = dash.months;
    const max = Math.max(...data.map((x) => x.count), 1);
    const n = data.length;
    const slot = W / n;
    const barW = Math.min(34, slot * 0.55);
    const css = getComputedStyle(document.documentElement);
    const muted = css.getPropertyValue("--muted-foreground").trim() || "#888";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    data.forEach((m, i) => {
      const h = (m.count / max) * (H - 52);
      const x = slot * i + (slot - barW) / 2;
      const y = H - 26 - h;
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.roundRect(x, y, barW, Math.max(h, 2), 4);
      ctx.fill();
      ctx.fillStyle = muted;
      ctx.fillText(m.label, x + barW / 2, H - 10);
    });
    ctx.textAlign = "left";
  }, [dash]);

  const topArticles = dash ? [...dash.articles].sort((a, b) => (b.page_views_count || 0) - (a.page_views_count || 0)).slice(0, 5) : [];

  return (
    <ToolPageShell toolId="devto-stats" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Dev.to Stats" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">dev.to username</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void run(); }}
              placeholder="e.g. thepracticaldev"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
            />
            <ActionButton busy={busy} disabled={!input.trim() || !trial.canUse} onClick={run}>
              <BarChart3 className="h-4 w-4" /> {busy ? "Loading…" : "Analyze articles"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left. Uses the public dev.to API.
            </p>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        </div>

        {dash && (
          <>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="font-mono text-sm font-bold">@{username}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Articles", value: dash.articles.length, icon: BarChart3 },
                  { label: "Total views", value: fmt(dash.views), icon: Eye },
                  { label: "Reactions", value: fmt(dash.reactions), icon: Heart },
                  { label: "Comments", value: fmt(dash.comments), icon: MessageCircle },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-muted/50 px-4 py-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <s.icon className="h-3.5 w-3.5" /> {s.label}
                    </p>
                    <p className="mt-1 text-2xl font-black">{s.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Avg {dash.articles.length > 0 ? fmt(dash.views / dash.articles.length) : "0"} views per article ·{" "}
                {dash.articles.length > 0 ? (dash.reactions / dash.articles.length).toFixed(1) : "0"} reactions per article
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-4 text-sm font-bold">Top tags by views</p>
                <div className="space-y-2.5">
                  {dash.tags.length === 0 && <p className="text-xs text-muted-foreground">No tags found.</p>}
                  {dash.tags.map((t, i) => (
                    <div key={t.tag}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold">#{t.tag}</span>
                        <span className="text-muted-foreground">{t.count} posts · {fmt(t.views)} views</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${(t.views / Math.max(dash.tags[0]?.views ?? 1, 1)) * 100}%`, opacity: 1 - i * 0.07 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-4 text-sm font-bold">Posting pattern (last 12 active months)</p>
                {dash.months.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No dated articles.</p>
                ) : (
                  <canvas ref={chartRef} className="w-full rounded-xl bg-muted/30" />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-sm font-bold">Top articles by views</p>
              <div className="space-y-2">
                {topArticles.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3 transition hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        {" · "}{a.reading_time_minutes} min read · {a.comments_count} comments
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary">
                      <Eye className="h-3.5 w-3.5" /> {fmt(a.page_views_count)}
                      <ArrowUpRight className="h-3.5 w-3.5" />
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
