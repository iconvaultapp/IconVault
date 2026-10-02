// /tools/git-command-explainer - Paste a git command, get a plain-English breakdown.
// Runs fully in your browser, nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/git-command-explainer")({
  head: () => {
    const seo = getToolSeoMeta("git-command-explainer");
    const canonical = "https://iconvault.site/tools/git-command-explainer";
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
  component: GitExplainerTool,
});

interface FlagInfo {
  flag: string;
  desc: string;
}

const COMMANDS: Record<string, { summary: string; flags: FlagInfo[] }> = {
  add: {
    summary: "Stages file changes so they are included in the next commit.",
    flags: [
      { flag: ".", desc: "Stage every change in the current folder and below" },
      { flag: "-A / --all", desc: "Stage all changes in the whole repo, including deletions" },
      { flag: "-p / --patch", desc: "Interactively choose which hunks to stage" },
      { flag: "-N / --intent-to-add", desc: "Record new files without staging their content" },
      { flag: "-u", desc: "Stage changes to tracked files only, skip new untracked files" },
    ],
  },
  commit: {
    summary: "Saves your staged changes to the repository history as a new commit.",
    flags: [
      { flag: "-m", desc: "Write the commit message inline" },
      { flag: "-a / --all", desc: "Stage changes to tracked files and commit in one step" },
      { flag: "--amend", desc: "Fold new changes into the previous commit instead of making a new one" },
      { flag: "--allow-empty", desc: "Create a commit even when nothing changed" },
      { flag: "-v / --verbose", desc: "Show the diff in the commit message editor" },
    ],
  },
  push: {
    summary: "Uploads your commits to the remote repository.",
    flags: [
      { flag: "-u / --set-upstream", desc: "Link the branch to the remote so future pushes need no arguments" },
      { flag: "-f / --force", desc: "Overwrite remote history. Dangerous, can erase teammates work" },
      { flag: "--force-with-lease", desc: "Force push but abort if someone else pushed first. Safer" },
      { flag: "--tags", desc: "Also push your local tags" },
      { flag: "--delete", desc: "Delete a branch or tag on the remote" },
      { flag: "--dry-run", desc: "Show what would be pushed without actually pushing" },
    ],
  },
  pull: {
    summary: "Downloads remote changes and merges them into your current branch.",
    flags: [
      { flag: "--rebase", desc: "Replay your local commits on top of the remote instead of merging" },
      { flag: "--ff-only", desc: "Only pull if it can fast-forward, never create a merge commit" },
      { flag: "--no-commit", desc: "Merge but stop before committing so you can inspect" },
      { flag: "--depth", desc: "Pull only recent history, creating a shallow clone" },
    ],
  },
  fetch: {
    summary: "Downloads remote changes into remote-tracking branches without merging.",
    flags: [
      { flag: "--all", desc: "Fetch from every configured remote, not just origin" },
      { flag: "--prune / -p", desc: "Remove local tracking of branches deleted on the remote" },
      { flag: "--tags", desc: "Also fetch tags" },
      { flag: "--depth", desc: "Limit history depth for a shallow fetch" },
    ],
  },
  checkout: {
    summary: "Switches branches or restores working-tree files from a commit.",
    flags: [
      { flag: "-b", desc: "Create a new branch and switch to it" },
      { flag: "-B", desc: "Create or reset a branch to start at HEAD, then switch" },
      { flag: "-- <file>", desc: "Restore a file from the index, discarding local edits" },
      { flag: "-", desc: "Switch back to the previous branch" },
      { flag: "--orphan", desc: "Create a branch with no history at all" },
    ],
  },
  switch: {
    summary: "The modern command for switching branches.",
    flags: [
      { flag: "-c", desc: "Create a new branch and switch to it" },
      { flag: "-C", desc: "Create or forcibly reset a branch, then switch" },
      { flag: "-", desc: "Switch back to the previous branch" },
      { flag: "--detach", desc: "Switch to a commit instead of a branch (detached HEAD)" },
    ],
  },
  branch: {
    summary: "Lists, creates and deletes branches.",
    flags: [
      { flag: "-d", desc: "Delete a branch, only if fully merged" },
      { flag: "-D", desc: "Force delete a branch even if not merged" },
      { flag: "-a / --all", desc: "Show both local and remote-tracking branches" },
      { flag: "-r", desc: "Show remote-tracking branches only" },
      { flag: "-m / --move", desc: "Rename a branch" },
      { flag: "-vv", desc: "Show upstream and last commit for each branch" },
    ],
  },
  merge: {
    summary: "Joins another branch into the current one.",
    flags: [
      { flag: "--no-ff", desc: "Always create a merge commit, even when a fast-forward is possible" },
      { flag: "--ff-only", desc: "Only merge if it fast-forwards, otherwise abort" },
      { flag: "--squash", desc: "Combine all incoming commits into one staged change" },
      { flag: "--abort", desc: "Cancel a merge in progress and go back to before it" },
      { flag: "--continue", desc: "Resume a merge after you fixed conflicts" },
    ],
  },
  rebase: {
    summary: "Replays your commits on top of another base for a linear history.",
    flags: [
      { flag: "-i / --interactive", desc: "Open an editor to reorder, squash or drop commits" },
      { flag: "--continue", desc: "Resume after resolving conflicts" },
      { flag: "--abort", desc: "Cancel the rebase and restore the original state" },
      { flag: "--skip", desc: "Skip the current commit and continue" },
      { flag: "--onto", desc: "Pick the exact base the commits should be replayed onto" },
    ],
  },
  reset: {
    summary: "Moves the current branch pointer, optionally discarding changes.",
    flags: [
      { flag: "--soft", desc: "Move HEAD, keep changes staged" },
      { flag: "--mixed", desc: "Move HEAD, keep changes unstaged (the default)" },
      { flag: "--hard", desc: "Move HEAD and discard all local changes. Dangerous" },
      { flag: "HEAD~1", desc: "Go back one commit" },
      { flag: "--keep", desc: "Reset but keep uncommitted changes when safe" },
    ],
  },
  revert: {
    summary: "Creates a new commit that undoes a previous commit. History-safe.",
    flags: [
      { flag: "--no-commit", desc: "Apply the reversal to the working tree without committing" },
      { flag: "-m", desc: "Pick which parent to keep when reverting a merge commit" },
      { flag: "--continue", desc: "Resume after resolving conflicts" },
      { flag: "--abort", desc: "Cancel the revert" },
    ],
  },
  restore: {
    summary: "Restores working-tree files or unstages them.",
    flags: [
      { flag: "--staged", desc: "Unstage the file but keep your edits" },
      { flag: "--source", desc: "Restore from a specific commit or branch instead of the index" },
      { flag: "--worktree", desc: "Restore only the working tree, not the index" },
      { flag: "-p / --patch", desc: "Interactively choose which hunks to restore" },
    ],
  },
  stash: {
    summary: "Shelves uncommitted changes so you can switch context and come back.",
    flags: [
      { flag: "push", desc: "Save current changes to a new stash entry" },
      { flag: "pop", desc: "Apply the latest stash and drop it from the list" },
      { flag: "apply", desc: "Apply the latest stash but keep it in the list" },
      { flag: "list", desc: "Show all saved stashes" },
      { flag: "-u / --include-untracked", desc: "Also stash untracked files" },
      { flag: "drop", desc: "Delete a stash entry" },
      { flag: "-m", desc: "Label the stash with a message" },
    ],
  },
  log: {
    summary: "Shows the commit history of the current branch.",
    flags: [
      { flag: "--oneline", desc: "One line per commit, compact" },
      { flag: "--graph", desc: "Draw an ASCII graph of branches and merges" },
      { flag: "--all", desc: "Include all branches, not just the current one" },
      { flag: "-n / -<number>", desc: "Show only the last n commits" },
      { flag: "--stat", desc: "Show which files changed in each commit" },
      { flag: "-- <file>", desc: "Show history for one file only" },
      { flag: "--author", desc: "Filter commits by author name or email" },
    ],
  },
  diff: {
    summary: "Shows the differences between commits, branches or the working tree.",
    flags: [
      { flag: "--staged", desc: "Show staged changes instead of unstaged ones" },
      { flag: "--stat", desc: "Show a summary of changed files instead of the full diff" },
      { flag: "--name-only", desc: "Show only the names of changed files" },
      { flag: "-w", desc: "Ignore whitespace differences" },
      { flag: "--check", desc: "Warn about whitespace mistakes, no diff output" },
    ],
  },
  status: {
    summary: "Shows what changed, what is staged and what is untracked.",
    flags: [
      { flag: "-s / --short", desc: "Compact two-letter status output" },
      { flag: "-b / --branch", desc: "Also show the branch and its upstream state" },
      { flag: "-uall / -u", desc: "Show individual untracked files, not just folders" },
    ],
  },
  remote: {
    summary: "Manages the remotes linked to this repository.",
    flags: [
      { flag: "add", desc: "Link a new remote name to a URL" },
      { flag: "remove", desc: "Delete a remote" },
      { flag: "-v", desc: "Show the URLs behind each remote name" },
      { flag: "set-url", desc: "Change a remote URL" },
      { flag: "rename", desc: "Rename a remote" },
    ],
  },
  tag: {
    summary: "Marks specific commits, usually for releases.",
    flags: [
      { flag: "-a", desc: "Create an annotated tag with a message and your name" },
      { flag: "-m", desc: "Message for the tag" },
      { flag: "-d", desc: "Delete a tag" },
      { flag: "-l", desc: "List tags, optionally filtered by a pattern" },
    ],
  },
  clone: {
    summary: "Copies a remote repository to your machine.",
    flags: [
      { flag: "--depth", desc: "Create a shallow clone with limited history" },
      { flag: "-b / --branch", desc: "Clone and check out a specific branch" },
      { flag: "--recurse-submodules", desc: "Also fetch any submodules" },
      { flag: "--bare", desc: "Clone without a working tree, for servers" },
    ],
  },
  cherry_pick: {
    summary: "Applies one or more commits from elsewhere onto the current branch.",
    flags: [
      { flag: "-n / --no-commit", desc: "Apply the change without committing" },
      { flag: "--continue", desc: "Resume after resolving conflicts" },
      { flag: "--abort", desc: "Cancel the cherry-pick" },
      { flag: "-x", desc: "Record the original commit hash in the new message" },
    ],
  },
  clean: {
    summary: "Deletes untracked files and folders. Irreversible.",
    flags: [
      { flag: "-f / --force", desc: "Actually delete, required for it to do anything" },
      { flag: "-d", desc: "Also remove untracked folders" },
      { flag: "-n / --dry-run", desc: "Show what would be deleted without deleting" },
      { flag: "-x", desc: "Also remove files ignored by gitignore" },
    ],
  },
  blame: {
    summary: "Shows who changed each line of a file and in which commit.",
    flags: [
      { flag: "-L", desc: "Only blame a line range, e.g. -L 10,20" },
      { flag: "-e", desc: "Show author emails instead of names" },
      { flag: "-w", desc: "Ignore whitespace when tracing changes" },
    ],
  },
  show: {
    summary: "Displays the changes and message of one commit.",
    flags: [
      { flag: "--stat", desc: "Show file stats instead of the full diff" },
      { flag: "--name-only", desc: "Show only changed file names" },
      { flag: "--pretty", desc: "Control the format of the commit message output" },
    ],
  },
  bisect: {
    summary: "Binary searches history to find the commit that introduced a bug.",
    flags: [
      { flag: "start", desc: "Begin a bisect session" },
      { flag: "good", desc: "Mark a commit as working" },
      { flag: "bad", desc: "Mark a commit as broken" },
      { flag: "reset", desc: "End the session and return to the original HEAD" },
    ],
  },
  config: {
    summary: "Reads and writes git settings.",
    flags: [
      { flag: "--global", desc: "Change settings for your user, all repos" },
      { flag: "--local", desc: "Change settings for the current repo only" },
      { flag: "--list", desc: "Show all current settings" },
      { flag: "--unset", desc: "Remove a setting" },
      { flag: "--get", desc: "Print the value of one setting" },
    ],
  },
};

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of input.trim()) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (/\s/.test(ch)) {
      if (cur) { tokens.push(cur); cur = ""; }
    } else {
      cur += ch;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

interface ParsedPart {
  token: string;
  kind: "base" | "flag" | "arg";
  explanation: string;
  unknown?: boolean;
}

function findFlagDesc(entry: { flags: FlagInfo[] }, flag: string): string | null {
  const norm = flag.split("=")[0] ?? "";
  for (const f of entry.flags) {
    const variants = f.flag.split("/").map((v) => v.trim().split(" ")[0]);
    if (variants.includes(norm)) return f.desc;
  }
  if (/^-?\d+$/.test(norm) || /^-\d+$/.test(flag)) return "Show only the last n commits";
  return null;
}

function explain(tokens: string[]): { base: string; parts: ParsedPart[]; known: boolean } {
  const t = [...tokens];
  if (t[0] === "git") t.shift();
  const baseRaw = (t.shift() ?? "").replace(/-/g, "_");
  const entry = COMMANDS[baseRaw];
  const parts: ParsedPart[] = [];
  if (entry) {
    parts.push({ token: baseRaw.replace(/_/g, "-"), kind: "base", explanation: entry.summary });
  }
  for (const token of t) {
    if (token.startsWith("-") && token.length > 1) {
      const desc = entry ? findFlagDesc(entry, token) : null;
      parts.push({
        token,
        kind: "flag",
        explanation: desc ?? "Unknown flag, not in the built-in dictionary for this command.",
        unknown: !desc,
      });
    } else {
      parts.push({
        token,
        kind: "arg",
        explanation: entry
          ? `An argument to the command, like a branch name, file path or value.`
          : "An argument, the command itself was not recognized.",
      });
    }
  }
  return { base: baseRaw.replace(/_/g, "-"), parts, known: !!entry };
}

function GitExplainerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("git-command-explainer", isPro);
  const seo = getToolSeo("git-command-explainer");
  const [input, setInput] = useState("git rebase -i HEAD~3");
  const [explained, setExplained] = useState<ParsedPart[] | null>(null);
  const [base, setBase] = useState("");
  const [known, setKnown] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const commandKeys = useMemo(() => Object.keys(COMMANDS).map((k) => k.replace(/_/g, "-")), []);

  const doExplain = () => {
    const tokens = tokenize(input);
    if (tokens.length === 0) {
      toast.error("Paste a git command first");
      return;
    }
    const r = explain(tokens);
    setExplained(r.parts);
    setBase(r.base);
    setKnown(r.known);
    setSubmitted(true);
    trial.recordUse();
    if (!r.known) toast.message("Command not in the dictionary, flags are still labeled honestly.");
  };

  return (
    <ToolPageShell toolId="git-command-explainer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Git Command Explainer" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="mb-2 block text-[13px] font-medium text-foreground/80">
          Paste a git command
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doExplain(); }}
          placeholder='e.g. git push -u origin main'
          spellCheck={false}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ActionButton onClick={doExplain} disabled={!input.trim()}>
            Explain command
          </ActionButton>
          <div className="flex flex-wrap gap-1.5">
            {["git commit -am \"fix\"", "git pull --rebase", "git stash -u"].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInput(ex)}
                className="rounded-lg border border-border px-2 py-1 font-mono text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {submitted && explained && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm">
              {known ? (
                <>Base command: <code className="font-mono font-bold">git {base}</code></>
              ) : (
                <>
                  <code className="font-mono font-bold">git {base}</code> is not in the built-in
                  dictionary, so only a generic breakdown is shown.
                </>
              )}
            </p>
          </div>
          <div className="space-y-3">
            {explained.map((p, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4",
                  p.unknown ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-background",
                )}
              >
                <code className="shrink-0 rounded-lg bg-muted px-2.5 py-1.5 font-mono text-sm font-bold">
                  {p.token}
                </code>
                <div className="text-sm">
                  <span
                    className={cn(
                      "mb-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      p.kind === "base" && "bg-primary/10 text-primary",
                      p.kind === "flag" && (p.unknown ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"),
                      p.kind === "arg" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.unknown ? "unknown flag" : p.kind === "base" ? "command" : p.kind}
                  </span>
                  <p className="text-foreground/80">{p.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free explanations left - runs fully in your browser, nothing is uploaded.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Covers {commandKeys.length} common commands: {commandKeys.slice(0, 10).join(", ")} and more.
      </p>
    </ToolPageShell>
  );
}
