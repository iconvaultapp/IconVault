// /tools/bash-simulator - A simulated terminal for learning shell commands.
// This is a simulation, not a real shell: nothing runs, nothing leaves the browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Terminal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/bash-simulator")({
  head: () => {
    const seo = getToolSeoMeta("bash-simulator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BashTool,
});

interface FsNode {
  type: "dir" | "file";
  children?: Record<string, FsNode>;
  content?: string;
}

interface Line {
  kind: "cmd" | "out" | "err";
  text: string;
}

const INITIAL_FS: FsNode = {
  type: "dir",
  children: {
    home: {
      type: "dir",
      children: {
        guest: {
          type: "dir",
          children: {
            "README.txt": { type: "file", content: "Welcome to the simulated shell!\nType 'help' to see what you can do.\nNothing here is real, so feel free to experiment." },
            notes: { type: "dir", children: { "todo.txt": { type: "file", content: "- learn ls\n- learn cd\n- try mkdir\n- have fun" } } },
            projects: { type: "dir", children: {} },
          },
        },
      },
    },
    etc: { type: "dir", children: { motd: { type: "file", content: "Simulated shell. Have fun." } } },
    tmp: { type: "dir", children: {} },
  },
};

function splitArgs(cmd: string): string[] {
  const args: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of cmd) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === " " || ch === "\t") {
      if (cur) { args.push(cur); cur = ""; }
    } else {
      cur += ch;
    }
  }
  if (cur) args.push(cur);
  return args;
}

