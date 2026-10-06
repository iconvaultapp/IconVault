// /tools/navigation-api-playground - Interactive Navigation API lab: live history
// entries, programmatic navigation, intercept and the navigate event log.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Compass, Plus, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/navigation-api-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/navigation-api-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/navigation-api-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/navigation-api-playground";
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
  component: NavTool,
});

interface NavEntry {
  key: string;
  id: string;
  url: string;
  index: number;
  sameDocument: boolean;
}

interface NavEvt {
  t: number;
  msg: string;
  kind: "info" | "ok" | "warn";
}

function readEntries(): NavEntry[] {
  try {
    const nav = (window as unknown as { navigation?: { entries(): { key: string; id: string; url?: string; index: number; sameDocument: boolean }[] } }).navigation;
    if (!nav) return [];
    return nav.entries().map((e) => ({
      key: e.key.slice(0, 8), id: e.id.slice(0, 8), url: e.url ?? location.href,
      index: e.index, sameDocument: e.sameDocument,
    }));
  } catch { return []; }
}

function NavTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("navigation-api-playground", isPro);
  const seo = toolSeo;

  const [supported] = useState(() => typeof window !== "undefined" && "navigation" in window);
  const [entries, setEntries] = useState<NavEntry[]>([]);
  const [events, setEvents] = useState<NavEvt[]>([]);
  const [customPath, setCustomPath] = useState("/tools/navigation-api-playground?demo=1");
  const [intercept, setIntercept] = useState(false);
  const currentIndex = useRef(0);

  const refresh = useCallback(() => {
    const list = readEntries();
    setEntries(list);
    try {
      const nav = (window as unknown as { navigation?: { currentEntry?: { index: number } } }).navigation;
      currentIndex.current = nav?.currentEntry?.index ?? 0;
    } catch { currentIndex.current = 0; }
  }, []);

  useEffect(() => {
    refresh();
    if (!supported) return;
    const nav = (window as unknown as { navigation: EventTarget & { addEventListener(t: string, cb: (e: Event) => void): void; removeEventListener(t: string, cb: (e: Event) => void): void } }).navigation;
    const onNavigate = (e: Event) => {
      const ne = e as unknown as { destination: { url: string }; canIntercept?: boolean; intercept?: (o: unknown) => void; hashChange?: boolean; downloadRequest?: unknown };
      setEvents((p) => [{ t: Date.now(), msg: `navigate -> ${ne.destination.url}`, kind: "info" as const }, ...p].slice(0, 60));
      setTimeout(refresh, 100);
    };
    const onNavigateError = () => setEvents((p) => [{ t: Date.now(), msg: "navigateerror fired", kind: "warn" as const }, ...p].slice(0, 60));
    const onCurrentChange = () => { refresh(); setEvents((p) => [{ t: Date.now(), msg: "currententrychange", kind: "ok" as const }, ...p].slice(0, 60)); };
    nav.addEventListener("navigate", onNavigate);
    nav.addEventListener("navigateerror", onNavigateError);
    nav.addEventListener("currententrychange", onCurrentChange);
    return () => {
      nav.removeEventListener("navigate", onNavigate);
      nav.removeEventListener("navigateerror", onNavigateError);
      nav.removeEventListener("currententrychange", onCurrentChange);
    };
  }, [supported, refresh]);

  const doNavigate = useCallback((url: string, history: "auto" | "push" | "replace" = "push") => {
    const nav = (window as unknown as { navigation?: { navigate(url: string, o?: unknown): { finished: Promise<unknown> } } }).navigation;
    if (!nav) { toast.error("Navigation API is not available here"); return; }
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    const opts: Record<string, unknown> = { history };
    if (intercept) {
      opts["intercept"] = true;
      setEvents((p) => [{ t: Date.now(), msg: `intercepted navigation to ${url} - same-document, no reload`, kind: "ok" as const }, ...p].slice(0, 60));
    }
    nav.navigate(url, opts).finished.then(() => {
      refresh();
      trial.recordUse();
      setEvents((p) => [{ t: Date.now(), msg: `finished: ${url}`, kind: "ok" as const }, ...p].slice(0, 60));
    }).catch((e) => {
      setEvents((p) => [{ t: Date.now(), msg: `navigation rejected: ${e instanceof Error ? e.message : e}`, kind: "warn" as const }, ...p].slice(0, 60));
    });
  }, [intercept, trial, refresh]);

  const traverse = useCallback((delta: -1 | 1) => {
    const nav = (window as unknown as { navigation?: { traverseTo(key: string): { finished: Promise<unknown> } } }).navigation;
    if (!nav) return;
    const target = entries[currentIndex.current + delta];
    if (!target) { toast.info(delta < 0 ? "Nothing to go back to" : "Nothing to go forward to"); return; }
    void nav.traverseTo(target.key).finished.catch(() => undefined);
    setTimeout(refresh, 200);
  }, [entries, refresh]);

  const reloadPage = useCallback(() => {
    const nav = (window as unknown as { navigation?: { reload(): void } }).navigation;
    if (nav) nav.reload();
    else location.reload();
  }, []);

  return (
    <ToolPageShell toolId="navigation-api-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Navigation API" left={trial.left} />

      {!supported && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <strong>The Navigation API is not available here.</strong> It is Chrome/Edge 102+. The explainer below documents entries(), traverseTo() and intercept() for reference.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <h3 className="mb-2 font-bold">Push a navigation</h3>
            <input
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              className="mb-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
            <div className="flex flex-wrap gap-2">
              <ActionButton disabled={!supported || !trial.canUse} onClick={() => doNavigate(customPath, "push")}>
                <Plus className="h-4 w-4" /> navigate()
              </ActionButton>
              <button
                type="button"
                onClick={() => doNavigate(customPath, "replace")}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/50"
              >
                <Compass className="h-4 w-4" /> Replace entry
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={intercept} onChange={(e) => setIntercept(e.target.checked)} className="h-4 w-4 accent-primary" />
              Intercept (same-document, SPA-style - no reload)
            </label>
          </div>

          <div>
            <h3 className="mb-2 font-bold">Traverse</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => traverse(-1)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="button" onClick={() => traverse(1)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50">
                Forward <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={reloadPage} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50">
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">traverseTo() moves by entry key - history entries stay inspectable objects, not just a stack.</p>
          </div>

          <button
            type="button"
            onClick={() => setEvents([])}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50"
          >
            <Trash2 className="h-4 w-4" /> Clear log
          </button>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free navigations left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">History entries ({entries.length})</h3>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries visible. In supported browsers navigation.entries() lists every same-origin history entry.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-auto">
                {entries.map((e) => (
                  <div
                    key={e.key}
                    className={cn(
                      "rounded-xl border px-4 py-2.5 font-mono text-xs",
                      e.index === currentIndex.current ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{e.index === currentIndex.current ? "current - " : ""}index {e.index}</span>
                      <span className="text-muted-foreground">key {e.key} - sameDocument: {e.sameDocument ? "yes" : "no"}</span>
                    </div>
                    <p className="mt-1 break-all text-muted-foreground">{e.url}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">navigate event log</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Push a navigation above. The navigate, navigateerror and currententrychange events land here with timestamps.</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-auto text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{new Date(e.t).toLocaleTimeString()}</span>
                    <span className={cn("break-all text-xs", e.kind === "warn" && "text-amber-600", e.kind === "ok" && "text-green-600")}>{e.msg}</span>
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

export default NavTool;
