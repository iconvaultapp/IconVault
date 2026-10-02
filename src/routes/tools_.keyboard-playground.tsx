// /tools/keyboard-playground - Interactive Keyboard API lab: layout map dump,
// live key event inspector, shortcut matcher and dead-key detection.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Keyboard, LayoutGrid, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/keyboard-playground")({
  head: () => {
    const seo = getToolSeoMeta("keyboard-playground");
    const canonical = "https://iconvault.site/tools/keyboard-playground";
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
  component: KeyboardTool,
});

interface KeyEvt {
  t: number;
  type: string;
  code: string;
  key: string;
  keyCode: number;
  location: number;
  repeat: boolean;
  mods: string;
}

function locationName(l: number) {
  return l === 1 ? "left" : l === 2 ? "right" : l === 3 ? "numpad" : "standard";
}

function KeyboardTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("keyboard-playground", isPro);
  const seo = getToolSeo("keyboard-playground");

  const [layoutSupported] = useState(() => typeof navigator !== "undefined" && !!(navigator as unknown as { keyboard?: { getLayoutMap?: unknown } }).keyboard?.getLayoutMap);
  const [layout, setLayout] = useState<[string, string][]>([]);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [events, setEvents] = useState<KeyEvt[]>([]);
  const [lastKey, setLastKey] = useState<KeyEvt | null>(null);
  const [combo, setCombo] = useState("");
  const [comboHit, setComboHit] = useState(false);
  const [comboTries, setComboTries] = useState(0);

  const push = useCallback((e: KeyEvt) => {
    setEvents((p) => [e, ...p].slice(0, 50));
    setLastKey(e);
  }, []);

  useEffect(() => {
    const modsOf = (e: KeyboardEvent) =>
      [e.ctrlKey && "ctrl", e.altKey && "alt", e.shiftKey && "shift", e.metaKey && "meta"].filter(Boolean).join("+");
    const onDown = (e: KeyboardEvent) => {
      const rec: KeyEvt = {
        t: Date.now(), type: "keydown", code: e.code, key: e.key,
        keyCode: e.keyCode, location: e.location, repeat: e.repeat, mods: modsOf(e) || "none",
      };
      push(rec);
      // shortcut matcher
      const want = combo.trim().toLowerCase();
      if (want) {
        setComboTries((n) => n + 1);
        const parts = want.split("+");
        const wantMods = parts.slice(0, -1);
        const wantKey = parts[parts.length - 1]!;
        const mods = modsOf(e).split("+").filter(Boolean);
        const match = wantMods.every((m) => mods.includes(m)) && mods.length === wantMods.length &&
          (wantKey === e.key.toLowerCase() || wantKey === e.code.toLowerCase());
        setComboHit(match);
      }
    };
    const onUp = (e: KeyboardEvent) => push({
      t: Date.now(), type: "keyup", code: e.code, key: e.key,
      keyCode: e.keyCode, location: e.location, repeat: false, mods: "none",
    });
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [combo, push]);

  const loadLayout = useCallback(async () => {
    if (!layoutSupported) { toast.error("navigator.keyboard.getLayoutMap() is not supported here"); return; }
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    setLayoutBusy(true);
    try {
      const kb = (navigator as unknown as { keyboard: { getLayoutMap(): Promise<Map<string, string>> } }).keyboard;
      const map = await kb.getLayoutMap();
      setLayout([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
      trial.recordUse();
      toast.success(`Layout map loaded: ${map.size} physical keys`);
    } catch (e) {
      toast.error("Could not read the layout map", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLayoutBusy(false);
    }
  }, [layoutSupported, trial]);

  const deadKeys = layout.filter(([, v]) => v === "Dead");

  return (
    <ToolPageShell toolId="keyboard-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Keyboard API" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">Layout map</h3>
              <ActionButton busy={layoutBusy} disabled={!layoutSupported || !trial.canUse} onClick={() => void loadLayout()}>
                <LayoutGrid className="h-4 w-4" /> {layoutBusy ? "Reading…" : "Read layout map"}
              </ActionButton>
            </div>
            <p className="text-xs text-muted-foreground">
              <code>getLayoutMap()</code> maps physical key codes to the character your OS layout produces.
              {deadKeys.length > 0 && ` Found ${deadKeys.length} dead keys (accent compositors like ´, ^).`}
            </p>
            {deadKeys.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {deadKeys.map(([code]) => (
                  <span key={code} className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-xs text-amber-600">{code}</span>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 font-bold">Shortcut tester</h3>
            <input
              value={combo}
              onChange={(e) => { setCombo(e.target.value); setComboHit(false); setComboTries(0); }}
              
              placeholder="e.g. ctrl+shift+k"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Type a combo, then press the keys anywhere on the page. {comboTries > 0 && (comboHit
                ? <span className="font-bold text-green-600">Matched!</span>
                : <span className="text-amber-600">No match yet ({comboTries} keypresses).</span>)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => { setEvents([]); setLastKey(null); }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50"
          >
            <Trash2 className="h-4 w-4" /> Clear log
          </button>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free layout reads left - key events are unlimited.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold"><Keyboard className="h-4 w-4 text-primary" /> Live key inspector - press any key</h3>
            {lastKey ? (
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[
                  ["code", lastKey.code],
                  ["key", lastKey.key === " " ? "Space" : lastKey.key],
                  ["keyCode", String(lastKey.keyCode)],
                  ["location", locationName(lastKey.location)],
                  ["modifiers", lastKey.mods],
                  ["repeat", lastKey.repeat ? "yes" : "no"],
                  ["type", lastKey.type],
                  ["dead key?", lastKey.key === "Dead" ? "yes" : "no"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted/60 p-2.5">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-mono font-bold">{v}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click here, then press keys. Held keys show repeat events; dead keys (like ´ on some layouts) show key = "Dead".</p>
            )}
          </div>

          {layout.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 font-bold">Layout map - {layout.length} physical keys</h3>
              <div className="max-h-64 overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr><th className="px-4 py-2 text-left font-mono text-xs">code (physical)</th><th className="px-4 py-2 text-left font-mono text-xs">key (your layout)</th></tr>
                  </thead>
                  <tbody>
                    {layout.map(([code, key]) => (
                      <tr key={code} className={cn("border-t border-border", key === "Dead" && "bg-amber-500/10")}>
                        <td className="px-4 py-1.5 font-mono">{code}</td>
                        <td className="px-4 py-1.5 font-mono">{key === " " ? "Space" : key}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Event stream</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">keydown and keyup events will stream here.</p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-auto text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 rounded-lg bg-muted/60 px-3 py-1.5 font-mono text-xs">
                    <span className={cn("font-bold", e.type === "keydown" ? "text-sky-600" : "text-muted-foreground")}>{e.type}</span>
                    <span>code={e.code}</span><span>key={e.key === " " ? "Space" : e.key}</span><span>mods={e.mods}</span>{e.repeat && <span className="text-amber-600">repeat</span>}
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

export default KeyboardTool;
