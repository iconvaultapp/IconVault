// /tools/fullscreen-playground - Real Fullscreen API lab: requestFullscreen on a
// chosen element, navigationUI options, live state, :fullscreen CSS and event log.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Maximize, Minimize2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/fullscreen-playground")({
  head: () => {
    const seo = getToolSeoMeta("fullscreen-playground");
    const canonical = "https://iconvault.site/tools/fullscreen-playground";
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
  component: FullscreenTool,
});

type LogEntry = { t: string; name: string; detail: string };
type NavUI = "auto" | "hide" | "show";
type Target = "demo" | "page";

function FullscreenTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("fullscreen-playground", isPro);
  const seo = getToolSeo("fullscreen-playground");

  const [supported] = useState(() => typeof document !== "undefined" && "fullscreenEnabled" in document);
  const [enabled] = useState(() => typeof document !== "undefined" && document.fullscreenEnabled);
  const [isFs, setIsFs] = useState(false);
  const [fsTag, setFsTag] = useState("");
  const [navUI, setNavUI] = useState<NavUI>("auto");
  const [target, setTarget] = useState<Target>("demo");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const demoRef = useRef<HTMLDivElement>(null);

  const push = useCallback((name: string, detail: string) => {
    setLog((p) => [...p.slice(-60), { t: new Date().toLocaleTimeString(), name, detail }]);
  }, []);

  useEffect(() => {
    const onChange = () => {
      const el = document.fullscreenElement;
      setIsFs(!!el);
      setFsTag(el ? el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") : "");
      push("fullscreenchange", el ? `entered: <${el.tagName.toLowerCase()}>` : "exited fullscreen");
    };
    const onError = () => push("fullscreenerror", "the request was rejected");
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("fullscreenerror", onError);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("fullscreenerror", onError);
    };
  }, [push]);

  const enter = useCallback(async () => {
    if (!trial.canUse || busy || !supported) return;
    const el = target === "demo" ? demoRef.current : document.documentElement;
    if (!el) return;
    setBusy(true);
    try {
      const opts: FullscreenOptions = navUI === "auto" ? {} : { navigationUI: navUI };
      await el.requestFullscreen(opts);
      trial.recordUse();
      push("requestFullscreen()", `target=${target}, navigationUI=${navUI}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fullscreen request failed.");
      push("requestFullscreen()", `rejected: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [trial, busy, supported, target, navUI, push]);

  const exit = useCallback(async () => {
    try {
      await document.exitFullscreen();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not exit fullscreen.");
    }
  }, []);

  return (
    <ToolPageShell toolId="fullscreen-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Fullscreen" left={trial.left} />

      {!supported && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-amber-50 p-5 text-sm dark:bg-amber-950/20">
          <p className="font-bold">The Fullscreen API is not available here.</p>
          <p className="mt-1 text-muted-foreground">It is supported in all modern browsers, so this usually means an embedded frame blocked it.</p>
        </div>
      )}
      {!enabled && supported && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-amber-50 p-5 text-sm dark:bg-amber-950/20">
          <p className="font-bold">Fullscreen is disabled for this page.</p>
          <p className="mt-1 text-muted-foreground">document.fullscreenEnabled is false, likely because an iframe ancestor lacks the fullscreen allow attribute.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">Fullscreen controls</h3>
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Element</p>
              <div className="flex gap-2">
                {(["demo", "page"] as Target[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTarget(t)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition",
                      target === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {t === "demo" ? "Demo box" : "Whole page"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">navigationUI</p>
              <div className="flex gap-2">
                {(["auto", "hide", "show"] as NavUI[]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNavUI(n)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition",
                      navUI === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Controls whether the browser chrome stays visible. "hide" only applies to page fullscreen.</p>
            </div>
            {!isFs ? (
              <ActionButton busy={busy} disabled={!trial.canUse || !supported || !enabled} onClick={() => void enter()}>
                <Maximize className="h-4 w-4" /> {busy ? "Requesting..." : "Go fullscreen"}
              </ActionButton>
            ) : (
              <button
                type="button"
                onClick={() => void exit()}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-primary/40"
              >
                <Minimize2 className="h-4 w-4" /> Exit fullscreen
              </button>
            )}
            <div className="rounded-xl bg-background p-3 font-mono text-xs">
              <p className="text-muted-foreground">
                fullscreenElement: <span className="font-bold text-foreground">{isFs ? fsTag : "(none)"}</span>
              </p>
              <p className="text-muted-foreground">
                fullscreenEnabled: <span className={cn("font-bold", enabled ? "text-emerald-500" : "text-red-500")}>{String(enabled)}</span>
              </p>
            </div>
            {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free fullscreen runs left.</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Event log</h3>
              <button
                type="button"
                onClick={() => setLog([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            <div className="h-48 space-y-1.5 overflow-y-auto rounded-xl bg-background p-3 font-mono text-xs">
              {log.length === 0 && <p className="text-muted-foreground">Enter fullscreen (or press Esc while fullscreen) to see the events.</p>}
              {log.map((e, i) => (
                <p key={i}>
                  <span className="font-bold text-primary">{e.name}</span>{" "}
                  <span className="text-muted-foreground">[{e.t}]</span>{" "}
                  <span className="text-foreground/80">{e.detail}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Demo element</h3>
            <div
              id="fs-demo"
              ref={demoRef}
              className="flex min-h-[320px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-teal-500/20 p-8 text-center"
            >
              <Maximize className="mb-3 h-10 w-10 text-primary" />
              <p className="text-lg font-extrabold">This box can go fullscreen</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                When this element is the fullscreen element, the <span className="font-mono">:fullscreen</span> rule below restyles it. Press Esc to exit, the browser always reserves that.
              </p>
            </div>
            <style>{`
              #fs-demo:fullscreen {
                background: linear-gradient(135deg, #0f766e, #134e4a);
                color: white;
                border-radius: 0;
              }
              #fs-demo:fullscreen .fs-note { color: rgba(255,255,255,0.75); }
            `}</style>
            <p className="fs-note mt-3 text-xs text-muted-foreground">
              The box uses a real <span className="font-mono">#fs-demo:fullscreen</span> CSS rule, so its restyle in fullscreen mode is pure CSS, no JavaScript.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Rules worth knowing:</strong> requestFullscreen must come from a user gesture, returns a promise, and can be denied by Permissions Policy or an iframe without <span className="font-mono">allow="fullscreen"</span>.</p>
            <p className="mt-2">Only one element is fullscreen at a time. Exiting fires fullscreenchange on the document, and the previous element gets its original styles back automatically.</p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
