// /tools/typing-test - Typing speed test with WPM, accuracy and local best scores.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/typing-test")({
  head: () => {
    const seo = getToolSeoMeta("typing-test");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: TypingTestTool,
});

const PASSAGES = [
  "The quick brown fox jumps over the lazy dog near the riverbank while the morning sun paints the water gold. Birds sing in the tall trees and a gentle breeze moves through the green leaves of the forest.",
  "Typing fast is a skill built with patience and steady practice. Keep your eyes on the screen, relax your shoulders, and let your fingers learn the rhythm of the keys one careful word at a time.",
  "Coffee shops are the unofficial offices of the modern world. Laptops hum beside steaming cups, ideas are born over pastry crumbs, and deadlines get finished to the sound of milk being steamed.",
  "Somewhere between the mountains and the sea lies a small town where time moves slowly. The baker waves at every child, the river sings the same old song, and nobody is ever in a hurry.",
  "Learning a new language rewires your brain in wonderful ways. Each word is a small window into another culture, and every mistake is proof that you are brave enough to try something hard.",
  "The drummer counts to four and the whole band leaps into the song. Guitars ring out, the bass thumps like a heartbeat, and the crowd moves as one body under the warm stage lights.",
  "Astronauts train for years before they ever leave the ground. They practice floating in giant pools, memorize every switch in the cockpit, and learn to stay calm when the countdown reaches zero.",
  "Rain tapped softly against the window as the train rolled through the countryside. Fields of green stretched to the horizon, and distant hills faded into the gray mist of the early morning.",
];

const MODES = [30, 60] as const;
const HISTORY_KEY = "iconvault-typing-history";

