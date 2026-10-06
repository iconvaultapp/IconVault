// /tools/event-propagation - Watch a real click travel through capturing,
// target and bubbling phases with animated highlights and a phase log.
// Native listeners, real eventPhase values. 100% client-side.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/event-propagation";
import toolSeoMeta from "@/lib/tool-seo-meta-data/event-propagation";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/event-propagation")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/event-propagation";
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
  component: EventPropagation,
});

type Level = "grandparent" | "parent" | "child";
type Interruption = "none" | "gp-capture" | "parent-bubble";

interface Record_ {
  level: Level;
  phase: number; // 1 capturing, 2 target, 3 bubbling
  listener: string;
}

const PHASE_META: Record<number, { label: string; color: string; ring: string; bg: string }> = {
  1: { label: "CAPTURING", color: "text-sky-500", ring: "ring-sky-500", bg: "bg-sky-500/15" },
  2: { label: "TARGET", color: "text-emerald-500", ring: "ring-emerald-500", bg: "bg-emerald-500/15" },
  3: { label: "BUBBLING", color: "text-amber-500", ring: "ring-amber-500", bg: "bg-amber-500/15" },
};

function EventPropagation() {
  const { isPro } = usePlan();
  const trial = useToolTrial("event-propagation", isPro);
  const seo = toolSeo;

  const [capGp, setCapGp] = useState(true);
  const [capP, setCapP] = useState(true);
  const [bubGp, setBubGp] = useState(true);
  const [bubP, setBubP] = useState(true);
  const [interruption, setInterruption] = useState<Interruption>("none");

  const [records, setRecords] = useState<Record_[]>([]);
  const [animIndex, setAnimIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const gpRef = useRef<HTMLDivElement | null>(null);
  const pRef = useRef<HTMLDivElement | null>(null);
  const childRef = useRef<HTMLButtonElement | null>(null);
  const recsRef = useRef<Record_[]>([]);
  const interruptRef = useRef<Interruption>("none");
  interruptRef.current = interruption;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const gp = gpRef.current, p = pRef.current, child = childRef.current;
    if (!gp || !p || child === null) return;
    const cleanups: (() => void)[] = [];
    const add = (
      el: HTMLElement, level: Level, capture: boolean, listenerLabel: string,
      stopHere: boolean,
    ) => {
      const handler = (e: Event) => {
        recsRef.current.push({ level, phase: e.eventPhase, listener: listenerLabel });
        if (stopHere) e.stopPropagation();
      };
      el.addEventListener("click", handler, capture);
      cleanups.push(() => el.removeEventListener("click", handler, capture));
    };
    if (capGp) add(gp, "grandparent", true, "capture", interruptRef.current === "gp-capture");
    if (capP) add(p, "parent", true, "capture", false);
    add(child, "child", false, "target", false);
    if (bubP) add(p, "parent", false, "bubble", interruptRef.current === "parent-bubble");
    if (bubGp) add(gp, "grandparent", false, "bubble", false);
    return () => cleanups.forEach((c) => c());
  }, [capGp, capP, bubGp, bubP, interruption]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const dispatch = () => {
    if (!trial.canUse || playing) return;
    if (timerRef.current) clearInterval(timerRef.current);
    recsRef.current = [];
    setRecords([]);
    setAnimIndex(-1);
    childRef.current?.click(); // real dispatch through the native listeners
    const recs = [...recsRef.current];
    setRecords(recs);
    if (recs.length === 0) {
      toast.error("No listeners fired: enable at least one listener");
      return;
    }
    trial.recordUse();
    setPlaying(true);
    let i = 0;
    setAnimIndex(0);
    timerRef.current = setInterval(() => {
      i++;
      if (i >= recs.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPlaying(false);
        return;
      }
      setAnimIndex(i);
    }, 800);
  };

  const replay = () => {
    if (records.length === 0 || playing) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPlaying(true);
    let i = 0;
    setAnimIndex(0);
    timerRef.current = setInterval(() => {
      i++;
      if (i >= records.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPlaying(false);
        return;
      }
      setAnimIndex(i);
    }, 800);
  };

  const highlightFor = (level: Level): string => {
    if (animIndex < 0 || animIndex >= records.length) return "";
    const r = records[animIndex];
    if (!r || r.level !== level) return "";
    const meta = PHASE_META[r.phase];
    if (!meta) return "";
    return `ring-4 ${meta.ring} ${meta.bg}`;
  };

  const toggleRow = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs">
      <span className="font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary" />
    </label>
  );

  const code = `// current configuration\n${capGp ? `grandparent.addEventListener("click", onGp, { capture: true });\n` : ""}${capP ? `parent.addEventListener("click", onP, { capture: true });\n` : ""}child.addEventListener("click", onChild); // target phase\n${bubP ? `parent.addEventListener("click", onP);${interruption === "parent-bubble" ? " // calls e.stopPropagation()" : ""}\n` : ""}${bubGp ? `grandparent.addEventListener("click", onGp);` : ""}
// fire order for a click on child:
// ${records.map((r) => `${r.level}:${(PHASE_META[r.phase]?.label ?? "").toLowerCase()}`).join(" -> ") || "(press dispatch)"}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Propagation code copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="event-propagation" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Event Propagation" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Capture listeners</p>
            <div className="space-y-1.5">
              {toggleRow("grandparent", capGp, setCapGp)}
              {toggleRow("parent", capP, setCapP)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Bubble listeners</p>
            <div className="space-y-1.5">
              {toggleRow("parent", bubP, setBubP)}
              {toggleRow("grandparent", bubGp, setBubGp)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Interruption</p>
            <select value={interruption} onChange={(e) => setInterruption(e.target.value as Interruption)} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs">
              <option value="none">None: full journey</option>
              <option value="gp-capture">stopPropagation() in grandparent capture</option>
              <option value="parent-bubble">stopPropagation() in parent bubble</option>
            </select>
          </div>
          <div className="flex gap-2">
            <ActionButton busy={playing} disabled={!trial.canUse} onClick={dispatch}>
              <MousePointerClick className="h-4 w-4" /> {playing ? "Playing" : "Dispatch click"}
            </ActionButton>
            <button type="button" onClick={replay} disabled={records.length === 0 || playing} className="rounded-xl border border-border px-4 py-3 text-sm font-bold disabled:opacity-40 hover:border-primary/50">
              Replay
            </button>
          </div>
          <div className="flex gap-4 text-[11px] font-bold">
            <span className="text-sky-500">CAPTURING</span>
            <span className="text-emerald-500">TARGET</span>
            <span className="text-amber-500">BUBBLING</span>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free dispatches left.</p>}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div ref={gpRef} className={cn("rounded-2xl border-2 border-dashed border-border p-5 transition-all duration-300", highlightFor("grandparent"))}>
            <p className="mb-3 font-mono text-xs font-bold text-muted-foreground">grandparent div</p>
            <div ref={pRef} className={cn("rounded-xl border-2 border-dashed border-border p-5 transition-all duration-300", highlightFor("parent"))}>
              <p className="mb-3 font-mono text-xs font-bold text-muted-foreground">parent div</p>
              <div className="flex justify-center">
                <button
                  ref={childRef}
                  type="button"
                  className={cn("rounded-xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground transition-all duration-300", highlightFor("child"))}
                >
                  child button (click target)
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold">Phase log <span className="font-normal text-muted-foreground">(real eventPhase values)</span></p>
              <div className="min-h-[180px] space-y-1.5 rounded-xl bg-black p-3 font-mono text-[11px]">
                {records.length === 0 ? (
                  <p className="text-muted-foreground">// press "Dispatch click"</p>
                ) : (
                  records.slice(0, animIndex + 1).map((r, i) => (
                    <p key={i} className={PHASE_META[r.phase]?.color}>
                      {i + 1}. {r.level} <span className="text-muted-foreground">({r.listener} listener)</span> [{PHASE_META[r.phase]?.label}]
                      {i === animIndex && <span className="ml-1 animate-pulse">{"<"}</span>}
                    </p>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Generated code</p>
                <button type="button" onClick={copyCode} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:border-primary/50">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <pre className="max-h-[228px] overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-[11px] leading-relaxed"><code>{code}</code></pre>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Reading the animation</p>
            <p>
              A click travels <span className="font-bold text-sky-500">down</span> from the window through capture listeners,
              hits the <span className="font-bold text-emerald-500">target</span>, then travels{" "}
              <span className="font-bold text-amber-500">up</span> through bubble listeners. Most handlers use bubbling
              (the default). Use capture when a parent must see the event first, and stopPropagation() sparingly:
              it also blocks other components listening higher up. Note: at the target itself, capture and bubble
              listeners fire in registration order.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
