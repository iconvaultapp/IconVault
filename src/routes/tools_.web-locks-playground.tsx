// /tools/web-locks-playground - Learn the Web Locks API with real
// cross-tab-safe exclusive/shared locks, live hold/queue demos, 100% in-browser.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, Play, RefreshCw, Unlock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/web-locks-playground")({
  head: () => {
    const seo = getToolSeoMeta("web-locks-playground");
    const canonical = "https://iconvault.site/tools/web-locks-playground";
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
  component: WebLocksTool,
});

type LogEntry = { t: string; msg: string; kind: "info" | "ok" | "warn" };
type LockInfo = { name: string; mode: string; clientId: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toLocaleTimeString();

function WebLocksTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-locks-playground", isPro);
  const seo = getToolSeo("web-locks-playground");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [name, setName] = useState("my-resource");
  const [mode, setMode] = useState<"exclusive" | "shared">("exclusive");
  const [holdSec, setHoldSec] = useState(4);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState<LockInfo[]>([]);
  const [pending, setPending] = useState<LockInfo[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "locks" in navigator);
  }, []);

  const push = (msg: string, kind: LogEntry["kind"] = "info") =>
    setLog((p) => [{ t: stamp(), msg, kind }, ...p].slice(0, 60));

  const refresh = async () => {
    if (!("locks" in navigator)) return;
    try {
      const state = await navigator.locks.query();
      const toInfo = (l: { name?: string; mode?: string; clientId?: string }): LockInfo => ({
        name: l.name ?? "(unknown)",
        mode: l.mode ?? "exclusive",
        clientId: (l.clientId ?? "").slice(0, 8),
      });
      setHeld((state.held ?? []).map(toInfo));
      setPending((state.pending ?? []).map(toInfo));
    } catch {
      /* ignore */
    }
  };

  const requestLock = async (label: string, lockName: string, lockMode: "exclusive" | "shared", hold: number) => {
    push(`${label}: requesting "${lockName}" (${lockMode})…`);
    try {
      await navigator.locks.request(lockName, { mode: lockMode }, async (lock) => {
        if (!lock) {
          push(`${label}: request was aborted`, "warn");
          return;
        }
        push(`${label}: ACQUIRED "${lockName}" (${lock.mode})`, "ok");
        await refresh();
        await sleep(hold * 1000);
        push(`${label}: releasing "${lockName}"`);
        await refresh();
      });
    } catch (e) {
      push(`${label}: ${e instanceof Error ? e.message : "request failed"}`, "warn");
    }
  };

  const runSingle = async () => {
    if (!supported || busy || !trial.canUse || !name.trim()) return;
    setBusy(true);
    trial.recordUse();
    await requestLock("Lock A", name.trim(), mode, holdSec);
    setBusy(false);
  };

  const runRace = async () => {
    if (!supported || busy || !trial.canUse || !name.trim()) return;
    setBusy(true);
    trial.recordUse();
    const n = name.trim();
    push(`Race: two requests on "${n}" fired at the same time`);
    const a = requestLock("Request 1", n, "exclusive", holdSec);
    const b = (async () => {
      await sleep(300);
      await requestLock("Request 2", n, "exclusive", holdSec);
    })();
    await Promise.all([a, b]);
    push("Race: both finished", "ok");
    setBusy(false);
  };

  const runShared = async () => {
    if (!supported || busy || !trial.canUse || !name.trim()) return;
    setBusy(true);
    trial.recordUse();
    const n = name.trim();
    push("Shared demo: two SHARED requests, both should be granted at once");
    await Promise.all([
      requestLock("Shared 1", n, "shared", holdSec),
      (async () => { await sleep(300); await requestLock("Shared 2", n, "shared", holdSec); })(),
    ]);
    push("Shared demo: both finished", "ok");
    setBusy(false);
  };

  return (
    <ToolPageShell toolId="web-locks-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Web Locks" left={trial.left} />

      {supported === false && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
          <p className="font-bold">Web Locks API is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">
            It needs a modern Chromium, Firefox 96+ or Safari 15.2+ build. The concepts below still apply, but the live demos need a supported browser.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Lock name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-resource"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(["exclusive", "shared"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                    mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Exclusive blocks everyone else. Shared lets other shared holders in, but blocks exclusive ones.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Hold time</label>
              <span className="text-sm font-bold text-primary">{holdSec}s</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={holdSec}
              onChange={(e) => setHoldSec(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-2">
            <ActionButton busy={busy} disabled={!supported || busy || !trial.canUse || !name.trim()} onClick={runSingle}>
              <Lock className="h-4 w-4" /> {busy ? "Lock held…" : "Request lock"}
            </ActionButton>
            <ActionButton busy={busy} disabled={!supported || busy || !trial.canUse || !name.trim()} onClick={runRace}>
              <Play className="h-4 w-4" /> Race two exclusive requests
            </ActionButton>
            <ActionButton busy={busy} disabled={!supported || busy || !trial.canUse || !name.trim()} onClick={runShared}>
              <Unlock className="h-4 w-4" /> Two shared requests at once
            </ActionButton>
          </div>

          <button
            type="button"
            onClick={() => { void refresh(); toast.success("Lock table refreshed"); }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <RefreshCw className="h-4 w-4" /> Refresh held / pending
          </button>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free demos left - everything runs in this tab, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Live lock table</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[13px] font-bold text-emerald-500">Held ({held.length})</p>
                {held.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No locks held right now.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {held.map((l, i) => (
                      <li key={i} className="rounded-lg bg-muted px-3 py-2 text-xs">
                        <span className="font-bold">{l.name}</span> · {l.mode} · {l.clientId}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-[13px] font-bold text-amber-500">Pending ({pending.length})</p>
                {pending.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nothing waiting in the queue.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {pending.map((l, i) => (
                      <li key={i} className="rounded-lg bg-muted px-3 py-2 text-xs">
                        <span className="font-bold">{l.name}</span> · {l.mode} · {l.clientId}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Event log</h2>
              <button type="button" onClick={() => setLog([])} className="text-xs font-semibold text-primary hover:underline">
                Clear
              </button>
            </div>
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Run a demo on the left. Open this page in a second tab with the same lock name to see real cross-tab queueing.
              </p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                {log.map((e, i) => (
                  <li
                    key={i}
                    className={cn(
                      "rounded-lg px-3 py-2 font-mono text-xs",
                      e.kind === "ok" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      e.kind === "warn" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      e.kind === "info" && "bg-muted text-muted-foreground",
                    )}
                  >
                    <span className="mr-2 opacity-60">{e.t}</span>
                    {e.msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
