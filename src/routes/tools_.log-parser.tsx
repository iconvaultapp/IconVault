// /tools/log-parser - Paste or upload a log file, filter by level and search it.
// Auto-detects Apache/Nginx combined logs, JSON lines and plain text.
// Runs fully in your browser, nothing is uploaded.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/log-parser")({
  head: () => {
    const seo = getToolSeoMeta("log-parser");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: LogParserTool,
});

type Level = "info" | "warn" | "error" | "debug" | "other";

interface LogLine {
  raw: string;
  level: Level;
}

const APACHE_RE = /^\S+ \S+ \S+ \[[^\]]+\] "[A-Z]+ [^"]+" \d{3} \S+/;
const LEVEL_WORDS: { level: Level; re: RegExp }[] = [
  { level: "error", re: /\b(error|err|fatal|critical|fail|exception|traceback)\b/i },
  { level: "warn", re: /\b(warn|warning|deprecated)\b/i },
  { level: "debug", re: /\b(debug|trace|verbose)\b/i },
  { level: "info", re: /\b(info|information|notice|started|success|ok)\b/i },
];

function detectFormat(lines: string[]): string {
  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length === 0) return "none";
  if (APACHE_RE.test(nonEmpty[0] ?? "")) return "Apache / Nginx combined";
  try {
    JSON.parse(nonEmpty[0] ?? "");
    return "JSON lines";
  } catch { /* not json */ }
  return "Plain text";
}

function detectLevel(line: string): Level {
  const t = line.trim();
  if (t.startsWith("{")) {
    try {
      const obj = JSON.parse(t);
      const lvl = String(obj.level ?? obj.severity ?? obj.type ?? "").toLowerCase();
      if (/err|fatal|crit/.test(lvl)) return "error";
      if (/warn/.test(lvl)) return "warn";
      if (/debug|trace|verbose/.test(lvl)) return "debug";
      if (/info|notice/.test(lvl)) return "info";
      return "other";
    } catch { return "other"; }
  }
  for (const { level, re } of LEVEL_WORDS) {
    if (re.test(line)) return level;
  }
  return "other";
}

const LEVELS: Level[] = ["info", "warn", "error", "debug", "other"];
const LEVEL_STYLE: Record<Level, string> = {
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
  debug: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  other: "bg-muted text-muted-foreground",
};

function LogParserTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("log-parser", isPro);
  const seo = getToolSeo("log-parser");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<LogLine[]>([]);
  const [parsed, setParsed] = useState(false);
  const [activeLevels, setActiveLevels] = useState<Set<Level>>(new Set(LEVELS));
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const doParse = (text: string) => {
    const rawLines = text.split("\n");
    if (rawLines.filter((l) => l.trim()).length === 0) {
      toast.error("Paste some log content first");
      return;
    }
    setLines(rawLines.map((raw) => ({ raw, level: detectLevel(raw) })));
    setParsed(true);
    setActiveLevels(new Set(LEVELS));
    setSearch("");
    trial.recordUse();
    toast.success("Log parsed");
  };

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setInput(text.slice(0, 200000));
      doParse(text.slice(0, 200000));
    };
    reader.readAsText(f);
  };

  const format = useMemo(
    () => (parsed ? detectFormat(lines.map((l) => l.raw)) : "none"),
    [parsed, lines],
  );

  const stats = useMemo(() => {
    const s: Record<Level, number> = { info: 0, warn: 0, error: 0, debug: 0, other: 0 };
    for (const l of lines) s[l.level] += 1;
    return s;
  }, [lines]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter(
      (l) => activeLevels.has(l.level) && (!q || l.raw.toLowerCase().includes(q)),
    );
  }, [lines, activeLevels, search]);

  const toggleLevel = (lv: Level) => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lv)) next.delete(lv);
      else next.add(lv);
      return next;
    });
  };

  const copyFiltered = () => {
    navigator.clipboard.writeText(filtered.map((l) => l.raw).join("\n")).then(() => {
      trial.recordUse();
      toast.success(`Copied ${filtered.length} line${filtered.length === 1 ? "" : "s"}`);
    });
  };

  const clearAll = () => {
    setInput("");
    setLines([]);
    setParsed(false);
    toast.message("Cleared");
  };

  return (
    <ToolPageShell toolId="log-parser" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Log Parser" left={trial.left} />

      {!parsed ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">
            Paste log content or upload a file
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            placeholder={'127.0.0.1 - - [29/Sep/2026:10:00:01 +0530] "GET /api/users HTTP/1.1" 200 1234\n{"level":"error","msg":"DB timeout"}'}
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs outline-none focus:border-primary/50"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => doParse(input)}
              disabled={!input.trim()}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Parse log
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <FileUp className="h-4 w-4" /> Upload file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".log,.txt,.json,.out"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => toggleLevel(lv)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition",
                  activeLevels.has(lv)
                    ? "border-primary/50 bg-card"
                    : "border-border bg-card opacity-40",
                )}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{lv}</p>
                <p className="mt-1 font-mono text-xl font-bold">{stats[lv]}</p>
              </button>
            ))}
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Format</p>
              <p className="mt-1 text-xs font-bold leading-tight">{format}</p>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lines…"
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <div className="flex flex-wrap gap-1.5">
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => toggleLevel(lv)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold capitalize transition",
                    activeLevels.has(lv) ? LEVEL_STYLE[lv] : "bg-muted/40 text-muted-foreground/50",
                  )}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {lines.length} lines
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyFiltered}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" /> Copy filtered
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" /> New log
              </button>
            </div>
          </div>

          <div className="max-h-[560px] overflow-auto rounded-2xl border border-border bg-card">
            {filtered.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No lines match the current filters.</p>
            ) : (
              filtered.slice(0, 2000).map((l, i) => (
                <div key={i} className="flex gap-3 border-b border-border/50 px-4 py-2 last:border-0 hover:bg-muted/40">
                  <span className={cn("mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", LEVEL_STYLE[l.level])}>
                    {l.level}
                  </span>
                  <code className="break-all font-mono text-xs text-foreground/90">{l.raw}</code>
                </div>
              ))
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Display capped at 2,000 lines - copy gives you everything. Runs fully in your browser,
            nothing is uploaded.
          </p>
        </>
      )}

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free parses left.
        </p>
      )}
    </ToolPageShell>
  );
}
