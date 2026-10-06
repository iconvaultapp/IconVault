// /tools/mutation-observer-playground - Watch MutationObserver fire live:
// configure the observer options, mutate the sandbox DOM with action
// buttons, read each mutation record, and copy the generated code.
// 100% client-side; trial use is recorded when the code is copied.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/mutation-observer-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/mutation-observer-playground";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/mutation-observer-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/mutation-observer-playground";
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
  component: MutationObserverTool,
});

interface LogEntry {
  id: number;
  time: string;
  type: string;
  target: string;
  detail: string;
}

interface ObsConfig {
  attributes: boolean;
  childList: boolean;
  subtree: boolean;
  characterData: boolean;
  attributeOldValue: boolean;
  characterDataOldValue: boolean;
  attributeFilter: string;
}

const DEFAULT_CONFIG: ObsConfig = {
  attributes: true,
  childList: true,
  subtree: true,
  characterData: true,
  attributeOldValue: true,
  characterDataOldValue: true,
  attributeFilter: "",
};

function describeTarget(node: Node): string {
  if (node instanceof Element) {
    const id = node.id ? `#${node.id}` : "";
    const cls = node.className && typeof node.className === "string" && node.className.trim()
      ? `.${node.className.trim().split(/\s+/).slice(0, 2).join(".")}`
      : "";
    return `<${node.tagName.toLowerCase()}>${id}${cls}`;
  }
  if (node.nodeType === Node.TEXT_NODE) return "#text";
  return node.nodeName;
}

function MutationObserverTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("mutation-observer-playground", isPro);
  const seo = toolSeo;

  const [config, setConfig] = useState<ObsConfig>(DEFAULT_CONFIG);
  const [observing, setObserving] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [counter, setCounter] = useState(0);
  const sandboxRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const logId = useRef(0);

  const pushLog = (entries: LogEntry[]) => {
    setLog((prev) => [...entries, ...prev].slice(0, 200));
  };

  const startObserving = () => {
    const target = sandboxRef.current;
    if (!target) return;
    observerRef.current?.disconnect();
    const opts: MutationObserverInit = {};
    if (config.attributes) opts.attributes = true;
    if (config.childList) opts.childList = true;
    if (config.subtree) opts.subtree = true;
    if (config.characterData) opts.characterData = true;
    if (config.attributeOldValue) opts.attributeOldValue = true;
    if (config.characterDataOldValue) opts.characterDataOldValue = true;
    const filter = config.attributeFilter.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (filter.length > 0) opts.attributeFilter = filter;
    const observer = new MutationObserver((records) => {
      const entries: LogEntry[] = records.map((r) => {
        logId.current += 1;
        let detail = "";
        if (r.type === "attributes") {
          detail = `${r.attributeName ?? ""}${r.oldValue !== null ? ` (was: "${String(r.oldValue).slice(0, 40)}")` : ""}`;
        } else if (r.type === "characterData") {
          detail = r.oldValue !== null ? `was: "${String(r.oldValue).slice(0, 40)}"` : "text changed";
        } else {
          const a = r.addedNodes.length ? `+${r.addedNodes.length}` : "";
          const rm = r.removedNodes.length ? `-${r.removedNodes.length}` : "";
          detail = `${a}${a && rm ? " " : ""}${rm} nodes`;
          if (r.previousSibling || r.nextSibling) detail += " (sibling shift)";
        }
        return {
          id: logId.current,
          time: new Date().toLocaleTimeString(),
          type: r.type,
          target: describeTarget(r.target),
          detail,
        };
      });
      pushLog(entries);
    });
    observer.observe(target, opts);
    observerRef.current = observer;
    setObserving(true);
  };

  const stopObserving = () => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    setObserving(false);
  };

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // Re-observe when the config changes while observing.
  useEffect(() => {
    if (observing) startObserving();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const bump = () => {
    setCounter((c) => {
      const n = c + 1;
      return n;
    });
  };

  const addChild = () => {
    const el = document.createElement("span");
    el.className = "mutation-chip";
    el.textContent = `child ${Date.now() % 100000}`;
    el.style.cssText =
      "display:inline-block;background:#0f766e22;border:1px solid #0f766e55;border-radius:8px;padding:4px 10px;margin:4px;font-size:12px;font-weight:600;";
    sandboxRef.current?.appendChild(el);
    bump();
  };

  const removeChild = () => {
    const box = sandboxRef.current;
    const last = box?.querySelector(".mutation-chip:last-of-type");
    if (last) last.remove();
    else toast.info("No appended children to remove.");
    bump();
  };

  const changeText = () => {
    const t = sandboxRef.current?.querySelector(".mutation-text");
    if (t && t.firstChild) {
      t.firstChild.textContent = `Edited at ${new Date().toLocaleTimeString()}`;
      bump();
    }
  };

  const toggleClass = () => {
    sandboxRef.current?.querySelector(".mutation-text")?.classList.toggle("highlighted");
    bump();
  };

  const setDataAttr = () => {
    const box = sandboxRef.current;
    if (box) {
      const n = Number(box.dataset["clicks"] ?? 0) + 1;
      box.dataset["clicks"] = String(n);
      box.setAttribute("data-last", new Date().toLocaleTimeString());
      bump();
    }
  };

  const deepEdit = () => {
    const deep = sandboxRef.current?.querySelector(".mutation-deep");
    if (deep) {
      deep.textContent = `deep node ${Math.floor(Math.random() * 1000)}`;
      bump();
    }
  };

  const code = useMemo(() => {
    const lines: string[] = [];
    if (config.childList) lines.push("  childList: true,");
    if (config.attributes) lines.push("  attributes: true,");
    if (config.subtree) lines.push("  subtree: true,");
    if (config.characterData) lines.push("  characterData: true,");
    if (config.attributeOldValue) lines.push("  attributeOldValue: true,");
    if (config.characterDataOldValue) lines.push("  characterDataOldValue: true,");
    const filter = config.attributeFilter.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (filter.length > 0) lines.push(`  attributeFilter: [${filter.map((f) => `"${f}"`).join(", ")}],`);
    return `// Observe mutations on any element
const target = document.querySelector("#demo");

const observer = new MutationObserver((records) => {
  for (const r of records) {
    console.log(r.type, r.target);
    if (r.type === "attributes") console.log("attr:", r.attributeName, "was:", r.oldValue);
    if (r.type === "childList")
      console.log("added:", r.addedNodes.length, "removed:", r.removedNodes.length);
    if (r.type === "characterData") console.log("text was:", r.oldValue);
  }
});

observer.observe(target, {
${lines.join("\n") || "  childList: true,"}
});

// Later: observer.disconnect();
`;
  }, [config]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      trial.recordUse();
      toast.success("Observer code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const toggle = (key: keyof ObsConfig) => setConfig((c) => ({ ...c, [key]: !c[key] }));

  const CHECKS: { key: keyof ObsConfig; label: string; hint: string }[] = [
    { key: "childList", label: "childList", hint: "nodes added or removed" },
    { key: "attributes", label: "attributes", hint: "attribute changes" },
    { key: "subtree", label: "subtree", hint: "watch descendants too" },
    { key: "characterData", label: "characterData", hint: "text node edits" },
    { key: "attributeOldValue", label: "attributeOldValue", hint: "record previous value" },
    { key: "characterDataOldValue", label: "characterDataOldValue", hint: "record previous text" },
  ];

  return (
    <ToolPageShell toolId="mutation-observer-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="MutationObserver Playground" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Eye className={cn("h-5 w-5", observing ? "text-green-500" : "text-muted-foreground")} />
        <span className="text-sm font-bold">{observing ? "Observing the sandbox" : "Observer is idle"}</span>
        {!observing ? (
          <button
            type="button"
            onClick={startObserving}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            Start observing
          </button>
        ) : (
          <button
            type="button"
            onClick={stopObserving}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-red-400"
          >
            Stop
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          Mutations: <strong className="text-foreground">{counter}</strong> actions taken,{" "}
          <strong className="text-foreground">{log.length}</strong> records logged
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-bold">Observer options</h2>
            <p className="mb-3 text-xs text-muted-foreground">Changing these re-attaches the observer live.</p>
            <div className="space-y-2.5">
              {CHECKS.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={config[c.key] as boolean}
                    onChange={() => toggle(c.key)}
                    className="mt-0.5 h-4 w-4 accent-teal-600"
                  />
                  <span>
                    <span className="block font-mono text-[13px] font-bold">{c.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-bold text-foreground/80">
                attributeFilter <span className="font-normal text-muted-foreground">(comma separated, empty = all)</span>
              </label>
              <input
                value={config.attributeFilter}
                onChange={(e) => setConfig((c) => ({ ...c, attributeFilter: e.target.value }))}
                placeholder="e.g. class, data-clicks"
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-bold">Mutate the sandbox</h2>
            <p className="mb-3 text-xs text-muted-foreground">Each button performs a real DOM operation.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Append child", fn: addChild },
                { label: "Remove child", fn: removeChild },
                { label: "Change text", fn: changeText },
                { label: "Toggle class", fn: toggleClass },
                { label: "Set data attr", fn: setDataAttr },
                { label: "Edit deep node", fn: deepEdit },
              ].map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.fn}
                  className="rounded-xl border border-border px-3 py-2.5 text-xs font-bold transition hover:border-primary/60 hover:bg-primary/5"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-bold">Live sandbox <span className="font-mono font-normal text-muted-foreground">#demo</span></h2>
          <div
            ref={sandboxRef}
            id="demo"
            className="min-h-[220px] rounded-xl border-2 border-dashed border-border bg-muted/30 p-5"
          >
            <p className="mutation-text rounded-lg bg-card px-3 py-2 text-sm font-semibold shadow-sm">
              This paragraph is text you can change.
            </p>
            <style>{`.mutation-text.highlighted { background: #0f766e; color: white; }`}</style>
            <div className="mt-3 rounded-lg bg-card p-3 text-xs shadow-sm">
              <p className="font-bold">Nested level</p>
              <p className="mutation-deep mt-1 font-mono text-muted-foreground">deep node (subtree target)</p>
            </div>
            <div className="mt-3" aria-label="appended children land here" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Try: disable <code className="font-mono">subtree</code> then hit "Edit deep node" - the
            mutation stops being reported. Or set an <code className="font-mono">attributeFilter</code> of{" "}
            <code className="font-mono">class</code> and toggle the class.
          </p>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Mutation log</h2>
            <button
              type="button"
              onClick={() => setLog([])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/60"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <div className="max-h-[420px] flex-1 space-y-2 overflow-y-auto">
            {log.length === 0 ? (
              <p className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                Start observing, then press a mutate button. Every mutation record lands here.
              </p>
            ) : (
              log.map((e) => (
                <div key={e.id} className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold",
                        e.type === "childList" && "bg-blue-500/15 text-blue-600",
                        e.type === "attributes" && "bg-amber-500/15 text-amber-600",
                        e.type === "characterData" && "bg-purple-500/15 text-purple-600",
                      )}
                    >
                      {e.type}
                    </span>
                    <span className="font-mono text-muted-foreground">{e.time}</span>
                  </div>
                  <p className="mt-1">
                    target <code className="font-mono font-bold">{e.target}</code>
                  </p>
                  <p className="text-muted-foreground">{e.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Generated observer code</h2>
          <button
            type="button"
            onClick={copy}
            disabled={!trial.canUse}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{code}</pre>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
