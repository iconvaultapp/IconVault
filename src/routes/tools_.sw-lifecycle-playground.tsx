// /tools/sw-lifecycle-playground - Animated service worker lifecycle
// visualizer: install, activate and fetch events with a realistic event log.
// Honest: real service workers need HTTPS (or localhost) and a separate file.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sw-lifecycle-playground")({
  head: () => {
    const seo = getToolSeoMeta("sw-lifecycle-playground");
    const canonical = "https://iconvault.site/tools/sw-lifecycle-playground";
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
  component: SwLifecycleTool,
});

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

type Phase = "idle" | "installing" | "installed" | "activating" | "activated";

const STEPS = [
  { id: "installing", label: "Installing", desc: "install event: precaching the app shell" },
  { id: "installed", label: "Installed / waiting", desc: "waiting: old worker still controls the page" },
  { id: "activating", label: "Activating", desc: "activate event: cleaning old caches" },
  { id: "activated", label: "Activated", desc: "clients.claim(): this worker now controls pages" },
] as const;

const SW_TEMPLATE = `// sw.js - cache-first service worker template
const CACHE = "app-v1";
const SHELL = ["/", "/styles.css", "/app.js", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => {
      // take over immediately instead of waiting
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // cache-first: fast repeat visits, network as backup
  event.respondWith(
    caches.match(event.request).then(
      (hit) => hit ?? fetch(event.request),
    ),
  );
});
`;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function SwLifecycleTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sw-lifecycle-playground", isPro);
  const seo = getToolSeo("sw-lifecycle-playground");

  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  const logLine = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setLog((p) => [...p.slice(-120), `[${t}] ${msg}`]);
    requestAnimationFrame(() => logEndRef.current?.scrollIntoView({ block: "end" }));
  }, []);

  const simulate = useCallback(
    async (kind: "install" | "activate" | "fetch") => {
      if (runningRef.current || !trial.canUse) return;
      runningRef.current = true;
      setBusy(true);
      trial.recordUse();
      try {
        if (kind === "install") {
          setPhase("installing");
          logLine("navigator.serviceWorker.register('/sw.js')");
          await sleep(500);
          logLine("install event dispatched: precaching [/, /styles.css, /app.js, /logo.png]");
          await sleep(900);
          logLine("skipWaiting() called: no waiting, take over now");
          await sleep(400);
          setPhase("installed");
          logLine("state: installed. Old worker (if any) still controls open pages.");
        } else if (kind === "activate") {
          setPhase("activating");
          logLine("activate event dispatched: deleting stale caches [app-v0]");
          await sleep(900);
          logLine("clients.claim() called: controlling all open pages");
          await sleep(400);
          setPhase("activated");
          logLine("state: activated. Fetch events now flow through this worker.");
        } else {
          if (phase !== "activated") {
            logLine("fetch event: /styles.css");
            await sleep(400);
            logLine("no active worker: request went straight to the network. Activate first.");
          } else {
            logLine("fetch event: GET /styles.css");
            await sleep(500);
            logLine("cache-first: caches.match('/styles.css') -> HIT (12ms)");
            await sleep(500);
            logLine("fetch event: GET /api/user.json");
            await sleep(500);
            logLine("cache-first: caches.match('/api/user.json') -> MISS, fetch() from network (210ms), served");
          }
        }
        toast.success("Simulation step finished");
      } finally {
        runningRef.current = false;
        setBusy(false);
      }
    },
    [phase, trial, logLine],
  );

  const reset = () => {
    setPhase("idle");
    setLog([]);
  };

  const phaseIndex = STEPS.findIndex((s) => s.id === phase);

  return (
    <ToolPageShell toolId="sw-lifecycle-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Service Worker Lifecycle" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          This page simulates the lifecycle, it does not register a real worker. A real service worker needs
          HTTPS (or localhost) and must live in its own file, like <span className="font-mono">/sw.js</span>,
          registered with <span className="font-mono">navigator.serviceWorker.register("/sw.js")</span>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Lifecycle stages</h2>
            <div className="space-y-0">
              {STEPS.map((s, i) => {
                const reached = phaseIndex >= i;
                const current = phase === s.id;
                return (
                  <div key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "absolute left-[15px] top-8 h-[calc(100%-28px)] w-0.5",
                          phaseIndex > i ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                        current
                          ? "animate-pulse border-primary bg-primary text-primary-foreground"
                          : reached
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", reached ? "text-foreground" : "text-muted-foreground")}>
                        {s.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => void simulate("install")}>
              Simulate install
            </ActionButton>
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => void simulate("activate")}>
              Simulate activate
            </ActionButton>
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => void simulate("fetch")}>
              Simulate fetch
            </ActionButton>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
            >
              Reset
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free simulations left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Event log</h2>
            <div className="h-64 overflow-y-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed">
              {log.length === 0 ? (
                <p className="text-white/40">
                  Run a simulation. install, activate and fetch events appear here exactly as a real worker would
                  log them.
                </p>
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Copy-ready sw.js template</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyText(SW_TEMPLATE);
                    if (ok) {
                      trial.recordUse();
                      toast.success("sw.js copied");
                    } else toast.error("Copy failed");
                  }}
                  disabled={!trial.canUse}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadBlob(new Blob([SW_TEMPLATE], { type: "text/javascript" }), "sw.js");
                    trial.recordUse();
                    toast.success("sw.js downloaded");
                  }}
                  disabled={!trial.canUse}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
                >
                  <Download className="h-4 w-4" /> sw.js
                </button>
              </div>
            </div>
            <pre className="max-h-72 overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-sky-300">
              {SW_TEMPLATE}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
