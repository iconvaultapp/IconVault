import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Git Command Explainer - Free Online Git Learning Tool | IconVault",
    metaDescription: "Paste any Git command and get a plain-English breakdown of each flag and argument. Covers 50+ commands. Free, no signup.",
    about: [
      "**IconVault**'s **Git Command Explainer** decodes the Git you copy from Stack Overflow. Paste or type any command like git reset --hard HEAD~1 and get a **plain-English explanation** of what the command does, plus a **breakdown of every flag and argument** (what --hard means, what HEAD~1 points to).",
      "It covers the **50+ commands developers actually run**, from daily staples (add, commit, push) to the scary ones (reset, rebase, reflog), with **danger levels** so you see warnings before destructive operations. It is **free and runs fully in your browser**.",
    ],
    faqs: [
      { q: "How does the explainer work?", a: "It matches your input against a curated database of Git commands and flags, then renders a breakdown: the command's purpose, each flag's meaning, and any danger warnings." },
      { q: "What does git reset --hard do?", a: "It moves the current branch pointer to the target commit and discards all staged and unstaged changes. It is destructive, which is why the tool flags it red." },
      { q: "Can it explain partial or mistyped commands?", a: "The tool is forgiving with common forms and aliases, and it shows close matches when it cannot fully parse your input." },
      { q: "Which commands are covered?", a: "Over 50: setup, staging, committing, branching, merging, rebasing, stashing, remotes, tags, reflog, bisect, and worktrees." },
      { q: "Is it good for beginners?", a: "Yes. Plain-English explanations and danger flags make it a safe way to learn what a command does before running it." },
      { q: "Is Git Command Explainer free?", a: "Yes. Explaining commands and flags is free with no account and no signup." },
    ],
    tags: ["git command explainer", "explain git command", "git explain", "what does git command do", "git flag meanings", "git command breakdown", "git reset explained", "git rebase explained", "git cherry pick explained", "git reflog explained", "git stash explained", "git bisect explained", "git merge explained", "git fetch vs pull explained", "git hard soft mixed reset", "git command translator", "understand git commands", "learn git commands", "git command reference with examples", "git flags list", "git options explained", "git checkout explained", "git switch explained", "git restore explained", "git clean explained", "git show explained", "git diff explained", "git log explained", "git blame explained", "git tag explained", "git remote explained", "git push explained", "git pull explained", "git clone explained", "git init explained", "git commit explained", "git add explained", "git mv explained", "git rm explained", "git grep explained", "git shortlog explained", "git worktree explained", "git submodule explained", "git archive explained", "git describe explained", "git command decoder", "decode git command", "git command helper", "git syntax explained", "git arguments explained", "git head explained", "git tilde caret explained", "git double dash meaning", "git command cheat sheet with explanations", "what does this git command do"],
  };

export default seo;
