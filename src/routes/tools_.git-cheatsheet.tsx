// /tools/git-cheatsheet - Searchable Git command reference with safety ratings.
// Runs fully in your browser, nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/git-cheatsheet")({
  head: () => {
    const seo = getToolSeoMeta("git-cheatsheet");
    const canonical = "https://iconvault.site/tools/git-cheatsheet";
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
  component: GitCheatsheetTool,
});

type Danger = "safe" | "caution" | "dangerous";

interface GitCommand {
  cmd: string;
  desc: string;
  danger: Danger;
}

interface GitGroup {
  title: string;
  commands: GitCommand[];
}

const GROUPS: GitGroup[] = [
  {
    title: "Setup",
    commands: [
      { cmd: 'git config --global user.name "Your Name"', desc: "Set your display name for commits", danger: "safe" },
      { cmd: 'git config --global user.email "you@example.com"', desc: "Set your email for commits", danger: "safe" },
      { cmd: "git config --global init.defaultBranch main", desc: "Default new repos to the main branch", danger: "safe" },
      { cmd: "git init", desc: "Start a new repository in the current folder", danger: "safe" },
      { cmd: "git clone <url>", desc: "Copy a remote repository to your machine", danger: "safe" },
      { cmd: "git config --global alias.st status", desc: "Create a shortcut, eg. git st means git status", danger: "safe" },
    ],
  },
  {
    title: "Basic workflow",
    commands: [
      { cmd: "git status", desc: "Show changed, staged and untracked files", danger: "safe" },
      { cmd: "git add <file>", desc: "Stage a file for the next commit", danger: "safe" },
      { cmd: "git add .", desc: "Stage every change in the current folder", danger: "safe" },
      { cmd: 'git commit -m "message"', desc: "Save staged changes with a message", danger: "safe" },
      { cmd: "git commit -am \"message\"", desc: "Stage tracked files and commit in one step", danger: "safe" },
      { cmd: "git log", desc: "Show commit history", danger: "safe" },
      { cmd: "git log --oneline --graph --all", desc: "Compact history with a branch graph", danger: "safe" },
      { cmd: "git diff", desc: "Show unstaged changes", danger: "safe" },
      { cmd: "git diff --staged", desc: "Show staged changes waiting to be committed", danger: "safe" },
      { cmd: "git show <commit>", desc: "Show the changes in one commit", danger: "safe" },
    ],
  },
  {
    title: "Branching",
    commands: [
      { cmd: "git branch", desc: "List local branches", danger: "safe" },
      { cmd: "git branch <name>", desc: "Create a new branch", danger: "safe" },
      { cmd: "git checkout -b <name>", desc: "Create and switch to a new branch", danger: "safe" },
      { cmd: "git switch -c <name>", desc: "Modern way to create and switch branches", danger: "safe" },
      { cmd: "git switch <name>", desc: "Switch to an existing branch", danger: "safe" },
      { cmd: "git merge <branch>", desc: "Merge another branch into the current one", danger: "caution" },
      { cmd: "git branch -d <name>", desc: "Delete a fully merged branch", danger: "safe" },
      { cmd: "git branch -D <name>", desc: "Force delete a branch, merged or not", danger: "dangerous" },
      { cmd: "git push origin --delete <name>", desc: "Delete a branch on the remote", danger: "dangerous" },
    ],
  },
  {
    title: "Remote",
    commands: [
      { cmd: "git remote -v", desc: "List remote URLs", danger: "safe" },
      { cmd: "git remote add origin <url>", desc: "Link your repo to a remote", danger: "safe" },
      { cmd: "git fetch", desc: "Download remote changes without merging", danger: "safe" },
      { cmd: "git pull", desc: "Fetch and merge remote changes", danger: "caution" },
      { cmd: "git push", desc: "Upload your commits to the remote", danger: "safe" },
      { cmd: "git push -u origin <branch>", desc: "Push and set the upstream for future pushes", danger: "safe" },
      { cmd: "git push --force", desc: "Overwrite remote history, can erase teammates work", danger: "dangerous" },
      { cmd: "git push --force-with-lease", desc: "Safer force push that aborts if the remote moved", danger: "caution" },
    ],
  },
  {
    title: "Undo",
    commands: [
      { cmd: "git restore <file>", desc: "Discard unstaged changes in a file", danger: "caution" },
      { cmd: "git restore --staged <file>", desc: "Unstage a file, keep your edits", danger: "safe" },
      { cmd: "git reset HEAD~1", desc: "Undo the last commit, keep your edits", danger: "caution" },
      { cmd: "git reset --hard HEAD~1", desc: "Undo the last commit AND discard edits", danger: "dangerous" },
      { cmd: "git revert <commit>", desc: "Create a new commit that undoes an old one", danger: "safe" },
      { cmd: "git checkout -- <file>", desc: "Discard changes in a file (older syntax)", danger: "caution" },
      { cmd: "git clean -fd", desc: "Delete untracked files and folders permanently", danger: "dangerous" },
      { cmd: "git stash", desc: "Shelve uncommitted changes temporarily", danger: "safe" },
      { cmd: "git stash pop", desc: "Restore the most recent stash", danger: "safe" },
      { cmd: "git stash list", desc: "Show saved stashes", danger: "safe" },
    ],
  },
  {
    title: "Advanced",
    commands: [
      { cmd: "git rebase main", desc: "Replay your commits on top of main for a linear history", danger: "caution" },
      { cmd: "git rebase -i HEAD~3", desc: "Interactively rewrite the last 3 commits", danger: "dangerous" },
      { cmd: "git cherry-pick <commit>", desc: "Apply one commit from another branch", danger: "safe" },
      { cmd: "git tag v1.0.0", desc: "Tag the current commit, eg. for releases", danger: "safe" },
      { cmd: "git blame <file>", desc: "Show who changed each line and when", danger: "safe" },
      { cmd: "git bisect start", desc: "Binary search history to find the commit that broke things", danger: "safe" },
      { cmd: "git reflog", desc: "Every move HEAD ever made, your undo safety net", danger: "safe" },
      { cmd: "git am <file>", desc: "Apply a patch series from a file", danger: "caution" },
      { cmd: "git submodule add <url>", desc: "Embed another repo inside yours", danger: "caution" },
    ],
  },
];

