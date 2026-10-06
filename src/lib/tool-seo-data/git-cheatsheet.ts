import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Git Cheatsheet - Free Online Git Commands Reference | IconVault",
    metaDescription: "A searchable Git cheatsheet with the commands you actually use: setup, branching, staging, merging, rebasing, and recovery. Free, no signup.",
    about: [
      "**IconVault**'s **Git Cheatsheet** is the **Git reference** you keep open in a tab: commands grouped by **setup, staging, branching, merging, rebasing, remotes, and recovery**, each with a plain-English description of what it does. Risky commands carry **danger flags** so you know when to pause before pressing enter.",
      "Every command has a **one-click copy button**, and the whole sheet is **searchable**, so typing 'undo' finds git reset and git revert in a keystroke. It is **free and runs fully in your browser**, with no signup and nothing to install.",
    ],
    faqs: [
      { q: "What does git rebase do?", a: "Rebase re-applies your commits on top of another branch, giving a linear history. It rewrites commit hashes, so avoid rebasing commits you have already pushed to a shared branch." },
      { q: "How do I undo my last commit?", a: "git reset --soft HEAD~1 keeps your changes staged while removing the commit. Use git reset --hard HEAD~1 only when you want to discard the changes too." },
      { q: "What is the difference between git merge and git rebase?", a: "Merge preserves branch history with a merge commit; rebase replays commits linearly. Merge is safer for shared branches, rebase keeps personal branches tidy." },
      { q: "How do I stash changes?", a: "git stash saves your uncommitted changes away, and git stash pop restores them. Use git stash list to see your saved stashes." },
      { q: "Is Git Cheatsheet free?", a: "Yes. The full command reference, search, and copy buttons are free with no account required." },
      { q: "Does it cover advanced commands?", a: "Yes. Beyond the basics you will find rebasing, cherry-picking, reflog recovery, bisect, worktrees, and submodule commands." },
    ],
    tags: ["git cheatsheet", "git commands cheat sheet", "git cheat sheet", "git commands list", "git command reference", "git basics cheat sheet", "git commands explained", "common git commands", "git branching commands", "git merge commands", "git rebase cheat sheet", "git stash commands", "git undo commands", "git reset cheat sheet", "git revert command", "git log commands", "git remote commands", "git push pull commands", "git clone command", "git commit cheat sheet", "git add command", "git status command", "git diff command", "git checkout vs switch", "git cherry pick", "git reflog recovery", "git bisect tutorial", "git worktree commands", "git submodule commands", "git tag commands", "git fetch vs pull", "git config commands", "git alias examples", "git squash commits", "git amend commit", "git force push safe", "git cheatsheet online", "git quick reference", "git commands for beginners", "learn git commands", "git terminal commands", "git command list with examples", "git essential commands", "git daily commands", "most used git commands", "git workflow commands", "git collaboration commands", "git conflict resolution", "git branch delete", "git rename branch", "git create branch", "git switch branch", "git merge conflict", "git rebase interactive", "git stash pop", "git commit message", "git add all", "git remove file", "git restore file", "git show commit", "git blame command", "git clean untracked", "git archive command"],
  };

export default seo;
