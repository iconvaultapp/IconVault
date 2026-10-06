// /tools/keycode-tester - Press any key and see its full event details.
// Runs fully in your browser, nothing is uploaded.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Keyboard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/keycode-tester";
import toolSeoMeta from "@/lib/tool-seo-meta-data/keycode-tester";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/keycode-tester")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/keycode-tester";
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
  component: KeycodeTesterTool,
});

interface KeyEvent {
  key: string;
  code: string;
  keyCode: number;
  which: number;
  location: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  time: string;
}

const LOCATION_NAMES: Record<number, string> = {
  0: "General",
  1: "Left",
  2: "Right",
  3: "Numpad",
};

function KeycodeTesterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("keycode-tester", isPro);
  const seo = toolSeo;
  const [current, setCurrent] = useState<KeyEvent | null>(null);
  const [history, setHistory] = useState<KeyEvent[]>([]);
  const [focused, setFocused] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      e.preventDefault();
      const ev: KeyEvent = {
        key: e.key === " " ? "Space" : e.key,
        code: e.code,
        keyCode: e.keyCode,
        which: e.which,
        location: e.location,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        time: new Date().toLocaleTimeString(),
      };
      setCurrent(ev);
      setHistory((h) => [ev, ...h].slice(0, 50));
      trial.recordUse();
    },
    [trial],
  );

  useEffect(() => {
    captureRef.current?.focus();
  }, []);

  const clear = () => {
    setHistory([]);
    setCurrent(null);
    toast.message("History cleared");
    captureRef.current?.focus();
  };

  const modifiers = current
    ? [
        current.ctrlKey && "Ctrl",
        current.shiftKey && "Shift",
        current.altKey && "Alt",
        current.metaKey && "Meta",
      ].filter(Boolean)
    : [];

  const rows = current
    ? [
        { label: "key", value: current.key },
        { label: "code", value: current.code },
        { label: "keyCode", value: String(current.keyCode) },
        { label: "which", value: String(current.which) },
        { label: "location", value: `${LOCATION_NAMES[current.location] ?? current.location} (${current.location})` },
        { label: "modifiers", value: modifiers.length > 0 ? modifiers.join(" + ") : "none" },
      ]
    : [];

  return (
    <ToolPageShell toolId="keycode-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Keycode Tester" left={trial.left} />

      <div
        ref={captureRef}
        tabIndex={0}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center outline-none transition focus:border-primary/60"
      >
        <Keyboard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
        <p className="text-lg font-bold">{current ? `You pressed: ${current.key}` : "Press any key"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {focused
            ? "Listening - works for letters, numbers, arrows, function keys and modifiers"
            : "Click here first, then press a key"}
        </p>
      </div>

      {current && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{r.label}</p>
              <p className="mt-1 break-all font-mono text-lg font-bold">{r.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">History ({history.length})</h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keys you press will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Key</th>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">keyCode</th>
                  <th className="py-2 pr-3">which</th>
                  <th className="py-2">Modifiers</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-border/50 font-mono text-[13px] last:border-0">
                    <td className="py-2 pr-3">{h.time}</td>
                    <td className="py-2 pr-3 font-bold">{h.key}</td>
                    <td className="py-2 pr-3">{h.code}</td>
                    <td className="py-2 pr-3">{h.keyCode}</td>
                    <td className="py-2 pr-3">{h.which}</td>
                    <td className="py-2">
                      {[h.ctrlKey && "Ctrl", h.shiftKey && "Shift", h.altKey && "Alt", h.metaKey && "Meta"]
                        .filter(Boolean)
                        .join(" + ") || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free key presses left - runs fully in your browser, nothing is uploaded.
        </p>
      )}
    </ToolPageShell>
  );
}
