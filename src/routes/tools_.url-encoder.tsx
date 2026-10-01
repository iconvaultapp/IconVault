// /tools/url-encoder - encode/decode URL components and full URLs.
// 100% client-side, nothing is sent anywhere.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/url-encoder")({
  head: () => {
    const seo = getToolSeoMeta("url-encoder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: UrlEncoderTool,
});

type Mode = "component" | "full" | "decode";

const MODE_LABELS: Record<Mode, string> = {
  component: "encodeURIComponent (query param)",
  full: "encodeURI (full URL)",
  decode: "Decode",
};

const MODE_HINTS: Record<Mode, string> = {
  component: "Encodes everything unsafe - use for a single query value or form field.",
  full: "Keeps : / ? & = # intact - use for a whole URL.",
  decode: "Turns %XX sequences back into readable characters.",
};

function UrlEncoderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("url-encoder", isPro);
  const seo = getToolSeo("url-encoder");

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("component");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (!trial.canUse) return;
    if (!input) {
      setError("Enter some text first.");
      return;
    }
    try {
      let result: string;
      if (mode === "component") result = encodeURIComponent(input);
      else if (mode === "full") result = encodeURI(input);
      else {
        try {
          result = decodeURIComponent(input);
        } catch {
          result = decodeURI(input); // fall back for full-URL encodings
        }
      }
      setOutput(result);
      setError(null);
      trial.recordUse();
    } catch {
      setError("Could not process the input - it may contain a malformed % sequence.");
    }
  };

  const copy = () => {
    navigator.clipboard
      .writeText(output)
      .then(() => toast.success("Output copied"))
      .catch(() => toast.error("Copy failed"));
  };

  const swap = () => {
    setInput(output);
    setOutput("");
  };

  return (
    <ToolPageShell toolId="url-encoder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="URL Encoder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
                <option key={m} value={m}>{MODE_LABELS[m]}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">{MODE_HINTS[mode]}</p>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Input</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://example.com/?q=hello world&tag=café"
              rows={7}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-primary"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton disabled={!input || !trial.canUse} onClick={run}>
              <Link2 className="h-4 w-4" /> {mode === "decode" ? "Decode" : "Encode"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free encodes left - all processing happens in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground/80">Output</span>
            {output && (
              <div className="flex gap-2">
                <button
                  type="button" onClick={swap}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Use as input
                </button>
                <button
                  type="button" onClick={copy}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            rows={7}
            spellCheck={false}
            placeholder="The result appears here…"
            className="w-full resize-y rounded-xl border border-border bg-muted/40 px-3 py-2.5 font-mono text-xs break-all outline-none"
          />
          {output && (
            <p className="mt-3 text-xs text-muted-foreground">
              Input: <span className="font-mono">{input.length}</span> chars → Output:{" "}
              <span className="font-mono">{output.length}</span> chars
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
