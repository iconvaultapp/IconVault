// /tools/error-types-explorer - JS Error Types lab: trigger every built-in
// error for real, inspect Error.cause chains and AggregateError, and analyze
// stack traces frame by frame. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/error-types-explorer")({
  head: () => {
    const seo = getToolSeoMeta("error-types-explorer");
    const canonical = "https://iconvault.site/tools/error-types-explorer";
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
  component: ErrorTypesExplorer,
});

interface Demo {
  id: string;
  name: string;
  blurb: string;
  code: string;
  thrower: () => never;
}

const DEMOS: Demo[] = [
  {
    id: "type",
    name: "TypeError",
    blurb: "Operation on a value of the wrong type.",
    code: `const user = null;\nuser.name; // TypeError: Cannot read properties of null`,
    thrower: () => { (null as unknown as { name: string }).name; throw new Error("unreachable"); },
  },
  {
    id: "range",
    name: "RangeError",
    blurb: "Numeric value outside its allowed range.",
    code: `new Array(-1); // RangeError: Invalid array length`,
    thrower: () => { new Array(-1); throw new Error("unreachable"); },
  },
  {
    id: "reference",
    name: "ReferenceError",
    blurb: "Reading a variable that was never declared.",
    code: `console.log(totallyMissing); // ReferenceError: totallyMissing is not defined`,
    thrower: () => { Function("return totallyMissingVar")(); throw new Error("unreachable"); },
  },
  {
    id: "syntax",
    name: "SyntaxError",
    blurb: "Thrown while parsing invalid code or JSON.",
    code: `JSON.parse("{oops"); // SyntaxError: Unexpected token o in JSON`,
    thrower: () => { JSON.parse("{oops"); throw new Error("unreachable"); },
  },
  {
    id: "uri",
    name: "URIError",
    blurb: "Malformed escape sequences in encode/decodeURI.",
    code: `decodeURIComponent("%"); // URIError: URI malformed`,
    thrower: () => { decodeURIComponent("%"); throw new Error("unreachable"); },
  },
  {
    id: "eval",
    name: "EvalError",
    blurb: "Legacy misuse of eval(); rare in modern engines, still constructible.",
    code: `throw new EvalError("eval was misused");`,
    thrower: () => { throw new EvalError("eval was misused in legacy code"); },
  },
  {
    id: "cause",
    name: "Error.cause",
    blurb: "Chain errors: keep the original failure attached to the new one.",
    code: `try {\n  connectDb();\n} catch (err) {\n  throw new Error("DB unavailable", { cause: err });\n}`,
    thrower: () => {
      try {
        throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
      } catch (err) {
        throw new Error("Database unavailable", { cause: err });
      }
    },
  },
  {
    id: "aggregate",
    name: "AggregateError",
    blurb: "One error wrapping many, e.g. from Promise.any().",
    code: `try {\n  await Promise.any([p1, p2, p3]);\n} catch (agg) {\n  // agg instanceof AggregateError, agg.errors holds each one\n}`,
    thrower: () => {
      throw new AggregateError(
        [new TypeError("p1 rejected: bad type"), new RangeError("p2 rejected: out of range")],
        "All promises were rejected",
      );
    },
  },
];

interface Frame {
  fn: string;
  file: string;
  line: string;
  col: string;
}

function parseStack(stack: string): Frame[] {
  const frames: Frame[] = [];
  const re = /at\s+(?:(.*?)\s+\()?([^()\s]+):(\d+):(\d+)\)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stack)) !== null) {
    frames.push({ fn: m[1]?.trim() || "(anonymous)", file: m[2] ?? "", line: m[3] ?? "", col: m[4] ?? "" });
    if (frames.length >= 20) break;
  }
  return frames;
}

interface Analysis {
  name: string;
  message: string;
  frames: Frame[];
  causeChain: string[];
  aggregateCount: number | null;
}

function analyze(e: unknown): Analysis {
  const err = e as Error & { cause?: unknown; errors?: unknown[] };
  const causeChain: string[] = [];
  let c: unknown = err.cause;
  while (c instanceof Error && causeChain.length < 5) {
    causeChain.push(`${c.name}: ${c.message}`);
    c = (c as { cause?: unknown }).cause;
  }
  return {
    name: err.name || "Error",
    message: err.message || String(e),
    frames: parseStack(err.stack || ""),
    causeChain,
    aggregateCount: Array.isArray(err.errors) ? err.errors.length : null,
  };
}

