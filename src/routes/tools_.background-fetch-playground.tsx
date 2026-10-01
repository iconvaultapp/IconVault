// /tools/background-fetch-playground - Real Background Fetch API playground:
// walks the genuine registration flow (service worker -> backgroundFetch ->
// fetch -> progress events -> result) and reports honestly where it stops.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Play, OctagonX, CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/background-fetch-playground")({
  head: () => {
    const seo = getToolSeoMeta("background-fetch-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BackgroundFetchTool,
});

interface BgFetchRegistration extends EventTarget {
  readonly id: string;
  readonly downloaded: number;
  readonly downloadTotal: number;
  readonly result: "" | "success" | "failure";
  readonly failureReason: "" | "aborted" | "bad-status" | "fetch-error" | "quota-exceeded" | "download-total-exceeded";
  abort(): Promise<boolean>;
}

interface BgFetchManager {
  fetch(id: string, requests: string[], options?: { title?: string }): Promise<BgFetchRegistration>;
  get(id: string): Promise<BgFetchRegistration | undefined>;
  getIds(): Promise<string[]>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly backgroundFetch?: BgFetchManager;
  }
}

type StepStatus = "idle" | "run" | "ok" | "fail";
interface Step {
  label: string;
  status: StepStatus;
  detail: string;
}

const STEP_LABELS = [
  "Service worker support",
  "Active service worker (ready)",
  "backgroundFetch on registration",
  "Register background fetch",
  "Download progress events",
  "Final result",
];

function BackgroundFetchTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("background-fetch-playground", isPro);
  const seo = getToolSeo("background-fetch-playground");

  const [steps, setSteps] = useState<Step[]>(() =>
    STEP_LABELS.map((label) => ({ label, status: "idle", detail: "Not run yet." })),
  );
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("IconVault demo download");
  const [urls, setUrls] = useState("/favicon.svg\n/favicon.png");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fetchId, setFetchId] = useState<string | null>(null);
  const regRef = useRef<BgFetchRegistration | null>(null);
  const runRef = useRef(0);

  const setStep = useCallback((i: number, status: StepStatus, detail: string) => {
    setSteps((p) => p.map((s, j) => (j === i ? { ...s, status, detail } : s)));
  }, []);

  const reset = useCallback(() => {
    regRef.current = null;
    setFetchId(null);
    setProgress(null);
    setSteps(STEP_LABELS.map((label) => ({ label, status: "idle", detail: "Not run yet." })));
  }, []);

  const markRunningStepFailed = useCallback((msg: string) => {
    setSteps((p) => {
      const i = p.findIndex((s) => s.status === "run");
      if (i === -1) return p;
      return p.map((s, j) => (j === i ? { ...s, status: "fail" as StepStatus, detail: msg } : s));
    });
  }, []);

  const runFlow = useCallback(async () => {
    if (busy || !trial.canUse) return;
    runRef.current += 1;
    const run = runRef.current;
    reset();
    setBusy(true);
    trial.recordUse();

    try {
      // Step 0: service worker support
      setStep(0, "run", "Checking navigator.serviceWorker...");
      if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        setStep(0, "fail", "Service workers are not supported in this browser.");
        return;
      }
      setStep(0, "ok", "navigator.serviceWorker exists.");

      // Step 1: wait for ready (with timeout)
      setStep(1, "run", "Waiting for navigator.serviceWorker.ready (4s timeout)...");
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((res) => window.setTimeout(() => res(null), 4000)),
      ]);
      if (runRef.current !== run) return;
      if (!ready) {
        setStep(
          1,
          "fail",
          "No active service worker controls this page. Background Fetch requires a registered service worker: deploy the snippet below in your own app, then return.",
        );
        return;
      }
      setStep(1, "ok", `Service worker ready (scope: ${ready.scope}).`);

      // Step 2: backgroundFetch capability
      setStep(2, "run", "Checking registration.backgroundFetch...");
      const manager = ready.backgroundFetch;
      if (!manager) {
        setStep(
          2,
          "fail",
          "This browser exposes service workers but not Background Fetch (Chrome/Edge desktop only).",
        );
        return;
      }
      setStep(2, "ok", "registration.backgroundFetch is available.");

      // Step 3: register
      setStep(3, "run", "Calling backgroundFetch.fetch()...");
      const list = urls.split("\n").map((u) => u.trim()).filter(Boolean);
      if (list.length === 0) {
        setStep(3, "fail", "Enter at least one URL to download.");
        return;
      }
      const id = `iconvault-demo-${Date.now()}`;
      const registration = await manager.fetch(id, list, { title: title.trim() || "Background download" });
      if (runRef.current !== run) return;
      regRef.current = registration;
      setFetchId(id);
      setStep(3, "ok", `Registered fetch "${id}" for ${list.length} request(s).`);

      // Step 4: progress
      setStep(4, "run", "Listening for progress events (downloads continue even if you close the tab)...");
      const onProgress = () => {
        const r = regRef.current;
        if (!r) return;
        setProgress({ done: r.downloaded, total: r.downloadTotal });
        setSteps((p) =>
          p.map((s, j) =>
            j === 4
              ? {
                  ...s,
                  detail: `downloaded=${r.downloaded} bytes, downloadTotal=${r.downloadTotal || "unknown"}.`,
                }
              : s,
          ),
        );
      };
      registration.addEventListener("progress", onProgress);
      onProgress();

      // Step 5: poll for completion
      const poll = async () => {
        for (let i = 0; i < 120; i++) {
          if (runRef.current !== run) return;
          await new Promise((res) => window.setTimeout(res, 1000));
          const current = await manager.get(id);
          if (!current) {
            setStep(5, "fail", "Registration disappeared.");
            return;
          }
          if (current.result === "success" || current.result === "failure") {
            onProgress();
            if (current.result === "success") {
              setStep(5, "ok", "Result: success. The service worker received a backgroundfetchsuccess event.");
              toast.success("Background fetch completed.");
            } else {
              setStep(5, "fail", `Result: failure (${current.failureReason || "unknown reason"}).`);
              toast.error("Background fetch failed.");
            }
            return;
          }
        }
        setStep(5, "fail", "Timed out waiting for completion (2 minutes). The download may still be running in the background.");
      };
      void poll();
      toast.success("Background fetch registered.");
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : "Unknown error.";
      markRunningStepFailed(msg);
      toast.error("Registration flow failed.");
    } finally {
      setBusy(false);
    }
  }, [busy, trial, reset, setStep, markRunningStepFailed, title, urls]);

  const abortFetch = useCallback(async () => {
    const r = regRef.current;
    if (!r) return;
    const ok = await r.abort().catch(() => false);
    setStep(4, "fail", ok ? "Aborted by user." : "Abort call failed.");
    toast.info("Abort requested.");
  }, [setStep]);

  return (
    <ToolPageShell toolId="background-fetch-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Background Fetch" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Registration input</h2>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Download title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              URLs to fetch (one per line, same-origin works best)
            </span>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={3}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs"
            />
          </label>

          <div className="flex gap-2">
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => void runFlow()}>
              <Play className="h-4 w-4" /> {busy ? "Running…" : "Run registration flow"}
            </ActionButton>
            <button
              type="button"
              onClick={abortFetch}
              disabled={!regRef.current}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <OctagonX className="h-4 w-4" /> Abort
            </button>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Everything runs in your browser.
            </p>
          )}

          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground/80">
              <Info className="h-3.5 w-3.5" /> Honest requirements
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Chrome or Edge on desktop (no Firefox/Safari support).</li>
              <li>HTTPS or localhost.</li>
              <li>An active service worker on the page; the fetch ID must be unique.</li>
              <li>Downloads survive tab close and are reported to the SW via backgroundfetchsuccess.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">Live registration flow</h2>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5">
                    {s.status === "ok" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : s.status === "fail" ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : s.status === "run" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {i + 1}. {s.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            {progress && (
              <div className="mt-5 rounded-xl bg-muted/60 p-4">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-primary" /> {fetchId}
                  </span>
                  <span className="font-mono">
                    {progress.done.toLocaleString()} /{" "}
                    {progress.total > 0 ? progress.total.toLocaleString() : "?"} bytes
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: progress.total > 0 ? `${Math.min(100, (progress.done / progress.total) * 100)}%` : "8%",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Minimal code to run this on your own site</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Background Fetch needs a service worker. Register one, then call fetch from any
              controlled page:
            </p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
{`// page.js (runs on a page controlled by your service worker)
const reg = await navigator.serviceWorker.ready;
const bg = reg.backgroundFetch; // undefined where unsupported
const task = await bg.fetch("my-download", ["/big.zip", "/big2.zip"], {
  title: "Downloading assets",
  // downloadTotal: 50 * 1024 * 1024, // optional, enables %
});
task.addEventListener("progress", () => {
  console.log(task.downloaded, "/", task.downloadTotal);
});

// sw.js
self.addEventListener("backgroundfetchsuccess", (event) => {
  // store responses in Cache Storage for offline use
});`}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
