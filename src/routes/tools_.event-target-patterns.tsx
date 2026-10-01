// /tools/event-target-patterns - EventTarget lab: CustomEvent with detail,
// event delegation, and the once / passive / signal listener options, all
// wired with real addEventListener calls. 100% client-side.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/event-target-patterns")({
  head: () => {
    const seo = getToolSeoMeta("event-target-patterns");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: EventTargetPatterns,
});

interface LogEntry {
  t: string;
  msg: string;
  kind: "event" | "info";
}

function useEventLog() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const push = (msg: string, kind: LogEntry["kind"] = "event") =>
    setLog((p) => [...p.slice(-49), { t: new Date().toLocaleTimeString(), msg, kind }]);
  const clear = () => setLog([]);
  return { log, push, clear };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function EventTargetPatterns() {
  const { isPro } = usePlan();
  const trial = useToolTrial("event-target-patterns", isPro);
  const seo = getToolSeo("event-target-patterns");
  const { log, push, clear } = useEventLog();

  // CustomEvent
  const [detail, setDetail] = useState("hello from CustomEvent");
  const customBox = useRef<HTMLDivElement | null>(null);

  // Delegation
  const listRef = useRef<HTMLUListElement | null>(null);

  // once
  const [onceCount, setOnceCount] = useState(0);
  const onceBtn = useRef<HTMLButtonElement | null>(null);

  // passive
  const [passiveOn, setPassiveOn] = useState(true);
  const [prevented, setPrevented] = useState<boolean | null>(null);
  const passiveBox = useRef<HTMLDivElement | null>(null);

  // signal
  const signalBtn = useRef<HTMLButtonElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [signalState, setSignalState] = useState<"idle" | "listening" | "aborted">("idle");
  const [signalClicks, setSignalClicks] = useState(0);

  // removeEventListener
  const toggleBtn = useRef<HTMLButtonElement | null>(null);
  const [attached, setAttached] = useState(false);
  const [toggleClicks, setToggleClicks] = useState(0);

  useEffect(() => {
    // CustomEvent listener
    const box = customBox.current;
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail;
      push(`received "notify": detail = ${JSON.stringify(d)}`);
    };
    box?.addEventListener("notify", onCustom);

    // Delegation: one listener on the <ul>
    const ul = listRef.current;
    const onDelegate = (e: Event) => {
      const li = (e.target as HTMLElement).closest("li[data-fruit]");
      if (!li) return;
      push(`delegated click: ${(li as HTMLElement).dataset["fruit"]} (target was ${(e.target as HTMLElement).tagName.toLowerCase()})`);
    };
    ul?.addEventListener("click", onDelegate);

    return () => {
      box?.removeEventListener("notify", onCustom);
      ul?.removeEventListener("click", onDelegate);
    };
  }, [push]);

  useEffect(() => {
    const btn = onceBtn.current;
    if (!btn) return;
    const handler = () => {
      setOnceCount((c) => {
        push(`once handler fired (count ${c + 1}); auto-removed now`);
        return c + 1;
      });
    };
    btn.addEventListener("click", handler, { once: true });
    return () => btn.removeEventListener("click", handler);
  }, [push]);

  useEffect(() => {
    const box = passiveBox.current;
    if (!box) return;
    const handler = (e: Event) => {
      e.preventDefault();
      const ok = e.defaultPrevented;
      setPrevented(ok);
      push(`wheel with passive:${passiveOn} -> preventDefault() ${ok ? "worked" : "ignored by the browser"}`);
    };
    box.addEventListener("wheel", handler, { passive: passiveOn });
    return () => box.removeEventListener("wheel", handler);
  }, [passiveOn, push]);

  const startSignal = () => {
    if (!trial.canUse) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSignalState("listening");
    setSignalClicks(0);
    push("listener attached with { signal }");
    signalBtn.current?.addEventListener(
      "click",
      () => {
        setSignalClicks((c) => {
          push(`signal listener fired (click ${c + 1})`);
          return c + 1;
        });
      },
      { signal: ctrl.signal },
    );
    trial.recordUse();
  };

  const abortSignal = () => {
    abortRef.current?.abort();
    setSignalState("aborted");
    push("controller.abort() -> listener removed, clicks below are ignored");
  };

  useEffect(() => {
    const btn = toggleBtn.current;
    if (!btn) return;
    const handler = () => {
      setToggleClicks((c) => {
        push(`manual listener fired (click ${c + 1})`);
        return c + 1;
      });
    };
    if (attached) btn.addEventListener("click", handler);
    return () => btn.removeEventListener("click", handler);
  }, [attached, push]);

  const dispatchCustom = () => {
    if (!trial.canUse) return;
    customBox.current?.dispatchEvent(new CustomEvent("notify", { detail, bubbles: true }));
    trial.recordUse();
  };

  const copySnippet = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const snippet = (code: string, label: string) => (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
        <span>{label}</span>
        <button type="button" onClick={() => copySnippet(code, label)} className="flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  );

  return (
    <ToolPageShell toolId="event-target-patterns" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="EventTarget Patterns" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
          <Section title="CustomEvent with detail">
            <p className="mb-2 text-xs text-muted-foreground">Dispatch a typed custom event; the listener reads <code className="font-mono">event.detail</code>.</p>
            <div ref={customBox} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex flex-wrap gap-2">
                <input value={detail} onChange={(e) => setDetail(e.target.value)} className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" aria-label="Event detail" />
                <button type="button" onClick={dispatchCustom} disabled={!trial.canUse} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  Dispatch
                </button>
              </div>
            </div>
            {snippet(`box.addEventListener("notify", (e) => {\n  console.log(e.detail); // any structured data\n});\n\nbox.dispatchEvent(new CustomEvent("notify", {\n  detail: { user: "ana" },\n  bubbles: true,\n}));`, "custom-event.js")}
          </Section>

          <Section title="Event delegation">
            <p className="mb-2 text-xs text-muted-foreground">One listener on the list handles every item, including ones added later.</p>
            <ul ref={listRef} className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/30 p-4">
              {["apple", "banana", "cherry", "date", "elderberry", "fig"].map((f) => (
                <li key={f} data-fruit={f} className="cursor-pointer rounded-lg bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-primary/20">
                  {f}
                </li>
              ))}
            </ul>
            {snippet(`ul.addEventListener("click", (e) => {\n  const li = e.target.closest("li[data-fruit]");\n  if (!li) return; // clicked the gaps\n  console.log("picked", li.dataset.fruit);\n});`, "delegation.js")}
          </Section>

          <Section title="once: true">
            <p className="mb-2 text-xs text-muted-foreground">The browser removes the listener after the first call. Click the button many times.</p>
            <button ref={onceBtn} type="button" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary/50">
              Click me (fires once: {onceCount})
            </button>
            {snippet(`btn.addEventListener("click", handler, { once: true });\n// no manual removeEventListener needed`, "once.js")}
          </Section>

          <Section title="passive: true">
            <p className="mb-2 text-xs text-muted-foreground">Scroll inside the box. With passive on, the browser ignores preventDefault() so scrolling never janks.</p>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={passiveOn} onChange={(e) => setPassiveOn(e.target.checked)} className="accent-primary" />
              passive: {passiveOn ? "true" : "false"}
            </label>
            <div ref={passiveBox} className="h-24 overflow-y-scroll rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {Array.from({ length: 12 }).map((_, i) => <p key={i}>scrollable line {i + 1}: the wheel listener calls preventDefault()</p>)}
            </div>
            {prevented !== null && (
              <p className={cn("mt-2 text-xs font-bold", prevented ? "text-green-600" : "text-amber-600")}>
                Last wheel: preventDefault() {prevented ? "worked (listener is NOT passive)" : "was ignored (listener IS passive)"}
              </p>
            )}
            {snippet(`el.addEventListener("wheel", (e) => {\n  e.preventDefault(); // silently ignored when passive\n}, { passive: true });`, "passive.js")}
          </Section>

          <Section title="signal: AbortController">
            <p className="mb-2 text-xs text-muted-foreground">Group listeners under one controller and remove them all with abort().</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={startSignal} disabled={!trial.canUse || signalState === "listening"} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                Attach listener
              </button>
              <button ref={signalBtn} type="button" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary/50">
                Clicks counted: {signalClicks}
              </button>
              <button type="button" onClick={abortSignal} disabled={signalState !== "listening"} className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-500 disabled:opacity-40">
                Abort
              </button>
              <span className={cn("text-xs font-bold", signalState === "listening" ? "text-green-600" : signalState === "aborted" ? "text-red-500" : "text-muted-foreground")}>
                {signalState.toUpperCase()}
              </span>
            </div>
            {snippet(`const ctrl = new AbortController();\nel.addEventListener("click", onClick, { signal: ctrl.signal });\n\n// later: removes every listener sharing the signal\nctrl.abort();`, "signal.js")}
          </Section>

          <Section title="removeEventListener">
            <p className="mb-2 text-xs text-muted-foreground">The classic toggle: the exact same function reference must be passed to remove it.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setAttached((a) => { push(a ? "listener removed" : "listener attached"); return !a; })} className={cn("rounded-lg px-4 py-2 text-sm font-bold", attached ? "bg-red-500/10 text-red-500" : "bg-primary text-primary-foreground")}>
                {attached ? "Detach" : "Attach"}
              </button>
              <button ref={toggleBtn} type="button" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary/50">
                Test button ({toggleClicks} logged)
              </button>
            </div>
            {snippet(`function onClick(e) { /* ... */ }\nel.addEventListener("click", onClick);\nel.removeEventListener("click", onClick); // same reference!`, "remove.js")}
          </Section>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-primary" /> Event log</h2>
            <button type="button" onClick={clear} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary/50">Clear</button>
          </div>
          <div className="max-h-[560px] flex-1 space-y-1.5 overflow-y-auto rounded-xl bg-black p-3 font-mono text-[11px] leading-relaxed">
            {log.length === 0 ? (
              <p className="text-muted-foreground">// interact with any demo on the left</p>
            ) : (
              log.map((l, i) => (
                <p key={i} className={l.kind === "info" ? "text-muted-foreground" : "text-green-400"}>
                  <span className="text-muted-foreground">[{l.t}]</span> {l.msg}
                </p>
              ))
            )}
          </div>
          {!isPro && <p className="mt-3 text-xs text-muted-foreground">{trial.left} of 5 free dispatches left.</p>}
        </div>
      </div>
    </ToolPageShell>
  );
}