const DANGER_STYLE: Record<Danger, { label: string; cls: string }> = {
  safe: { label: "Safe", cls: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30" },
  caution: { label: "Caution", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  dangerous: { label: "Dangerous", cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
};

function GitCheatsheetTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("git-cheatsheet", isPro);
  const seo = getToolSeo("git-cheatsheet");
  const [query, setQuery] = useState("");
  const [dangerFilter, setDangerFilter] = useState<Danger | "all">("all");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.map((g) => ({
      ...g,
      commands: g.commands.filter(
        (c) =>
          (dangerFilter === "all" || c.danger === dangerFilter) &&
          (!q || c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.commands.length > 0);
  }, [query, dangerFilter]);

  const total = groups.reduce((a, g) => a + g.commands.length, 0);

  const copy = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      trial.recordUse();
      toast.success("Command copied");
    });
  };

  return (
    <ToolPageShell toolId="git-cheatsheet" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Git Cheatsheet" left={trial.left} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, e.g. rebase or undo"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "safe", "caution", "dangerous"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDangerFilter(d)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-bold capitalize transition",
                dangerFilter === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {d === "all" ? "All" : DANGER_STYLE[d].label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {total} commands - click any command to copy it. Runs fully in your browser, nothing is uploaded.
      </p>

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-base font-bold">{g.title}</h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {g.commands.map((c, i) => {
                const ds = DANGER_STYLE[c.danger];
                return (
                  <button
                    key={c.cmd + i}
                    type="button"
                    onClick={() => copy(c.cmd)}
                    className={cn(
                      "group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/50",
                      i > 0 && "border-t border-border",
                    )}
                  >
                    <code className="flex-1 break-all font-mono text-[13px] text-foreground">{c.cmd}</code>
                    <span className="hidden max-w-xs shrink-0 truncate text-xs text-muted-foreground md:block">
                      {c.desc}
                    </span>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold", ds.cls)}>
                      {ds.label}
                    </span>
                    <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </ToolPageShell>
  );
}
