// /tools/regex-replace - Find/replace with regex, $1 backreferences, live highlighted diff.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/regex-replace")({
  head: () => {
    const seo = getToolSeoMeta("regex-replace");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: RegexReplaceTool,
});

const VALID_FLAGS = /^[gimsuy]*$/;

/** Apply a JS replacement string ($1, $&, $$, $`, $') to one match. */
function applyReplacement(rep: string, match: string, groups: (string | undefined)[], offset: number, full: string): string {
  return rep.replace(/\$(\$|&|`|'|\d{1,2})/g, (m, tok: string) => {
    if (tok === "$") return "$";
    if (tok === "&") return match;
    if (tok === "`") return full.slice(0, offset);
    if (tok === "'") return full.slice(offset + match.length);
    const n = parseInt(tok, 10);
    if (n >= 1 && n <= 9) return groups[n - 1] ?? "";
    // $10+: group 10 if it exists, else $1 followed by "0"
    const two = groups[n - 1];
    if (two !== undefined) return two;
    return (groups[0] ?? "") + tok.slice(1);
  });
}

type Seg = { text: string; replaced: boolean };

function compute(pattern: string, flags: string, replacement: string, input: string):
  | { ok: true; segs: Seg[]; count: number; output: string }
  | { ok: false; error: string } {
  if (!VALID_FLAGS.test(flags)) return { ok: false, error: "Flags may only contain g, i, m, s, u, y." };
  let re: RegExp;
  try {
    re = new RegExp(pattern || "(?:)", flags.includes("g") ? flags : flags + "g");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid pattern" };
  }
  const segs: Seg[] = [];
  let count = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(input)) && guard++ < 2000) {
    if (m.index > last) segs.push({ text: input.slice(last, m.index), replaced: false });
    if (m[0].length === 0) {
      // zero-length match: still consumes one position, replacement inserted
      const rep = applyReplacement(replacement, m[0], m.slice(1), m.index, input);
      if (rep) { segs.push({ text: rep, replaced: true }); count++; }
      re.lastIndex++;
      last = m.index;
      continue;
    }
    const rep = applyReplacement(replacement, m[0], m.slice(1), m.index, input);
    segs.push({ text: rep, replaced: true });
    count++;
    last = m.index + m[0].length;
  }
  if (last < input.length) segs.push({ text: input.slice(last), replaced: false });
  return { ok: true, segs, count, output: segs.map((s) => s.text).join("") };
}

function RegexReplaceTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("regex-replace", isPro);
  const seo = getToolSeo("regex-replace");

  const [pattern, setPattern] = useState("(\\w+)@(\\w+)");
  const [flags, setFlags] = useState("g");
  const [replacement, setReplacement] = useState("$2 at $1 dot com");
  const [input, setInput] = useState("Contact john@example and jane@test for details.");

  const result = useMemo(() => compute(pattern, flags, replacement, input), [pattern, flags, replacement, input]);

  const copy = async () => {
    if (!trial.canUse || !result.ok) return;
    try {
      await navigator.clipboard.writeText(result.output);
      trial.recordUse();
      toast.success("Result copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="regex-replace" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Regex Replace" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_120px]">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-foreground/80">Find pattern</label>
              <div className="flex items-center rounded-xl border border-border bg-background px-3 focus-within:border-primary/60">
                <span className="font-mono text-lg text-muted-foreground">/</span>
                <input
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  spellCheck={false}
                  className="w-full bg-transparent px-1 py-2.5 font-mono text-sm outline-none"
                />
                <span className="font-mono text-lg text-muted-foreground">/</span>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-medium text-foreground/80">Flags</label>
              <input
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                spellCheck={false}
                maxLength={6}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">
              Replacement <span className="font-normal text-muted-foreground">- $1, $2 for groups, $& for the whole match, $$ for a literal $</span>
            </label>
            <input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Input text</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Result
              {result.ok && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {result.count} replacement{result.count === 1 ? "" : "s"}
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse || !result.ok}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary/50 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy result
            </button>
          </div>
          {!result.ok ? (
            <p className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm font-medium text-red-500">{result.error}</p>
          ) : result.segs.length === 0 ? (
            <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">Type some input text above.</p>
          ) : (
            <div className={cn("whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed")}>
              {result.segs.map((s, i) =>
                s.replaced ? (
                  <mark key={i} className="rounded bg-green-500/25 px-0.5 font-semibold text-foreground" title="Replaced">{s.text}</mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </div>
          )}
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - green highlights show what was replaced.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
