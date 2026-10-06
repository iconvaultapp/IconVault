// /tools/team-randomizer - Split a name list into fair random teams.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/team-randomizer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/team-randomizer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/team-randomizer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/team-randomizer";
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
  component: TeamRandomizerTool,
});

const HISTORY_KEY = "iconvault-team-history";

/** Seeded PRNG so a split can be reproduced from its seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function loadPastSigs(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function TeamRandomizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("team-randomizer", isPro);
  const seo = toolSeo;

  const [namesText, setNamesText] = useState("");
  const [mode, setMode] = useState<"count" | "size">("count");
  const [n, setN] = useState(2);
  const [avoidRepeat, setAvoidRepeat] = useState(true);
  const [teams, setTeams] = useState<string[][] | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const names = useMemo(
    () => namesText.split(/\r?\n/).map((s) => s.trim()).filter((s) => s.length > 0),
    [namesText],
  );

  const teamCount = useMemo(() => {
    if (mode === "count") return n;
    return Math.max(2, Math.ceil(names.length / Math.max(1, n)));
  }, [mode, n, names.length]);

  const signature = (ts: string[][]) =>
    ts.map((t) => [...t].sort().join("|")).sort().join("||");

  const randomize = useCallback(() => {
    if (!trial.canUse) return;
    setError(null);
    if (names.length < 2) {
      setError("Add at least 2 names, one per line.");
      return;
    }
    const tc = mode === "count" ? n : Math.max(2, Math.ceil(names.length / Math.max(1, n)));
    if (mode === "count" && n > names.length) {
      setError(`You have ${names.length} names but asked for ${n} teams.`);
      return;
    }
    if (mode === "size" && n > names.length) {
      setError(`Team size ${n} is larger than your ${names.length} names.`);
      return;
    }
    trial.recordUse();
    const past = avoidRepeat ? loadPastSigs() : [];
    let finalTeams: string[][] = [];
    let finalSeed = Date.now();
    for (let attempt = 0; attempt < 60; attempt++) {
      const s = Date.now() + attempt * 997;
      const order = seededShuffle(names, s);
      const ts: string[][] = Array.from({ length: tc }, () => []);
      order.forEach((name, i) => ts[i % tc]!.push(name));
      if (!avoidRepeat || !past.includes(signature(ts))) {
        finalTeams = ts;
        finalSeed = s;
        break;
      }
      finalTeams = ts;
      finalSeed = s;
    }
    if (avoidRepeat) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify([signature(finalTeams), ...past].slice(0, 25)));
      } catch { /* storage full */ }
    }
    setTeams(finalTeams);
    setSeed(finalSeed);
  }, [trial, names, mode, n, avoidRepeat]);

  const copyTeams = useCallback(async () => {
    if (!teams) return;
    const text = teams
      .map((t, i) => `Team ${i + 1} (${t.length}): ${t.join(", ")}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Teams copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [teams]);

  return (
    <ToolPageShell toolId="team-randomizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Team Randomizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Names (one per line)</p>
              <p className="text-xs text-muted-foreground">{names.length} names</p>
            </div>
            <textarea
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              rows={10}
              placeholder={"Aarav\nDiya\nKabir\nMeera\n…"}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/60"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Split by</p>
              <div className="flex gap-2">
                {(["count", "size"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                      mode === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {m === "count" ? "Team count" : "Team size"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">
                {mode === "count" ? "Number of teams" : "Players per team"}
              </p>
              <input
                type="number"
                min={2}
                max={100}
                value={n}
                onChange={(e) => setN(Math.max(2, Number(e.target.value) || 2))}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold outline-none focus:border-primary/60"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {names.length >= 2 ? `That makes ${teamCount} teams.` : "Add names to preview the split."}
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              checked={avoidRepeat}
              onChange={(e) => setAvoidRepeat(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              <span className="text-sm font-bold text-foreground">Avoid repeating recent splits</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Won't reuse a team combination from your recent randomizations on this device.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton busy={false} disabled={!trial.canUse || names.length < 2} onClick={randomize}>
              <Shuffle className="h-4 w-4" /> Randomize teams
            </ActionButton>
            {!isPro && (
              <p className="ml-auto text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free randomizations left.
              </p>
            )}
          </div>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Teams</h2>
            {teams && (
              <button
                type="button"
                onClick={copyTeams}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:border-primary/40"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            )}
          </div>
          {!teams ? (
            <p className="text-sm text-muted-foreground">
              Your teams appear here. Everyone gets dealt round-robin, so teams stay as even as possible.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {teams.map((t, i) => (
                  <div key={i} className="rounded-xl bg-muted/50 p-3">
                    <p className="mb-1.5 text-sm font-bold text-primary">
                      Team {i + 1} <span className="font-semibold text-muted-foreground">({t.length})</span>
                    </p>
                    <ul className="space-y-0.5">
                      {t.map((name, j) => (
                        <li key={j} className="text-sm text-foreground">{name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {seed !== null && (
                <p className="text-xs text-muted-foreground">
                  Seed {seed} - same seed, same teams. Reproducible and fair.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
