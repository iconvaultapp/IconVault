// /tools/js-error-trace - Run code in a sandboxed iframe, catch the real error,
// parse its stack trace and watch it unwind through the call stack.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-error-trace";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-error-trace";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-error-trace")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-error-trace";
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
  component: ErrorTraceTool,
});

/* Same sandboxed runner as js-class-features: an allow-scripts iframe, no
   Function constructor, results posted back over postMessage. */
const SRCDOC = `<!doctype html><html><body><script>
var logs = [];
function fmt(v){ try { return typeof v === "string" ? v : JSON.stringify(v); } catch (e) { return String(v); } }
["log","info","warn","error"].forEach(function(k){ console[k] = function(){ logs.push(Array.prototype.map.call(arguments, fmt).join(" ")); }; });
var posted = false, curId = 0;
function done(err){ if (posted) return; posted = true; parent.postMessage({ type: "iv-result", id: curId, logs: logs.slice(), error: err || null }, "*"); }
window.addEventListener("error", function(e){
  var stack = e.error && e.error.stack ? String(e.error.stack).split("\\n").slice(0, 10).join("\\n") : e.message;
  done("Uncaught " + stack);
});
window.addEventListener("unhandledrejection", function(e){
  var r = e.reason;
  var stack = r && r.stack ? String(r.stack).split("\\n").slice(0, 10).join("\\n") : String(r);
  done("Unhandled rejection: " + stack);
});
window.addEventListener("message", function(e){
  var d = e.data || {};
  if (d.type !== "iv-run" || typeof d.code !== "string") return;
  curId = d.id; posted = false; logs.length = 0;
  var s = document.createElement("script");
  s.textContent = d.code;
  document.body.appendChild(s);
  s.remove();
  setTimeout(function(){ done(null); }, 60);
});
<\/script></body></html>`;

interface RunResult { logs: string[]; error: string | null }

function useSandbox() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pending = useRef(new Map<number, (r: RunResult) => void>());
  const idRef = useRef(0);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; id?: number; logs?: string[]; error?: string | null } | null;
      if (!d || d.type !== "iv-result" || typeof d.id !== "number") return;
      const resolve = pending.current.get(d.id);
      if (resolve) {
        pending.current.delete(d.id);
        resolve({ logs: d.logs ?? [], error: d.error ?? null });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const run = (code: string): Promise<RunResult> =>
    new Promise((resolve) => {
      const id = ++idRef.current;
      pending.current.set(id, resolve);
      iframeRef.current?.contentWindow?.postMessage({ type: "iv-run", id, code }, "*");
      setTimeout(() => {
        if (pending.current.has(id)) {
          pending.current.delete(id);
          resolve({ logs: [], error: "Sandbox timed out." });
        }
      }, 5000);
    });

  return { iframeRef, run };
}

