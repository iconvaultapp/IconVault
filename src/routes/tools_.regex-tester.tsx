// /tools/regex-tester - test regular expressions live in the browser,
// with match highlighting and captured-group inspection. 100% client-side.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/regex-tester")({
  head: () => {
    const seo = getToolSeoMeta("regex-tester");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: RegexTesterTool,
});

const ALL_FLAGS = ["g", "i", "m", "s", "u", "y"] as const;
const FLAG_TIPS: Record<string, string> = {
  g: "Global - find all matches",
  i: "Ignore case",
  m: "Multiline - ^ and $ match line ends",
  s: "Dotall - . matches newlines",
  u: "Unicode",
  y: "Sticky",
};

/** Cheat-sheet tokens: clicking one appends it to the pattern. */
const CHEAT_SHEET: { token: string; label: string }[] = [
  { token: "\\d", label: "digit" },
  { token: "\\D", label: "non-digit" },
  { token: "\\w", label: "word char" },
  { token: "\\W", label: "non-word char" },
  { token: "\\s", label: "whitespace" },
  { token: "\\S", label: "non-whitespace" },
  { token: ".", label: "any char" },
  { token: "*", label: "zero or more" },
  { token: "+", label: "one or more" },
  { token: "?", label: "zero or one" },
  { token: "^", label: "start of string" },
  { token: "$", label: "end of string" },
  { token: "[]", label: "character class" },
  { token: "()", label: "group" },
  { token: "{}", label: "quantifier" },
  { token: "|", label: "alternation" },
  { token: "\\b", label: "word boundary" },
  { token: "\\n", label: "newline" },
  { token: "\\t", label: "tab" },
];

/** Encode {pattern, flags, testText} for a shareable #r= URL hash (base64url). */
function encodeShare(data: { pattern: string; flags: string[]; testText: string }): string {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decode a #r= hash back into {pattern, flags, testText}; null if malformed. */
function decodeShare(hash: string): { pattern: string; flags: string[]; testText: string } | null {
  try {
    const b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json) as { pattern?: unknown; flags?: unknown; testText?: unknown };
    return {
      pattern: typeof data.pattern === "string" ? data.pattern : "",
      flags: Array.isArray(data.flags)
        ? data.flags.filter((f): f is (typeof ALL_FLAGS)[number] =>
            typeof f === "string" && (ALL_FLAGS as readonly string[]).includes(f),
          )
        : [],
      testText: typeof data.testText === "string" ? data.testText : "",
    };
  } catch {
    return null; // malformed hash - ignore
  }
}

interface Seg {
  text: string;
  match: boolean;
}

function buildSegs(input: string, matches: RegExpExecArray[]): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  for (const m of matches) {
    if (m.index > last) segs.push({ text: input.slice(last, m.index), match: false });
    segs.push({ text: m[0], match: true });
    last = m.index + m[0].length;
  }
  if (last < input.length) segs.push({ text: input.slice(last), match: false });
  return segs;
}

const SAMPLE_PATTERN = "\\b[\\w.-]+@[\\w.-]+\\.\\w{2,}\\b";
const SAMPLE_TEXT = "Contact jane.doe@example.com or support@iconvault.site - not a real address@, ignore that one.";

function RegexTesterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("regex-tester", isPro);
  const seo = getToolSeo("regex-tester");

  const [pattern, setPattern] = useState(SAMPLE_PATTERN);
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [testText, setTestText] = useState(SAMPLE_TEXT);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [matches, setMatches] = useState<RegExpExecArray[]>([]);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replacement, setReplacement] = useState("$1");
  const [replaced, setReplaced] = useState<string | null>(null);
  const [copiedReplace, setCopiedReplace] = useState(false);
  const [cheatFilter, setCheatFilter] = useState("");

  // Restore a shared state from the URL hash (e.g. a link someone sent you).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.startsWith("#r=")) {
      const shared = decodeShare(window.location.hash.slice(3));
      if (shared) {
        setPattern(shared.pattern);
        setFlags(shared.flags);
        setTestText(shared.testText);
      }
    }
  }, []);

  const toggleFlag = (f: string) =>
    setFlags((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const runTest = () => {
    if (!trial.canUse) return;
    setError(null);
    try {
      new RegExp(pattern, flags.join("")); // validate first
      const scanFlags = flags.includes("g") ? flags.join("") : `${flags.join("")}g`;
      const re = new RegExp(pattern, scanFlags);
      const found: RegExpExecArray[] = [];
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(testText)) !== null && guard < 1000) {
        found.push(m);
        guard++;
        if (m[0].length === 0) re.lastIndex++;
      }
      const limited = found.slice(0, 20);
      setMatches(limited);
      setSegs(buildSegs(testText, limited));
      setTested(true);
      trial.recordUse();
    } catch (e) {
      setMatches([]);
      setSegs([]);
      setTested(false);
      setError(e instanceof Error ? e.message : "Invalid regular expression.");
    }
  };

  const runReplace = () => {
    if (!trial.canUse) return;
    setError(null);
    try {
      const re = new RegExp(pattern, flags.join(""));
      const out = testText.replace(re, replacement);
      setReplaced(out);
      setTested(false);
      trial.recordUse();
      toast.success("Replacement applied.");
    } catch (e) {
      setReplaced(null);
      setError(e instanceof Error ? e.message : "Invalid regular expression.");
    }
  };

  const copyPattern = () => {
    navigator.clipboard
      .writeText(`/${pattern}/${flags.join("")}`)
      .then(() => toast.success("Pattern copied"))
      .catch(() => toast.error("Copy failed"));
  };

  const copyShareLink = () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#r=${encodeShare({ pattern, flags, testText })}`;
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Share link copied to clipboard"))
        .catch(() => toast.error("Copy failed"));
    } catch {
      toast.error("Could not build share link.");
    }
  };

  const q = cheatFilter.trim().toLowerCase();
  const filteredCheats = CHEAT_SHEET.filter(
    (c) => c.label.includes(q) || c.token.toLowerCase().includes(q),
  );

  return (
    <ToolPageShell toolId="regex-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Regex Tester" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Pattern</span>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="\d+"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </label>

          <div>
            <span className="mb-2 block text-[13px] font-medium text-foreground/80">Flags</span>
            <div className="flex flex-wrap gap-2">
              {ALL_FLAGS.map((f) => (
                <label
                  key={f}
                  title={FLAG_TIPS[f]}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-sm transition ${
                    flags.includes(f)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <input type="checkbox" checked={flags.includes(f)} onChange={() => toggleFlag(f)} className="sr-only" />
                  {f}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Hover a flag to see what it does.</p>
          </div>

          <details className="rounded-xl border border-border/70 bg-background/60">
            <summary className="cursor-pointer select-none px-3.5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Cheat sheet
            </summary>
            <div className="border-t border-border/70 p-3.5">
              <input
                value={cheatFilter}
                onChange={(e) => setCheatFilter(e.target.value)}
                placeholder="Filter tokens… (e.g. digit, word, whitespace)"
                className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
              <div className="flex flex-wrap gap-1.5">
                {filteredCheats.map((c) => (
                  <button
                    key={c.token}
                    type="button"
                    title={c.label}
                    onClick={() => setPattern((p) => p + c.token)}
                    className="rounded-lg border border-border px-2 py-1 font-mono text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  >
                    {c.token}
                  </button>
                ))}
              </div>
              {filteredCheats.length === 0 && (
                <p className="text-xs text-muted-foreground">No tokens match that filter.</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Click a token to append it to the pattern.</p>
            </div>
          </details>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Test string</span>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder="Paste or type the text to test against…"
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton disabled={!pattern || !trial.canUse} onClick={runTest}>
              <FlaskConical className="h-4 w-4" /> Test
            </ActionButton>
            <button
              type="button" onClick={copyPattern}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              Copy /pattern/flags
            </button>
            <button
              type="button" onClick={copyShareLink}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              Copy share link
            </button>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                Replacement string <span className="font-normal text-muted-foreground">($1, $2 for captured groups)</span>
              </span>
              <input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                spellCheck={false}
                placeholder="$1"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ActionButton busy={false} disabled={!pattern || !trial.canUse} onClick={runReplace}>
                Replace
              </ActionButton>
              {replaced !== null && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(replaced)
                      .then(() => { setCopiedReplace(true); setTimeout(() => setCopiedReplace(false), 1500); })
                      .catch(() => toast.error("Copy failed"));
                  }}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground"
                >
                  {copiedReplace ? "Copied ✓" : "Copy result"}
                </button>
              )}
            </div>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free tests left - everything runs in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4">
          {replaced !== null ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-sm font-bold">Replacement result</p>
              <div className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
                {replaced.length === 0 ? <span className="text-muted-foreground">Result is empty.</span> : replaced}
              </div>
              <button
                type="button"
                onClick={() => { setReplaced(null); setTested(false); }}
                className="mt-3 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Back to match view
              </button>
            </div>
          ) : !tested ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 text-center">
              <FlaskConical className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Matches appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Matches are highlighted in your text, with captured groups listed below.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-sm font-bold">
                  {matches.length} match{matches.length === 1 ? "" : "es"}
                  <span className="font-normal text-muted-foreground"> - showing first 20</span>
                </p>
                <div className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
                  {segs.length === 0 && <span className="text-muted-foreground">No matches found.</span>}
                  {segs.map((s, i) =>
                    s.match ? (
                      <mark key={i} className="rounded bg-primary/25 px-0.5 text-foreground">{s.text}</mark>
                    ) : (
                      <span key={i}>{s.text}</span>
                    ),
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-bold">Match details</h3>
                {matches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing to show - the pattern matched nothing.</p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-auto">
                    {matches.map((m, i) => (
                      <div key={i} className="rounded-xl bg-muted/60 px-3 py-2 text-xs">
                        <p className="font-mono font-bold">
                          #{i + 1} <span className="font-normal text-muted-foreground">@ index {m.index}</span>
                        </p>
                        <p className="mt-1 break-all font-mono text-muted-foreground">
                          full: <span className="text-foreground">{JSON.stringify(m[0])}</span>
                        </p>
                        {m.slice(1).map((g, gi) => (
                          <p key={gi} className="break-all font-mono text-muted-foreground">
                            group {gi + 1}: <span className="text-foreground">{JSON.stringify(g)}</span>
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
