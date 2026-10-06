// /tools/markdown-formatter - tidy markdown: heading spacing, list markers,
// trailing whitespace, blank-line runs. Fenced code blocks are left untouched.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/markdown-formatter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/markdown-formatter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/markdown-formatter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/markdown-formatter";
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
  component: MarkdownFormatterTool,
});

interface FormatResult {
  out: string;
  changes: number;
}

function formatMarkdown(src: string): FormatResult {
  const lines = src.split("\n");
  const out: string[] = [];
  let changes = 0;
  let inFence = false;
  let blankRun = 0;

  for (const raw of lines) {
    // Fenced code blocks: toggle on ``` lines, leave everything inside untouched.
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      blankRun = 0;
      out.push(raw);
      continue;
    }
    if (inFence) {
      out.push(raw);
      continue;
    }

    // Trim trailing whitespace.
    let line = raw.replace(/[ \t]+$/, "");
    if (line !== raw) changes++;

    // Ensure exactly one space after leading #'s: "##Title" -> "## Title".
    const heading = /^(#{1,6})(\S)/.exec(line);
    if (heading) {
      const hashes = heading[1] ?? "";
      line = `${hashes} ${line.slice(hashes.length)}`;
      changes++;
    }

    // Normalize list markers to "-", preserving indentation (tabs become 2 spaces).
    const list = /^([ \t]*)([-*+])(\s+)/.exec(line);
    if (list) {
      const indent = (list[1] ?? "").replace(/\t/g, "  ");
      const rest = line.slice(list[0].length);
      const normalized = `${indent}- ${rest}`;
      if (normalized !== line) changes++;
      line = normalized;
    }

    // Collapse 3+ consecutive blank lines down to 2.
    if (line.trim() === "") {
      blankRun++;
      if (blankRun > 2) {
        changes++;
        continue;
      }
      out.push("");
      continue;
    }
    blankRun = 0;
    out.push(line);
  }

  // Ensure the file ends with exactly one newline.
  let text = out.join("\n");
  const trimmedEnd = text.replace(/\n+$/, "");
  if (trimmedEnd !== text) changes++;
  text = `${trimmedEnd}\n`;

  return { out: text, changes };
}

function MarkdownFormatterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("markdown-formatter", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [changeCount, setChangeCount] = useState(0);
  const [ran, setRan] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!trial.canUse) return;
    if (!input) {
      toast.error("Paste some markdown first");
      return;
    }
    const { out, changes } = formatMarkdown(input);
    setOutput(out);
    setChangeCount(changes);
    setRan(true);
    setCopied(false);
    trial.recordUse();
    toast.success(
      changes === 0
        ? "Markdown is already tidy"
        : `${changes} improvement${changes === 1 ? "" : "s"} applied`,
    );
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        toast.success("Formatted markdown copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="markdown-formatter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Markdown Formatter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"##My heading\n\n* item one\n*item two\n\nSome text with trailing spaces.   \n"}
            spellCheck={false}
            className="h-64 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Formatted</span>
            <button
              type="button"
              onClick={copy}
              disabled={!output}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {ran ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              placeholder="Formatted markdown appears here..."
              className="h-64 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <FileText className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                Formatted markdown appears here
              </p>
            </div>
          )}
        </div>
      </div>

      {ran && (
        <p className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{changeCount}</span>{" "}
          improvement{changeCount === 1 ? "" : "s"} applied - heading spacing, list markers,
          trailing whitespace, blank-line runs, final newline. Fenced code blocks untouched.
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton disabled={!trial.canUse} onClick={run}>
            <Sparkles className="h-4 w-4" /> Format markdown
          </ActionButton>
        </div>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - everything runs in your browser, nothing is uploaded.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
