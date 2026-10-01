// /tools/weakref-visualizer - Real WeakRef + FinalizationRegistry playground:
// allocate objects, hold them weakly, drop references, and watch the
// garbage collector reclaim them live. Includes honest GC-trigger guidance.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link2, Link2Off, Trash2, Activity, Info, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/weakref-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("weakref-visualizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: WeakRefTool,
});

interface Tracked {
  id: string;
  kb: number;
  ref: WeakRef<object>;
  alive: boolean | null;
}

interface LogEntry {
  t: string;
  msg: string;
}

function WeakRefTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("weakref-visualizer", isPro);
  const seo = getToolSeo("weakref-visualizer");

  const [items, setItems] = useState<Tracked[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [count, setCount] = useState(12);
  const [kbEach, setKbEach] = useState(512);
  const [keepStrong, setKeepStrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const idRef = useRef(0);
  const strongRef = useRef<object[]>([]);
  const registryRef = useRef<FinalizationRegistry<string> | null>(null);
  if (registryRef.current === null && typeof FinalizationRegistry !== "undefined") {
    registryRef.current = new FinalizationRegistry<string>((heldId) => {
      setLog((p) =>
        [{ t: new Date().toLocaleTimeString(), msg: `Finalized: ${heldId} was reclaimed by the GC.` }, ...p].slice(0, 80),
      );
      setItems((p) => p.map((it) => (it.id === heldId ? { ...it, alive: false } : it)));
    });
  }

  const addLog = useCallback((msg: string) => {
    setLog((p) => [{ t: new Date().toLocaleTimeString(), msg }, ...p].slice(0, 80));
  }, []);

  const allocate = useCallback(() => {
    if (busy || !trial.canUse) return;
    const n = Math.max(1, Math.min(200, Math.floor(count) || 1));
    const kb = Math.max(16, Math.min(8192, Math.floor(kbEach) || 512));
    const registry = registryRef.current;
    if (!registry) {
      toast.error("WeakRef is not supported in this browser.");
      return;
    }
    setBusy(true);
    try {
      const fresh: Tracked[] = [];
      for (let i = 0; i < n; i++) {
        idRef.current += 1;
        const id = `obj-${idRef.current}`;
        const payload = { data: new Float64Array(kb * 128) };
        for (let j = 0; j < payload.data.length; j += 997) payload.data[j] = Math.random();
        registry.register(payload, id);
        fresh.push({ id, kb, ref: new WeakRef<object>(payload), alive: null });
        if (keepStrong) strongRef.current.push(payload);
      }
      setItems((p) => [...p, ...fresh].slice(-200));
      addLog(
        `Allocated ${n} object(s) x ~${kb}KB, each wrapped in a WeakRef${
          keepStrong ? " (strong refs kept - they cannot be collected yet)" : ""
        }.`,
      );
      trial.recordUse();
      toast.success(`Tracking ${n} weakly-held object(s).`);
    } finally {
      setBusy(false);
    }
  }, [busy, trial, count, kbEach, keepStrong, addLog]);

  const checkLiveness = useCallback(() => {
    let alive = 0;
    let dead = 0;
    setItems((p) =>
      p.map((it) => {
        const still = it.ref.deref() !== undefined;
        if (still) alive += 1;
        else dead += 1;
        return { ...it, alive: still };
      }),
    );
    addLog(`Liveness check: ${alive} alive, ${dead} reclaimed.`);
  }, [addLog]);

  const releaseStrong = useCallback(() => {
    const n = strongRef.current.length;
    strongRef.current = [];
    addLog(`Released ${n} strong reference(s). They are now eligible for collection.`);
    toast.info("Strong references dropped. Trigger a GC, then check liveness.");
  }, [addLog]);

  const pressure = useCallback(() => {
    addLog("Allocating and discarding ~160MB of temporary arrays to encourage a GC cycle...");
    let freed = 0;
    for (let i = 0; i < 20; i++) {
      const tmp = new Float64Array(1024 * 1024);
      tmp[0] = Math.random();
      freed += tmp.byteLength;
      void tmp;
    }
    addLog(`Discarded ~${Math.round(freed / 1024 / 1024)}MB of temporaries. Now press "Check liveness".`);
  }, [addLog]);

  const clearAll = useCallback(() => {
    setItems([]);
    strongRef.current = [];
    setLog([]);
    addLog("Cleared all tracked objects.");
  }, [addLog]);

  const aliveCount = items.filter((i) => i.alive === true).length;
  const deadCount = items.filter((i) => i.alive === false).length;
  const unknownCount = items.length - aliveCount - deadCount;

  return (
    <ToolPageShell toolId="weakref-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="WeakRef & GC" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Experiment controls</h2>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Objects</span>
              <input
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">KB each</span>
              <input
                type="number"
                min={16}
                max={8192}
                step={64}
                value={kbEach}
                onChange={(e) => setKbEach(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input
              type="checkbox"
              checked={keepStrong}
              onChange={(e) => setKeepStrong(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span className="text-sm">
              <span className="font-semibold">Keep strong references</span>
              <span className="block text-xs text-muted-foreground">
                On: objects survive GC until you release them. Off: collectable immediately.
              </span>
            </span>
          </label>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={allocate}>
            <FlaskConical className="h-4 w-4" /> {busy ? "Allocating…" : "Allocate + track weakly"}
          </ActionButton>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={checkLiveness}
              disabled={items.length === 0}
              className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Check liveness
            </button>
            <button
              type="button"
              onClick={releaseStrong}
              disabled={strongRef.current.length === 0 && items.length === 0}
              className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Drop strong refs
            </button>
            <button
              type="button"
              onClick={pressure}
              className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40"
            >
              Memory pressure
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40"
            >
              <Trash2 className="h-4 w-4" /> Reset
            </button>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free allocations left. Nothing leaves your browser.
            </p>
          )}

          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground/80">
              <Info className="h-3.5 w-3.5" /> How to actually trigger a GC
            </p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Allocate objects, then drop strong refs.</li>
              <li>Open DevTools, Memory tab, click the trash-can (Collect garbage).</li>
              <li>Or launch Chrome with --js-flags=--expose-gc and call gc().</li>
              <li>Press "Check liveness" and watch FinalizationRegistry callbacks arrive.</li>
            </ol>
            <p className="mt-2">
              JavaScript gives you no API to force collection; the GC runs on its own schedule.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "Tracked", v: items.length, icon: Activity },
              { k: "Alive", v: aliveCount, icon: Link2, tone: "text-emerald-500" },
              { k: "Reclaimed", v: deadCount, icon: Link2Off, tone: "text-red-500" },
              { k: "Unchecked", v: unknownCount, icon: Info, tone: "text-muted-foreground" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-border bg-card p-4">
                <s.icon className={cn("mb-1 h-4 w-4", s.tone ?? "text-primary")} />
                <p className="text-2xl font-extrabold">{s.v}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.k}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Weak references</h2>
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing tracked yet. Allocate some objects and hold them with WeakRef.
              </p>
            ) : (
              <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className={cn(
                      "rounded-xl border p-2.5 font-mono text-[11px]",
                      it.alive === false
                        ? "border-red-500/40 bg-red-500/5"
                        : it.alive === true
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-border bg-muted/50",
                    )}
                  >
                    <p className="truncate font-bold">{it.id}</p>
                    <p className="text-muted-foreground">~{it.kb}KB</p>
                    <p
                      className={cn(
                        "mt-1 font-bold",
                        it.alive === false
                          ? "text-red-500"
                          : it.alive === true
                            ? "text-emerald-600"
                            : "text-muted-foreground",
                      )}
                    >
                      {it.alive === null ? "not checked" : it.alive ? "alive" : "reclaimed"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">FinalizationRegistry callbacks + log</h2>
            {log.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Registry callbacks appear here the moment the GC reclaims an object.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto font-mono text-xs">
                {log.map((e, i) => (
                  <li key={i} className="flex gap-3 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="shrink-0 text-muted-foreground">{e.t}</span>
                    <span>{e.msg}</span>
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