type HistoryEntry = { date: string; wpm: number; acc: number; mode: number };

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function TypingTestTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("typing-test", isPro);
  const seo = getToolSeo("typing-test");

  const [mode, setMode] = useState<(typeof MODES)[number]>(30);
  const [passage, setPassage] = useState(() => PASSAGES[Math.floor(Math.random() * PASSAGES.length)]);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState<{ wpm: number; acc: number; chars: number; errors: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    typeof window === "undefined" ? [] : loadHistory(),
  );

  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const typedRef = useRef("");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const passageRef = useRef(passage);
  passageRef.current = passage;

  const finish = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const t = typedRef.current;
    const p = passageRef.current;
    const m = modeRef.current;
    const secs = Math.max(1, (Date.now() - startRef.current) / 1000);
    let correct = 0;
    for (let i = 0; i < t.length; i++) if (t[i] === p![i]) correct++;
    const wpm = Math.round(correct / 5 / (secs / 60));
    const acc = t.length === 0 ? 0 : Math.round((correct / t.length) * 100);
    const entry = { date: new Date().toISOString(), wpm, acc, mode: m };
    setStats({ wpm, acc, chars: t.length, errors: t.length - correct });
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* storage full */ }
      return next;
    });
    setRunning(false);
    setFinished(true);
    trial.recordUse();
  }, [trial]);

  const reset = useCallback((newMode?: (typeof MODES)[number]) => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const m = newMode ?? modeRef.current;
    const options = PASSAGES.filter((p) => p !== passageRef.current);
    const next = options[Math.floor(Math.random() * options.length)];
    setPassage(next);
    typedRef.current = "";
    setTyped("");
    setElapsed(0);
    setRunning(false);
    setFinished(false);
    setStats(null);
  }, []);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    },
    [],
  );

  // Time up watcher
  useEffect(() => {
    if (running && elapsed >= mode && !finished) finish();
  }, [elapsed, running, mode, finished, finish]);

  const beginTimer = useCallback(() => {
    startRef.current = Date.now();
    setRunning(true);
    timerRef.current = window.setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
  }, []);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (finished) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        const next = typedRef.current.slice(0, -1);
        typedRef.current = next;
        setTyped(next);
        return;
      }
      if (e.key.length !== 1) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Prevent the page from scrolling when Space is pressed while typing.
      e.preventDefault();
      if (!running) beginTimer();
      const p = passageRef.current;
      const next = typedRef.current + e.key;
      if (next.length > p!.length) return;
      typedRef.current = next;
      setTyped(next);
      if (next.length >= p!.length) finish();
    },
    [finished, running, beginTimer, finish],
  );

  const timeLeft = Math.max(0, Math.ceil(mode - elapsed));
  const liveCorrect = typed.split("").filter((c, i) => c === passage![i]).length;
  const liveWpm = elapsed > 1 ? Math.round(liveCorrect / 5 / (elapsed / 60)) : 0;
  const liveAcc = typed.length === 0 ? 100 : Math.round((liveCorrect / typed.length) * 100);
  const best = history.filter((h) => h.mode === mode).reduce((a, b) => (b.wpm > a.wpm ? b : a), { wpm: 0 } as HistoryEntry);

  const share = useCallback(async () => {
    if (!stats) return;
    const text = `Typing test: ${stats.wpm} WPM at ${stats.acc}% accuracy (${mode}s) - taken on IconVault's free Typing Test`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Result copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [stats, mode]);

  return (
    <ToolPageShell toolId="typing-test" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Typing Test" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m}s
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-4 text-sm font-bold">
              <span className="text-foreground">
                {timeLeft}<span className="text-xs font-semibold text-muted-foreground">s</span>
              </span>
              <span className="text-primary">{liveWpm} WPM</span>
              <span className="text-foreground">{liveAcc}%</span>
            </div>
          </div>

          <div
            tabIndex={0}
            role="textbox"
            aria-label="Type the passage shown"
            onKeyDown={handleKey}
            onClick={(e) => e.currentTarget.focus()}
            className={cn(
              "min-h-[180px] cursor-text select-none rounded-xl border p-5 font-mono text-lg leading-8 outline-none",
              running || finished ? "border-border" : "border-dashed border-primary/40",
            )}
          >
            {passage!.split("").map((ch, i) => {
              const t = typed[i];
              const isCurrent = i === typed.length && !finished;
              return (
                <span
                  key={i}
                  className={cn(
                    t === undefined && (isCurrent ? "bg-primary/20" : ""),
                    t !== undefined && t === ch && "text-emerald-600 dark:text-emerald-400",
                    t !== undefined && t !== ch && "rounded bg-red-500/20 text-red-600 dark:text-red-400",
                    isCurrent && "rounded bg-primary/20",
                  )}
                >
                  {ch}
                </span>
              );
            })}
            {!running && !finished && typed.length === 0 && (
              <p className="mt-3 text-center font-sans text-sm text-muted-foreground">
                Click here and start typing to begin the test.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton busy={false} onClick={() => reset()}>
              <RotateCcw className="h-4 w-4" /> New test
            </ActionButton>
            {stats && finished && (
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground transition hover:border-primary/40"
              >
                <Copy className="h-4 w-4" /> Share result
              </button>
            )}
            {!isPro && (
              <p className="ml-auto text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free tests left.
              </p>
            )}
          </div>

          {stats && finished && (
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 p-4 text-center">
              <div>
                <p className="text-2xl font-black text-primary">{stats.wpm}</p>
                <p className="text-xs text-muted-foreground">WPM</p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{stats.acc}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{stats.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          )}
        </div>

        <div className="h-fit space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold">Your best ({mode}s)</h2>
          </div>
          <p className="text-3xl font-black text-foreground">
            {best.wpm > 0 ? `${best.wpm} WPM` : "-"}
          </p>
          <h2 className="text-sm font-bold">Recent attempts</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempts yet. Finish a test to save it here.</p>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 8).map((h, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-bold">{h.wpm} WPM</span>
                  <span className="text-muted-foreground">{h.acc}% - {h.mode}s</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">History stays in your browser only.</p>
        </div>
      </div>
    </ToolPageShell>
  );
}