interface Scenario {
  id: string;
  name: string;
  blurb: string;
  code: string;
  /** Index (from the outermost frame) where a catch handles it; -1 = uncaught. */
  caughtAt: number;
  catchNote: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "nested",
    name: "Nested throw, caught",
    blurb: "A TypeError thrown three calls deep unwinds until main() catches it.",
    caughtAt: 0,
    catchNote: "main() has a try/catch: the error is handled and the program continues.",
    code: `function loadUser(id) {
  const user = fetchUser(id); // returns undefined
  return user.name;           // TypeError: cannot read properties of undefined
}

function fetchUser(id) {
  // pretend the database lookup failed
  return undefined;
}

function main() {
  try {
    const name = loadUser(42);
    console.log("Hello", name);
  } catch (e) {
    console.log("caught in main:", e.constructor.name, "-", e.message);
  }
}

main();
console.log("program keeps running");`,
  },
  {
    id: "uncaught",
    name: "Uncaught error",
    blurb: "No handler anywhere: the whole stack unwinds and the error escapes to the page.",
    caughtAt: -1,
    catchNote: "Nothing caught it. In a real page this would surface as an uncaught error in the console.",
    code: `function validate(input) {
  if (input.length < 3) throw new RangeError("input too short");
}

function handleSubmit(value) {
  validate(value);
  console.log("submitted:", value);
}

function onClick() {
  handleSubmit("ab");
}

onClick();`,
  },
  {
    id: "rethrow",
    name: "Catch and rethrow",
    blurb: "A middle frame logs context, then rethrows so an outer handler can decide.",
    caughtAt: 0,
    catchNote: "main() finally catches the rethrown error after fetchUser() added context.",
    code: `function query(sql) {
  throw new Error("connection refused");
}

function fetchUser(id) {
  try {
    return query("SELECT * FROM users WHERE id = " + id);
  } catch (e) {
    console.log("fetchUser saw:", e.message, "- adding context and rethrowing");
    throw e;
  }
}

function main() {
  try {
    fetchUser(42);
  } catch (e) {
    console.log("main caught:", e.message);
  }
}

main();`,
  },
  {
    id: "async",
    name: "Async boundary",
    blurb: "A throw inside setTimeout loses the original call stack: only the callback frame remains.",
    caughtAt: -1,
    catchNote: "The try/catch around setTimeout cannot help: by the time the callback runs, main() has already returned.",
    code: `function risky() {
  throw new TypeError("boom inside a timer");
}

function schedule() {
  try {
    setTimeout(risky, 10);
  } catch (e) {
    console.log("this catch never fires");
  }
}

schedule();
console.log("schedule() returned already");`,
  },
  {
    id: "promise",
    name: "Rejected promise",
    blurb: "An unhandled rejection travels the promise chain instead of the call stack.",
    caughtAt: -1,
    catchNote: "Unhandled promise rejection: attach .catch() or the error is reported to the host, not thrown to a caller.",
    code: `function fetchProfile() {
  return Promise.reject(new Error("profile not found"));
}

async function showProfile() {
  const profile = await fetchProfile(); // rejection resumes here as a throw
  console.log(profile);
}

showProfile();
console.log("showProfile() returned a pending promise");`,
  },
];

interface Frame { name: string; loc: string }

function parseStack(errorText: string): { type: string; message: string; frames: Frame[] } {
  const first = errorText.split("\n")[0] ?? "";
  const clean = first.replace(/^(Uncaught|Unhandled rejection:\s*)/, "").trim();
  const colon = clean.indexOf(":");
  const type = colon > 0 ? clean.slice(0, colon).trim() : "Error";
  const message = colon > 0 ? clean.slice(colon + 1).trim() : clean;
  const frames: Frame[] = [];
  for (const line of errorText.split("\n").slice(1)) {
    const m = line.match(/at\s+(.+?)\s+\((.+?)\)/) ?? line.match(/at\s+(.+)/);
    if (!m) continue;
    const name = (m[1] ?? "anonymous").replace(/^Object\./, "").trim();
    const loc = m[2] ? m[2].split("/").pop() ?? "" : "";
    if (/iv-result|srcdoc|message/.test(loc) && /anonymous|done|onMsg/.test(name)) continue;
    frames.push({ name: name || "anonymous", loc });
  }
  return { type, message, frames };
}

interface AnimStep { phase: "call" | "throw" | "unwind" | "caught"; depth: number; note: string }

function buildAnimation(frames: Frame[], caughtAt: number, catchNote: string): AnimStep[] {
  const steps: AnimStep[] = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    steps.push({
      phase: "call",
      depth: i,
      note: i === 0 ? `${f.name}() starts running` : `${frames[i - 1]!.name}() calls ${f.name}()`,
    });
  }
  if (frames.length > 0) {
    steps.push({
      phase: "throw",
      depth: frames.length - 1,
      note: `${frames[frames.length - 1]!.name}() throws`,
    });
    for (let i = frames.length - 1; i >= 0; i--) {
      const f = frames[i]!;
      if (i === caughtAt) {
        steps.push({ phase: "caught", depth: i, note: `${f.name}() catches it. ${catchNote}` });
        break;
      }
      steps.push({
        phase: "unwind",
        depth: i,
        note: i === 0 ? `${f.name}() has no handler: the error escapes uncaught` : `${f.name}() has no handler: unwinding`,
      });
    }
  }
  return steps;
}

function ErrorTraceTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-error-trace", isPro);
  const seo = toolSeo;

  const [active, setActive] = useState(SCENARIOS[0]!);
  const [code, setCode] = useState(SCENARIOS[0]!.code);
  const [running, setRunning] = useState(false);
  const [parsed, setParsed] = useState<{ type: string; message: string; frames: Frame[] } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [steps, setSteps] = useState<AnimStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { iframeRef, run } = useSandbox();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setStepIdx((s) => {
          if (s + 1 >= steps.length) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 1100);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, steps.length]);

  const pick = (s: Scenario) => {
    setActive(s);
    setCode(s.code);
    setParsed(null);
    setSteps([]);
    setStepIdx(0);
    setPlaying(false);
    setLogs([]);
  };

  const trace = async () => {
    if (running || !trial.canUse) return;
    setRunning(true);
    setParsed(null);
    setSteps([]);
    setStepIdx(0);
    setPlaying(false);
    try {
      const res = await run(code);
      setLogs(res.logs);
      if (!res.error) {
        toast.success("No error thrown - try code that throws");
        trial.recordUse();
        return;
      }
      const p = parseStack(res.error);
      setParsed(p);
      const anim = buildAnimation(p.frames, active.caughtAt, active.catchNote);
      setSteps(anim);
      setPlaying(true);
      trial.recordUse();
    } finally {
      setRunning(false);
    }
  };

  const cur = steps[stepIdx];
  const maxDepth = parsed ? parsed.frames.length - 1 : 0;

  const visibleDepth = cur
    ? cur.phase === "call"
      ? cur.depth
      : cur.phase === "throw"
        ? cur.depth
        : cur.phase === "unwind"
          ? cur.depth - 1
          : cur.depth
    : -1;

  return (
    <ToolPageShell toolId="js-error-trace" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Error Trace" left={trial.left} />
      <iframe ref={iframeRef} sandbox="allow-scripts" srcDoc={SRCDOC} title="code sandbox" className="hidden" />

      <div className="mb-5 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              active.id === s.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 font-extrabold">{active.name}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{active.blurb}</p>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={16}
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-zinc-950 p-3 font-mono text-[12.5px] leading-relaxed text-zinc-200"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton busy={running} disabled={!trial.canUse} onClick={trace}>
              <Play className="h-4 w-4" /> {running ? "Tracing…" : "Run error trace"}
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free traces left.
              </p>
            )}
          </div>
          {logs.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">console</p>
              <div className="space-y-1">
                {logs.map((l, i) => (
                  <pre key={i} className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-2.5 font-mono text-xs text-zinc-200">
                    {l}
                  </pre>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">Call stack trace</h2>
            {steps.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStepIdx(0); setPlaying(true); }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-primary/40"
                  aria-label="Replay"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          {!parsed ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Play className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">No trace yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Run the trace. Your code executes in a sandboxed iframe and the real stack is animated here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-red-500/10 p-3">
                <p className="font-mono text-sm font-extrabold text-red-500">{parsed.type}</p>
                <p className="mt-0.5 font-mono text-xs text-red-400">{parsed.message}</p>
              </div>

              {cur && (
                <div className={cn(
                  "rounded-xl border p-3 text-sm font-semibold",
                  cur.phase === "throw" && "border-red-500/50 bg-red-500/5",
                  cur.phase === "caught" && "border-emerald-500/50 bg-emerald-500/5",
                  (cur.phase === "call" || cur.phase === "unwind") && "border-amber-500/40 bg-amber-500/5",
                )}>
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{cur.phase}</span>
                  {cur.note}
                </div>
              )}

              <div className="space-y-1.5">
                {parsed.frames.map((f, i) => {
                  const isActive = i <= visibleDepth;
                  const isThrower = cur?.phase === "throw" && i === cur.depth;
                  const isCaught = cur?.phase === "caught" && i === cur.depth;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2 font-mono text-xs transition-all",
                        isThrower
                          ? "border-red-500 bg-red-500/10 font-bold"
                          : isCaught
                            ? "border-emerald-500 bg-emerald-500/10 font-bold"
                            : isActive
                              ? "border-primary/40 bg-primary/5"
                              : "border-border opacity-30",
                      )}
                      style={{ marginLeft: `${i * 14}px` }}
                    >
                      <span className="font-bold">{f.name}()</span>
                      {f.loc && <span className="text-muted-foreground">{f.loc}</span>}
                      {isThrower && <span className="ml-auto font-sans text-[10px] font-extrabold text-red-500">throws here</span>}
                      {isCaught && <span className="ml-auto font-sans text-[10px] font-extrabold text-emerald-600">catches here</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Frames are ordered outermost first, matching how the real stack unwinds. Depth {maxDepth + 1} frames.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
