// /tools/word-search-game - Generate themed word search puzzles, find words by drag.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/word-search-game")({
  head: () => {
    const seo = getToolSeoMeta("word-search-game");
    const canonical = "https://iconvault.site/tools/word-search-game";
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
  component: WordSearchTool,
});

type Cell = { r: number; c: number };

const THEMES: Record<string, string[]> = {
  Animals: ["LION", "TIGER", "EAGLE", "SHARK", "PANDA", "ZEBRA", "KOALA", "OTTER", "BISON", "COBRA"],
  Food: ["PIZZA", "PASTA", "BURGER", "SUSHI", "TACO", "BREAD", "APPLE", "MELON", "HONEY", "CURRY"],
  Space: ["PLANET", "COMET", "ORBIT", "NEBULA", "ROCKET", "STAR", "MOON", "SATURN", "GALAXY", "ECLIPSE"],
  Tech: ["CODE", "CLOUD", "PIXEL", "SERVER", "ROBOT", "MODEM", "CHIP", "MOUSE", "SCREEN", "WIRED"],
  Sports: ["SOCCER", "TENNIS", "BOXING", "GOAL", "MEDAL", "RACE", "COACH", "ARENA", "SLAM", "REFEREE"],
  Music: ["PIANO", "GUITAR", "DRUM", "VIOLIN", "TEMPO", "MELODY", "CHORD", "VOCAL", "RHYTHM", "SONG"],
};

const SIZES = [8, 10, 12, 14] as const;
const DIRS = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]] as const;

type Placed = { word: string; cells: Cell[] };
type Puzzle = { grid: string[][]; placed: Placed[]; size: number; theme: string };

function generateGrid(size: number, theme: string): Puzzle {
  const words = THEMES[theme]!.filter((w) => w.length <= size).slice(0, 10);
  const grid: string[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => ""));
  const placed: Placed[] = [];
  for (const word of words) {
    let ok = false;
    for (let attempt = 0; attempt < 300 && !ok; attempt++) {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)]!;
      const [dr, dc] = dir;
      const r0 = Math.floor(Math.random() * size);
      const c0 = Math.floor(Math.random() * size);
      const cells: Cell[] = [];
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dr * i;
        const c = c0 + dc * i;
        if (r < 0 || r >= size || c < 0 || c >= size) { fits = false; break; }
        const g = grid[r]![c];
        if (g !== "" && g !== word[i]) { fits = false; break; }
        cells.push({ r, c });
      }
      if (fits) {
        cells.forEach((cell, i) => { grid[cell.r]![cell.c] = word[i]!; });
        placed.push({ word, cells });
        ok = true;
      }
    }
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r]![c] === "") grid[r]![c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
  }
  return { grid, placed, size, theme };
}

function lineCells(a: Cell, b: Cell): Cell[] {
  const dr = Math.sign(b.r - a.r);
  const dc = Math.sign(b.c - a.c);
  const rd = Math.abs(b.r - a.r);
  const cd = Math.abs(b.c - a.c);
  if (!((dr === 0 || dc === 0) || rd === cd)) return [a];
  const len = Math.max(rd, cd);
  return Array.from({ length: len + 1 }, (_, i) => ({ r: a.r + dr * i, c: a.c + dc * i }));
}

