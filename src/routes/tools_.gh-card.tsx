// /tools/gh-card - Shareable GitHub repo cards: fetch real repo data from
// api.github.com, pick one of 6 themes, export SVG or PNG. Graceful errors
// on 404 / rate limits.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileImage, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/gh-card")({
  head: () => {
    const seo = getToolSeoMeta("gh-card");
    const canonical = "https://iconvault.site/tools/gh-card";
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
  component: GhCardTool,
});

interface RepoData {
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  updated: string;
  avatar: string;
}

interface Theme {
  name: string;
  bg: string;
  bg2: string;
  text: string;
  sub: string;
  accent: string;
  border: string;
}

const THEMES: Theme[] = [
  { name: "Midnight", bg: "#0d1117", bg2: "#161b22", text: "#f0f6fc", sub: "#8b949e", accent: "#58a6ff", border: "#30363d" },
  { name: "Light", bg: "#ffffff", bg2: "#f6f8fa", text: "#1f2328", sub: "#59636e", accent: "#0969da", border: "#d1d9e0" },
  { name: "Ocean", bg: "#0a192f", bg2: "#112240", text: "#e6f1ff", sub: "#8892b0", accent: "#64ffda", border: "#233554" },
  { name: "Forest", bg: "#0d1b12", bg2: "#14261b", text: "#e8f5e9", sub: "#a5b8a8", accent: "#7bc96f", border: "#2a4030" },
  { name: "Sunset", bg: "#1c0f14", bg2: "#2a151d", text: "#fdf2f4", sub: "#c9a3ac", accent: "#ff7b72", border: "#4a2530" },
  { name: "Dracula", bg: "#282a36", bg2: "#343746", text: "#f8f8f2", sub: "#a8a8b8", accent: "#bd93f9", border: "#44475a" },
];

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Rust: "#dea584",
  Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d", C: "#555555", Ruby: "#701516",
  PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB", HTML: "#e34c26",
  CSS: "#563d7c", Shell: "#89e051", Vue: "#41b883", "Jupyter Notebook": "#DA5B0B",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`;
}

function cardSvg(repo: RepoData, theme: Theme): string {
  const langColor = LANG_COLORS[repo.language] ?? theme.accent;
  const desc = esc(repo.description || "No description provided.");
  const descLines = desc.length > 95 ? desc.slice(0, 92) + "..." : desc;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="220" viewBox="0 0 600 220">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${theme.bg}"/><stop offset="1" stop-color="${theme.bg2}"/>
</linearGradient></defs>
<rect width="600" height="220" rx="16" fill="url(#g)" stroke="${theme.border}" stroke-width="1.5"/>
<circle cx="64" cy="64" r="30" fill="${theme.border}"/>
<text x="64" y="74" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="${theme.accent}">${esc(repo.fullName.split("/")[0]?.[0]?.toUpperCase() ?? "G")}</text>
<text x="110" y="58" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="${theme.text}">${esc(repo.fullName)}</text>
<text x="110" y="88" font-family="system-ui,sans-serif" font-size="15" fill="${theme.sub}">${descLines}</text>
<rect x="40" y="118" width="520" height="1" fill="${theme.border}"/>
<text x="40" y="152" font-family="system-ui,sans-serif" font-size="17" fill="${theme.text}">&#9733; ${fmt(repo.stars)} stars</text>
<text x="200" y="152" font-family="system-ui,sans-serif" font-size="17" fill="${theme.text}">&#9282; ${fmt(repo.forks)} forks</text>
<circle cx="348" cy="146" r="7" fill="${langColor}"/>
<text x="362" y="152" font-family="system-ui,sans-serif" font-size="17" fill="${theme.text}">${esc(repo.language || "Unknown")}</text>
<text x="40" y="188" font-family="system-ui,sans-serif" font-size="13" fill="${theme.sub}">Updated ${esc(repo.updated)}</text>
<text x="560" y="188" text-anchor="end" font-family="system-ui,sans-serif" font-size="13" fill="${theme.accent}">github.com</text>
</svg>`;
}

function parseRepoInput(input: string): string | null {
  const t = input.trim().replace(/\.git$/, "");
  const urlMatch = t.match(/github\.com\/([^/]+\/[^/]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  if (/^[^/\s]+\/[^/\s]+$/.test(t)) return t;
  return null;
}

function GhCardTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gh-card", isPro);
  const seo = getToolSeo("gh-card");

  const [input, setInput] = useState("facebook/react");
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = THEMES[themeIdx] ?? THEMES[0]!;

  const fetchRepo = useCallback(async () => {
    if (busy || !trial.canUse) return;
    const slug = parseRepoInput(input);
    if (!slug) {
      setError("Use the format owner/repo or paste a github.com URL.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${slug}`);
      if (res.status === 404) throw new Error("Repo not found. Check the owner and repo name.");
      if (res.status === 403) throw new Error("GitHub rate limit hit (60 requests/hour for guests). Try again later.");
      if (!res.ok) throw new Error(`GitHub returned ${res.status}. Try again later.`);
      const j = await res.json();
      setRepo({
        fullName: j.full_name,
        description: j.description ?? "",
        stars: j.stargazers_count ?? 0,
        forks: j.forks_count ?? 0,
        language: j.language ?? "",
        updated: new Date(j.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        avatar: j.owner?.avatar_url ?? "",
      });
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch that repo.");
      setRepo(null);
    } finally {
      setBusy(false);
    }
  }, [input, busy, trial]);

  const svgString = repo ? cardSvg(repo, theme) : "";
  const svgUrl = svgString ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}` : "";

  const downloadSvg = useCallback(() => {
    if (!svgString || !repo) return;
    downloadBlob(new Blob([svgString], { type: "image/svg+xml" }), `${repo.fullName.replace("/", "-")}-card.svg`);
    toast.success("SVG card downloaded");
  }, [svgString, repo]);

  const downloadPng = useCallback(async () => {
    if (!svgUrl || !repo) return;
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Render failed."));
        img.src = svgUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 440;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 1200, 440);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Export failed.");
      downloadBlob(blob, `${repo.fullName.replace("/", "-")}-card.png`);
      toast.success("PNG card downloaded (1200 x 440)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PNG export failed.");
    }
  }, [svgUrl, repo]);

  return (
    <ToolPageShell toolId="gh-card" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GitHub Card" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Repository</label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void fetchRepo(); }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="owner/repo or github.com URL"
            />
            <p className="mt-1 text-xs text-muted-foreground">Live data from the public GitHub API.</p>
          </div>

          <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={fetchRepo}>
            <Search className="h-4 w-4" /> {busy ? "Fetching…" : "Fetch repo"}
          </ActionButton>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setThemeIdx(i)}
                  className={cn(
                    "rounded-xl border-2 px-2 py-2 text-xs font-bold transition",
                    themeIdx === i ? "border-primary" : "border-transparent",
                  )}
                  style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.bg2})`, color: t.text }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {repo && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadSvg}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary/40"
              >
                <Download className="h-4 w-4" /> SVG
              </button>
              <button
                type="button"
                onClick={() => void downloadPng()}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary/40"
              >
                <FileImage className="h-4 w-4" /> PNG
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!repo ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your repo card appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter any public repository and get a shareable card with stars, forks, language and theme.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
              <img src={svgUrl} alt={`${repo.fullName} card`} className="w-full max-w-xl rounded-2xl" />
              <p className="text-xs text-muted-foreground">
                Data fetched live from api.github.com. SVG and PNG exports are generated in your browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