/** Resolve a path string against cwd. Returns normalized path segments or null. */
function resolvePath(cwd: string[], raw: string): string[] {
  const parts = raw.startsWith("/") ? [] : [...cwd];
  for (const seg of raw.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts;
}

function getNode(root: FsNode, path: string[]): FsNode | null {
  let node: FsNode | undefined = root;
  for (const seg of path) {
    if (!node || node.type !== "dir" || !node.children) return null;
    node = node.children[seg];
  }
  return node ?? null;
}

function getParent(root: FsNode, path: string[]): { parent: FsNode; name: string } | null {
  if (path.length === 0) return null;
  const parent = getNode(root, path.slice(0, -1));
  const name = path[path.length - 1]!;
  if (!parent || parent.type !== "dir" || !parent.children) return null;
  return { parent, name };
}

const HELP_TEXT = [
  "Available commands:",
  "  help            show this help",
  "  ls [path]       list directory contents",
  "  cd <path>       change directory",
  "  pwd             print working directory",
  "  echo <text>     print text (use > file to write)",
  "  cat <file>      show file contents",
  "  touch <file>    create an empty file",
  "  mkdir <dir>     create a directory",
  "  rm <path>       delete a file or empty directory",
  "  date            show the current date",
  "  whoami          who are you?",
  "  history         show command history",
  "  clear           clear the terminal",
].join("\n");

function BashTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bash-simulator", isPro);
  const seo = getToolSeo("bash-simulator");

  const [fs, setFs] = useState<FsNode>(INITIAL_FS);
  const [cwd, setCwd] = useState<string[]>(["home", "guest"]);
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "Welcome to the simulated shell. Type 'help' to begin." },
  ]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fsRef = useRef(fs);
  const cwdRef = useRef(cwd);
  fsRef.current = fs;
  cwdRef.current = cwd;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const run = useCallback((raw: string) => {
    const cmd = raw.trim();
    const base: Line[] = [{ kind: "cmd", text: `guest@sim:${cwdRef.current.length ? "/" + cwdRef.current.join("/") : "/"} $ ${raw}` }];
    if (!cmd) {
      setLines((l) => [...l, ...base]);
      return;
    }
    const newHistory = [...history, cmd];
    setHistory(newHistory);
    setHistIdx(-1);

    const out: Line[] = [];
    const say = (text: string, kind: Line["kind"] = "out") => out.push({ kind, text });
    const args = splitArgs(cmd);
    const name = args[0]!.toLowerCase();
    const root = fsRef.current;
    const cwdNow = cwdRef.current;

    const resolve = (p: string | undefined): { node: FsNode | null; path: string[] } => {
      const path = resolvePath(cwdNow, p ?? ".");
      return { node: getNode(root, path), path };
    };

    switch (name) {
      case "help":
        say(HELP_TEXT);
        break;
      case "clear":
        setLines([]);
        return;
      case "pwd":
        say("/" + cwdNow.join("/"));
        break;
      case "whoami":
        say("guest (a simulated user in a simulated shell)");
        break;
      case "date":
        say(new Date().toString());
        break;
      case "history":
        say(newHistory.map((h, i) => `  ${i + 1}  ${h}`).join("\n"));
        break;
      case "ls": {
        const flag = args[1]?.startsWith("-") ? args[1] : null;
        const target = flag ? args[2] : args[1];
        const { node } = resolve(target);
        if (!node) say(`ls: cannot access '${target ?? ""}': No such file or directory`, "err");
        else if (node.type === "file") say(target!);
        else {
          const names = Object.keys(node.children ?? {}).sort();
          if (flag && flag.includes("l")) {
            say(names.map((n) => `${node.children![n]!.type === "dir" ? "d" : "-"}rw-r--r--  ${n}`).join("\n") || "(empty)");
          } else {
            say(names.map((n) => (node.children![n]!.type === "dir" ? n + "/" : n)).join("  ") || "(empty)");
          }
        }
        break;
      }
      case "cd": {
        if (!args[1]) { setCwd(["home", "guest"]); break; }
        const { node, path } = resolve(args[1]);
        if (!node) say(`cd: no such file or directory: ${args[1]}`, "err");
        else if (node.type !== "dir") say(`cd: not a directory: ${args[1]}`, "err");
        else setCwd(path);
        break;
      }
      case "echo": {
        const gt = args.indexOf(">");
        if (gt > 1 && args[gt + 1]) {
          const text = args.slice(1, gt).join(" ");
          const { path } = resolve(args[gt + 1]);
          const slot = getParent(root, path);
          if (!slot) say("echo: cannot write there", "err");
          else {
            const next = structuredClone(root);
            const s2 = getParent(next, path)!;
            s2.parent.children![s2.name] = { type: "file", content: text + "\n" };
            setFs(next);
          }
        } else {
          say(args.slice(1).join(" "));
        }
        break;
      }
      case "cat": {
        if (!args[1]) { say("cat: missing file operand", "err"); break; }
        const { node } = resolve(args[1]);
        if (!node) say(`cat: ${args[1]}: No such file or directory`, "err");
        else if (node.type !== "file") say(`cat: ${args[1]}: Is a directory`, "err");
        else say(node.content ?? "");
        break;
      }
      case "touch": {
        if (!args[1]) { say("touch: missing file operand", "err"); break; }
        const { node, path } = resolve(args[1]);
        if (node && node.type === "dir") say(`touch: cannot touch '${args[1]}': Is a directory`, "err");
        else {
          const next = structuredClone(root);
          const slot = getParent(next, path)!;
          if (!slot.parent.children![slot.name]) {
            slot.parent.children![slot.name] = { type: "file", content: "" };
            setFs(next);
          }
        }
        break;
      }
      case "mkdir": {
        if (!args[1]) { say("mkdir: missing operand", "err"); break; }
        const { node, path } = resolve(args[1]);
        if (node) say(`mkdir: cannot create directory '${args[1]}': File exists`, "err");
        else {
          const slot = getParent(root, path);
          if (!slot) say("mkdir: cannot create directory there", "err");
          else {
            const next = structuredClone(root);
            const s2 = getParent(next, path)!;
            s2.parent.children![s2.name] = { type: "dir", children: {} };
            setFs(next);
          }
        }
        break;
      }
      case "rm": {
        if (!args[1]) { say("rm: missing operand", "err"); break; }
        if (args[1] === "-rf" && (!args[2] || args[2] === "/")) {
          say("rm: it is never a good idea to rm -rf / … even in a simulation. I refuse.", "err");
          break;
        }
        const target = args[1] === "-rf" ? args[2]! : args[1];
        const { node, path } = resolve(target);
        if (!node) say(`rm: cannot remove '${target}': No such file or directory`, "err");
        else if (node.type === "dir" && Object.keys(node.children ?? {}).length > 0)
          say(`rm: cannot remove '${target}': Directory not empty`, "err");
        else {
          const next = structuredClone(root);
          const slot = getParent(next, path)!;
          delete slot.parent.children![slot.name];
          setFs(next);
        }
        break;
      }
      // Easter eggs
      case "sudo":
        say("Nice try. This is a simulated shell, there is nothing to escalate to.");
        break;
      case "vim":
      case "emacs":
      case "nano":
        say(`${name}: command not found. Good news: there is nothing to edit for real here.`);
        break;
      case "exit":
      case "logout":
        say("There is no escape. (The browser tab, however, is yours to close.)");
        break;
      case "hello":
      case "hi":
      case "hey":
        say("Hello, guest! Type 'help' to see what this simulated shell can do.");
        break;
      case "coffee":
        say("Brewing… done. Here is your virtual coffee. ☕ (It tastes like pixels.)");
        break;
      case "matrix":
        say("Wake up, Neo… just kidding. This terminal is 100% simulated.");
        break;
      case "hack":
        say("Hacking… complete. You now own this simulation. It was already yours.");
        break;
      default:
        say(`${args[0]}: command not found. Type 'help' for the list of simulated commands.`, "err");
    }
    setLines((l) => [...l, ...base, ...out]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      run(value);
      setValue("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setValue(history[idx]!);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= history.length) { setHistIdx(-1); setValue(""); }
      else { setHistIdx(idx); setValue(history[idx]!); }
    }
  };

  const copyTranscript = async () => {
    if (!trial.canUse) return;
    const text = lines.map((l) => l.text).join("\n");
    try {
      await navigator.clipboard.writeText(text || "(empty terminal)");
      trial.recordUse();
      toast.success("Terminal transcript copied");
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  };

  const prompt = `guest@sim:${cwd.length ? "/" + cwd.join("/") : "/"} $`;

  return (
    <ToolPageShell toolId="bash-simulator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Bash Simulator" left={trial.left} />

      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Terminal className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            <strong>Simulated terminal.</strong> This is not a real shell: commands run against a tiny
            virtual filesystem and nothing leaves your browser.
          </p>
        </div>

        <div
          className="cursor-text rounded-2xl border border-border bg-[#0c0c0c] p-4"
          onClick={() => inputRef.current?.focus()}
        >
          <div ref={scrollRef} className="h-[380px] overflow-y-auto font-mono text-[13px] leading-relaxed">
            {lines.map((l, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap break-words",
                  l.kind === "cmd" && "font-bold text-emerald-400",
                  l.kind === "out" && "text-zinc-200",
                  l.kind === "err" && "text-red-400",
                )}
              >
                {l.text}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-bold text-emerald-400">{prompt}</span>
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                className="w-full bg-transparent font-mono text-[13px] text-zinc-100 outline-none"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Terminal input"
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton disabled={!trial.canUse} onClick={copyTranscript}>
            <Copy className="h-4 w-4" /> Copy transcript
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free transcript copies left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
