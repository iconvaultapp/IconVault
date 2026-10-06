// /tools/streams-api-playground - Live ReadableStream, WritableStream and
// TransformStream demos with a timestamped chunk log. 100% in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Trash2, Waves } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/streams-api-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/streams-api-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/streams-api-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/streams-api-playground";
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
  component: StreamsTool,
});

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

function makeNumberStream(count: number) {
  return new ReadableStream<string>({
    async start(controller) {
      for (let i = 1; i <= count; i++) {
        await sleep(350);
        controller.enqueue(`chunk ${i} of ${count}`);
      }
      controller.close();
    },
  });
}

const DEMOS = [
  {
    id: "readable",
    name: "ReadableStream",
    desc: "Pull chunks from a producer, one at a time, with backpressure built in.",
    code: `const stream = new ReadableStream({
  async start(controller) {
    for (let i = 1; i <= 5; i++) {
      await sleep(350);
      controller.enqueue(\`chunk \${i} of 5\`);
    }
    controller.close();
  },
});

const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log("received:", value);
}`,
  },
  {
    id: "transform",
    name: "TransformStream",
    desc: "Pipe data through an uppercase transform. Same pattern used for compression and parsing.",
    code: `const upper = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk.toUpperCase());
  },
});

const readable = makeNumberStream(5);
const transformed = readable.pipeThrough(upper);
const reader = transformed.getReader();
// chunks arrive as "CHUNK 1 OF 5", ...`,
  },
  {
    id: "writable",
    name: "WritableStream",
    desc: "Consume a stream into a sink. The writer only accepts the next chunk when ready.",
    code: `const collected = [];
const sink = new WritableStream({
  write(chunk) { collected.push(chunk); },
  close() { console.log("all written:", collected); },
});

await makeNumberStream(5).pipeTo(sink);`,
  },
  {
    id: "pipe",
    name: "Full pipeline",
    desc: "readable -> transform -> writable in one pipe chain, like a real download pipeline.",
    code: `const upper = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk.toUpperCase());
  },
});
const collected = [];
const sink = new WritableStream({
  write(chunk) { collected.push(chunk); },
});

await makeNumberStream(5)
  .pipeThrough(upper)
  .pipeTo(sink);
// collected = ["CHUNK 1 OF 5", ...]`,
  },
] as const;

type DemoId = (typeof DEMOS)[number]["id"];

function StreamsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("streams-api-playground", isPro);
  const seo = toolSeo;

  const [log, setLog] = useState<string[]>([]);
  const [active, setActive] = useState<DemoId | null>(null);
  const [busy, setBusy] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const logLine = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setLog((p) => [...p.slice(-120), `[${t}] ${msg}`]);
    requestAnimationFrame(() => logEndRef.current?.scrollIntoView({ block: "end" }));
  }, []);

  const clearLog = () => setLog([]);

  const runDemo = useCallback(
    async (id: DemoId) => {
      if (busy || !trial.canUse) return;
      setBusy(true);
      setActive(id);
      trial.recordUse();
      try {
        if (id === "readable") {
          logLine("readable: stream created, reading...");
          const reader = makeNumberStream(5).getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              logLine("readable: stream closed (done = true)");
              break;
            }
            logLine(`readable: received "${value}"`);
          }
        } else if (id === "transform") {
          logLine("transform: piping through uppercase TransformStream...");
          const upper = new TransformStream<string, string>({
            transform(chunk, controller) {
              controller.enqueue(chunk.toUpperCase());
            },
          });
          const reader = makeNumberStream(5).pipeThrough(upper).getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              logLine("transform: stream closed");
              break;
            }
            logLine(`transform: received "${value}"`);
          }
        } else if (id === "writable") {
          logLine("writable: piping chunks into a WritableStream sink...");
          const collected: string[] = [];
          const sink = new WritableStream<string>({
            write(chunk) {
              collected.push(chunk);
              logLine(`writable: sink.write("${chunk}")`);
            },
            close() {
              logLine(`writable: sink closed, total ${collected.length} chunks`);
            },
          });
          await makeNumberStream(5).pipeTo(sink);
        } else {
          logLine("pipeline: readable -> transform -> writable");
          const upper = new TransformStream<string, string>({
            transform(chunk, controller) {
              controller.enqueue(chunk.toUpperCase());
            },
          });
          const collected: string[] = [];
          const sink = new WritableStream<string>({
            write(chunk) {
              collected.push(chunk);
              logLine(`pipeline: sink got "${chunk}"`);
            },
          });
          await makeNumberStream(5).pipeThrough(upper).pipeTo(sink);
          logLine(`pipeline: done. Final array: [${collected.map((c) => `"${c}"`).join(", ")}]`);
        }
        toast.success("Demo finished");
      } catch (e) {
        logLine(`error: ${e instanceof Error ? e.message : "demo failed"}`);
        toast.error("Demo failed");
      } finally {
        setBusy(false);
      }
    },
    [busy, trial, logLine],
  );

  const activeDemo = DEMOS.find((d) => d.id === active);

  return (
    <ToolPageShell toolId="streams-api-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Streams API" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {DEMOS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => void runDemo(d.id)}
              disabled={busy || !trial.canUse}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition",
                active === d.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40",
                (busy || !trial.canUse) && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-primary" />
                <p className="font-semibold">{d.name}</p>
                {busy && active === d.id && (
                  <span className="ml-auto inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{d.desc}</p>
            </button>
          ))}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Chunk log</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearLog}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Trash2 className="h-4 w-4" /> Clear
                </button>
                {active && (
                  <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => void runDemo(active)}>
                    <Play className="h-4 w-4" /> Run again
                  </ActionButton>
                )}
              </div>
            </div>
            <div className="h-56 overflow-y-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed">
              {log.length === 0 ? (
                <p className="text-white/40">Pick a demo on the left. Chunks appear here with timestamps.</p>
              ) : (
                log.map((l, i) => (
                  <p key={i} className="text-emerald-300">
                    {l}
                  </p>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">{activeDemo ? `${activeDemo.name} code` : "Demo code"}</h2>
            <pre className="max-h-64 overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-sky-300">
              {activeDemo ? activeDemo.code : "// Run a demo to see its exact code here."}
            </pre>
            <p className="mt-3 text-sm text-muted-foreground">
              Backpressure note: a fast producer never overwhelms a slow consumer. The reader pulls, the writer
              waits for readiness, and <span className="font-mono">pipeTo</span> wires the two together. That is
              the same mechanism behind streaming fetch responses and file downloads.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
