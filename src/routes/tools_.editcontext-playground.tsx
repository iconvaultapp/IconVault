// /tools/editcontext-playground - Real EditContext API lab: a working custom text
// editor wired to EditContext with IME composition events, bounds updates and a log.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Keyboard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/editcontext-playground")({
  head: () => {
    const seo = getToolSeoMeta("editcontext-playground");
    const canonical = "https://iconvault.site/tools/editcontext-playground";
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
  component: EditContextTool,
});

/* Minimal EditContext typings (not in TS lib.dom). */
interface EditContextInit {
  text?: string;
  selectionStart?: number;
  selectionEnd?: number;
}
interface TextUpdateEvent extends Event {
  updateRangeStart: number;
  updateRangeEnd: number;
  text: string;
}
interface CharacterBoundsEvent extends Event {
  rangeStart: number;
  rangeEnd: number;
}
interface EditContextLike extends EventTarget {
  readonly text: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  updateText(start: number, end: number, text: string): void;
  updateSelection(start: number, end: number): void;
  updateControlBounds(rect: DOMRect): void;
  updateSelectionBounds(rect: DOMRect): void;
  updateCharacterBounds(rangeStart: number, rects: DOMRect[]): void;
}
type EditContextCtor = new (init?: EditContextInit) => EditContextLike;

type LogEntry = { t: string; name: string; detail: string };

const DEMO_TEXT = "Edit me. Try an IME (e.g. Japanese or emoji picker) to watch composition events.";

function EditContextTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("editcontext-playground", isPro);
  const seo = getToolSeo("editcontext-playground");

  const [supported] = useState(() => typeof window !== "undefined" && "EditContext" in window);
  const [text, setText] = useState(DEMO_TEXT);
  const [sel, setSel] = useState({ start: DEMO_TEXT.length, end: DEMO_TEXT.length });
  const [composing, setComposing] = useState(false);
  const [attached, setAttached] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const ecRef = useRef<EditContextLike | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef({ text: DEMO_TEXT, sel: { start: DEMO_TEXT.length, end: DEMO_TEXT.length } });
  stateRef.current = { text, sel };

  const push = useCallback((name: string, detail: string) => {
    setLog((p) => [...p.slice(-60), { t: new Date().toLocaleTimeString(), name, detail }]);
  }, []);

  const syncBounds = useCallback(() => {
    const ec = ecRef.current;
    const box = boxRef.current;
    if (!ec || !box) return;
    ec.updateControlBounds(box.getBoundingClientRect());
    const caret = caretRef.current;
    if (caret) ec.updateSelectionBounds(caret.getBoundingClientRect());
  }, []);

  /** Local edit (physical keyboard): update model, then push to the EditContext. */
  const applyEdit = useCallback(
    (start: number, end: number, insert: string) => {
      const { text: cur } = stateRef.current;
      const next = cur.slice(0, start) + insert + cur.slice(end);
      const caret = start + insert.length;
      setText(next);
      setSel({ start: caret, end: caret });
      const ec = ecRef.current;
      if (ec) {
        ec.updateText(start, end, insert);
        ec.updateSelection(caret, caret);
        push("updateText()", `range [${start}, ${end}) <- ${JSON.stringify(insert)}`);
      }
      requestAnimationFrame(syncBounds);
    },
    [push, syncBounds],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!supported) return;
      const { text: cur, sel: s } = stateRef.current;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        applyEdit(s.start, s.end, e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (s.start === s.end && s.start > 0) applyEdit(s.start - 1, s.start, "");
        else if (s.start !== s.end) applyEdit(s.start, s.end, "");
      } else if (e.key === "Delete") {
        e.preventDefault();
        if (s.start === s.end && s.start < cur.length) applyEdit(s.start, s.start + 1, "");
        else if (s.start !== s.end) applyEdit(s.start, s.end, "");
      } else if (e.key === "Enter") {
        e.preventDefault();
        applyEdit(s.start, s.end, "\n");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const c = Math.max(0, s.start - 1);
        setSel({ start: c, end: e.shiftKey ? s.end : c });
        ecRef.current?.updateSelection(c, e.shiftKey ? s.end : c);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const c = Math.min(cur.length, s.end + 1);
        setSel({ start: e.shiftKey ? s.start : c, end: c });
        ecRef.current?.updateSelection(e.shiftKey ? s.start : c, c);
      } else if (e.key === "Home") {
        e.preventDefault();
        setSel({ start: 0, end: e.shiftKey ? s.end : 0 });
        ecRef.current?.updateSelection(0, e.shiftKey ? s.end : 0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSel({ start: e.shiftKey ? s.start : cur.length, end: cur.length });
        ecRef.current?.updateSelection(e.shiftKey ? s.start : cur.length, cur.length);
      }
    },
    [applyEdit, supported],
  );

  /* Attach the real EditContext once. */
  useEffect(() => {
    const box = boxRef.current;
    if (!supported || !box || ecRef.current) return;
    const Ctor = (window as unknown as { EditContext: EditContextCtor }).EditContext;
    const ec = new Ctor({ text: DEMO_TEXT, selectionStart: DEMO_TEXT.length, selectionEnd: DEMO_TEXT.length });
    (box as unknown as { editContext: EditContextLike | null }).editContext = ec;
    ecRef.current = ec;
    setAttached(true);

    const onTextUpdate = (ev: Event) => {
      const u = ev as TextUpdateEvent;
      const { text: cur } = stateRef.current;
      const next = cur.slice(0, u.updateRangeStart) + u.text + cur.slice(u.updateRangeEnd);
      const caret = u.updateRangeStart + u.text.length;
      setText(next);
      setSel({ start: caret, end: caret });
      push("textupdate", `range [${u.updateRangeStart}, ${u.updateRangeEnd}) <- ${JSON.stringify(u.text)} (from IME / virtual keyboard)`);
    };
    const onTextFormat = () => push("textformatupdate", "formatting range changed");
    const onBounds = (ev: Event) => {
      const b = ev as CharacterBoundsEvent;
      const caret = caretRef.current;
      const rect = caret ? caret.getBoundingClientRect() : new DOMRect();
      ec.updateCharacterBounds(b.rangeStart, [rect]);
      push("characterboundsupdate", `rangeStart=${b.rangeStart} -> answered with caret rect`);
    };
    const onCompStart = () => { setComposing(true); push("compositionstart", "IME session began"); };
    const onCompEnd = () => { setComposing(false); push("compositionend", "IME session committed"); };

    ec.addEventListener("textupdate", onTextUpdate);
    ec.addEventListener("textformatupdate", onTextFormat);
    ec.addEventListener("characterboundsupdate", onBounds);
    ec.addEventListener("compositionstart", onCompStart);
    ec.addEventListener("compositionend", onCompEnd);
    push("attach", "EditContext created and attached to the editor div");

    const t = window.setTimeout(syncBounds, 100);
    return () => {
      window.clearTimeout(t);
      ec.removeEventListener("textupdate", onTextUpdate);
      ec.removeEventListener("textformatupdate", onTextFormat);
      ec.removeEventListener("characterboundsupdate", onBounds);
      ec.removeEventListener("compositionstart", onCompStart);
      ec.removeEventListener("compositionend", onCompEnd);
      (box as unknown as { editContext: EditContextLike | null }).editContext = null;
      ecRef.current = null;
    };
  }, [supported, push, syncBounds]);

  const focusEditor = () => {
    if (!trial.canUse) return;
    if (!supported) {
      toast.error("EditContext is not supported in this browser.");
      return;
    }
    boxRef.current?.focus();
    trial.recordUse();
  };

  const selectAll = () => {
    const n = stateRef.current.text.length;
    setSel({ start: 0, end: n });
    ecRef.current?.updateSelection(0, n);
  };

  const clear = () => {
    const n = stateRef.current.text.length;
    applyEdit(0, n, "");
  };

  const before = text.slice(0, Math.min(sel.start, sel.end));
  const selected = text.slice(Math.min(sel.start, sel.end), Math.max(sel.start, sel.end));
  const after = text.slice(Math.max(sel.start, sel.end));

  return (
    <ToolPageShell toolId="editcontext-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="EditContext" left={trial.left} />

      {!supported && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-amber-50 p-5 text-sm dark:bg-amber-950/20">
          <p className="font-bold">EditContext is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">
            It needs Chrome or Edge 121 and later. The editor below is a read-only preview of what the wiring looks like.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Editor controls</h3>
            </div>
            <ActionButton disabled={!trial.canUse || !supported} onClick={focusEditor}>
              <Keyboard className="h-4 w-4" /> Focus editor
            </ActionButton>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clear}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
              >
                Clear
              </button>
            </div>
            <div className="rounded-xl bg-background p-3 font-mono text-xs">
              <p className="text-muted-foreground">attached: <span className={cn("font-bold", attached ? "text-emerald-500" : "text-red-500")}>{attached ? "yes" : "no"}</span></p>
              <p className="text-muted-foreground">composing: <span className={cn("font-bold", composing ? "text-amber-500" : "text-foreground")}>{composing ? "yes (IME active)" : "no"}</span></p>
              <p className="text-muted-foreground">selection: <span className="font-bold text-foreground">[{sel.start}, {sel.end}]</span></p>
              <p className="text-muted-foreground">chars: <span className="font-bold text-foreground">{text.length}</span></p>
            </div>
            {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free sessions left.</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <p><strong className="text-foreground">What EditContext does:</strong> it separates text input from the DOM. You keep your own text model and caret, and the browser routes keyboards, IMEs and autocorrect through textupdate events instead of mutating your DOM.</p>
            <p className="mt-2">That is how canvas-based editors (docs apps, code editors, design tools) get native IME and mobile keyboard support without a hidden textarea.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Custom editor (wired to the real EditContext)</h3>
            <div
              ref={boxRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              className="min-h-[180px] whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-4 font-mono text-sm leading-relaxed outline-none focus:border-primary"
            >
              {before}
              {selected ? (
                <span className="rounded bg-primary/30">{selected}</span>
              ) : (
                <span ref={caretRef} className="caret-blink -mb-0.5 inline-block h-[1.1em] w-[2px] bg-primary align-baseline" />
              )}
              {after}
              <style>{`.caret-blink { animation: caretBlink 1.1s steps(2, start) infinite; } @keyframes caretBlink { to { visibility: hidden; } }`}</style>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Type, use Backspace and arrow keys, or open an IME / the emoji picker (Win + . or Cmd + Ctrl + Space) to fire real composition events.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">EditContext event log</h3>
              <button
                type="button"
                onClick={() => setLog([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            <div className="h-56 space-y-1.5 overflow-y-auto rounded-xl bg-background p-3 font-mono text-xs">
              {log.length === 0 && <p className="text-muted-foreground">Focus the editor and type: every EditContext event lands here.</p>}
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
      </div>
    </ToolPageShell>
  );
}