const key = (r: number, c: number) => `${r},${c}`;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function WordSearchTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("word-search-game", isPro);
  const seo = getToolSeo("word-search-game");

  const [theme, setTheme] = useState("Animals");
  const [size, setSize] = useState<(typeof SIZES)[number]>(10);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [sel, setSel] = useState<Cell[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [won, setWon] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const draggingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    },
    [],
  );

  const newPuzzle = useCallback(
    (th?: string, sz?: (typeof SIZES)[number]) => {
      if (!trial.canUse) return;
      trial.recordUse();
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      const t = th ?? theme;
      const s = sz ?? size;
      setPuzzle(generateGrid(s, t));
      setSel([]);
      setFound(new Set());
      setWon(false);
      setRevealed(false);
      setElapsed(0);
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 500);
    },
    [trial, theme, size],
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cellFromEvent = (e: React.PointerEvent): Cell | null => {
    const el = (e.target as HTMLElement).closest("[data-r]");
    if (!el) return null;
    const r = el.getAttribute("data-r");
    const c = el.getAttribute("data-c");
    if (r === null || c === null) return null;
    return { r: Number(r), c: Number(c) };
  };

  const handleDown = (e: React.PointerEvent) => {
    if (!puzzle || won || revealed) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    draggingRef.current = true;
    setSel([cell]);
  };

  const handleOver = (e: React.PointerEvent) => {
    if (!draggingRef.current || !puzzle) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    setSel((prev) => (prev.length === 0 ? [cell] : lineCells(prev[0]!, cell)));
  };

  const handleUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (!puzzle) return;
    setSel((current) => {
      if (current.length < 2) return [];
      const word = current.map((cell) => puzzle.grid[cell.r]![cell.c]).join("");
      const rev = [...word].reverse().join("");
      const match = puzzle.placed.find((p) => p.word === word || p.word === rev);
      if (match && !found.has(match.word)) {
        const next = new Set(found);
        next.add(match.word);
        setFound(next);
        if (next.size === puzzle.placed.length) {
          stopTimer();
          setWon(true);
          toast.success(`Solved in ${formatTime(elapsed)} - nice work!`);
        } else {
          toast.success(`Found "${match.word}"`);
        }
      }
      return [];
    });
  }, [puzzle, found, stopTimer, elapsed]);

  const reveal = useCallback(() => {
    stopTimer();
    setRevealed(true);
    toast.info("Solution revealed - generate a new puzzle to play again.");
  }, [stopTimer]);

  const foundCells = new Set<string>();
  if (puzzle) {
    for (const p of puzzle.placed) {
      if (found.has(p.word) || revealed) p.cells.forEach((c) => foundCells.add(key(c.r, c.c)));
    }
  }
  const selKeys = new Set(sel.map((c) => key(c.r, c.c)));

  return (
    <ToolPageShell toolId="word-search-game" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Word Search" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="h-fit space-y-5 rounded-2xl border border-border bg-card p-5 print:hidden">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Theme</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(THEMES).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-bold transition",
                    theme === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Grid size</p>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition",
                    size === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}x{s}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={false} disabled={!trial.canUse} onClick={() => newPuzzle()}>
            <RefreshCw className="h-4 w-4" /> New puzzle
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free puzzles left.
            </p>
          )}

          {puzzle && (
            <>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm font-bold">
                  {found.size}/{puzzle.placed.length} found
                </span>
                <span className="text-sm font-bold text-primary">{formatTime(elapsed)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {puzzle.placed.map((p) => (
                  <span
                    key={p.word}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide",
                      found.has(p.word) || revealed
                        ? "bg-emerald-500/15 text-emerald-600 line-through dark:text-emerald-400"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {p.word}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                {!won && !revealed && (
                  <button
                    type="button"
                    onClick={reveal}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
                  >
                    <Eye className="h-4 w-4" /> Reveal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!puzzle ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="font-semibold">No puzzle yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a theme and grid size, then hit New puzzle. Drag across letters to find the hidden words.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {won && (
                <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Puzzle solved in {formatTime(elapsed)}! Generate a new one to keep playing.
                </div>
              )}
              <div
                onPointerDown={handleDown}
                onPointerOver={handleOver}
                onPointerUp={handleUp}
                onPointerLeave={handleUp}
                style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`, touchAction: "none" }}
                className="mx-auto grid w-full max-w-[560px] select-none gap-0.5 print:max-w-none"
              >
                {puzzle.grid.map((row, r) =>
                  row.map((letter, c) => {
                    const k = key(r, c);
                    const isFound = foundCells.has(k);
                    const isSel = selKeys.has(k);
                    return (
                      <div
                        key={k}
                        data-r={r}
                        data-c={c}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-md font-mono font-bold",
                          puzzle.size >= 12 ? "text-xs sm:text-sm" : "text-sm sm:text-base",
                          isFound && "bg-emerald-500/25 text-emerald-700 dark:text-emerald-300",
                          isSel && !isFound && "bg-primary/30",
                          !isFound && !isSel && "bg-muted/60",
                        )}
                      >
                        {letter}
                      </div>
                    );
                  }),
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground print:hidden">
                Click or touch a letter and drag across the word. Words run in all 8 directions.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