function ErrorTypesExplorer() {
  const { isPro } = usePlan();
  const trial = useToolTrial("error-types-explorer", isPro);
  const seo = getToolSeo("error-types-explorer");

  const [active, setActive] = useState(DEMOS[0]?.id ?? "");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [paste, setPaste] = useState("");
  const [pastedFrames, setPastedFrames] = useState<Frame[] | null>(null);
  const demo = DEMOS.find((d) => d.id === active)!;

  const trigger = () => {
    if (!trial.canUse) return;
    try {
      demo.thrower();
    } catch (e) {
      setAnalysis(analyze(e));
      trial.recordUse();
    }
  };

  const analyzePaste = () => {
    const frames = parseStack(paste);
    setPastedFrames(frames);
    if (frames.length === 0) toast.error("No stack frames found in that text");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(demo.code);
      toast.success("Snippet copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const renderFrames = (frames: Frame[]) => (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 text-left text-muted-foreground">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">Function</th>
            <th className="px-3 py-2 font-semibold">File</th>
            <th className="px-3 py-2 font-semibold">Line</th>
          </tr>
        </thead>
        <tbody>
          {frames.map((f, i) => (
            <tr key={i} className={cn("border-t border-border", i === 0 && "bg-red-500/5")}>
              <td className="px-3 py-1.5 font-bold tabular-nums">{i}</td>
              <td className="px-3 py-1.5 font-mono">{f.fn}</td>
              <td className="max-w-[220px] truncate px-3 py-1.5 font-mono text-muted-foreground" title={f.file}>{f.file}</td>
              <td className="px-3 py-1.5 font-mono tabular-nums">{f.line}:{f.col}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <ToolPageShell toolId="error-types-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Error Types" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="px-1 pb-1 text-[13px] font-medium text-foreground/80">Trigger a real error</p>
          {DEMOS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => { setActive(d.id); setAnalysis(null); }}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-left transition",
                active === d.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
              )}
            >
              <p className="font-mono text-sm font-bold">{d.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{d.blurb}</p>
            </button>
          ))}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-mono text-lg font-bold">{demo.name}</h2>
              <p className="text-sm text-muted-foreground">{demo.blurb}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={copyCode} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50">
                <Copy className="h-4 w-4" /> Copy snippet
              </button>
              <ActionButton disabled={!trial.canUse} onClick={trigger}>
                <Play className="h-4 w-4" /> Throw it
              </ActionButton>
            </div>
          </div>

          <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed"><code>{demo.code}</code></pre>

          {analysis ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-mono text-sm font-bold text-red-500">{analysis.name}</p>
                  <p className="mt-0.5 text-sm">{analysis.message}</p>
                  {analysis.aggregateCount !== null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      AggregateError wraps <span className="font-bold text-foreground">{analysis.aggregateCount}</span> individual errors (check err.errors).
                    </p>
                  )}
                </div>
              </div>

              {analysis.causeChain.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Cause chain</p>
                  <ol className="space-y-1.5">
                    {analysis.causeChain.map((c, i) => (
                      <li key={i} className="rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs">
                        <span className="mr-2 font-bold text-muted-foreground">cause {i + 1}</span>{c}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold">
                  Stack analysis <span className="font-normal text-muted-foreground">({analysis.frames.length} frames, frame 0 is the throw site)</span>
                </p>
                {analysis.frames.length > 0 ? renderFrames(analysis.frames) : (
                  <p className="text-xs text-muted-foreground">No parseable frames in this stack.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Press "Throw it" to catch a real {demo.name} and dissect its stack.
            </div>
          )}

          <div className="border-t border-border pt-5">
            <h2 className="mb-2 text-sm font-semibold">Analyze your own stack trace</h2>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={4}
              placeholder={"Paste a stack trace, e.g.\nTypeError: Cannot read properties of null\n    at fetchUser (app.js:12:5)\n    at main (app.js:30:3)"}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs"
            />
            <button type="button" onClick={analyzePaste} className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              Parse stack
            </button>
            {pastedFrames && (
              <div className="mt-3">
                {pastedFrames.length > 0 ? renderFrames(pastedFrames) : (
                  <p className="text-xs text-muted-foreground">Nothing parseable found.</p>
                )}
              </div>
            )}
          </div>

          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free throws left.</p>}
        </div>
      </div>
    </ToolPageShell>
  );
}
