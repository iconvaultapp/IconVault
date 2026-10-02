// /tools/list-converter - clean up lists: trim, dedupe, sort, change case,
// prefix/suffix, quote, join. Live output, 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ListFilter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/list-converter")({
  head: () => {
    const seo = getToolSeoMeta("list-converter");
    const canonical = "https://iconvault.site/tools/list-converter";
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
  component: ListConverterTool,
});

type CaseOp = "none" | "upper" | "lower" | "title";
type QuoteOp = "none" | "double" | "single";

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function ListConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("list-converter", isPro);
  const seo = getToolSeo("list-converter");

  const [input, setInput] = useState("");
  const [trimLines, setTrimLines] = useState(true);
  const [dropEmpty, setDropEmpty] = useState(true);
  const [dedupe, setDedupe] = useState(true);
  const [sort, setSort] = useState<"none" | "az" | "za">("none");
  const [caseOp, setCaseOp] = useState<CaseOp>("none");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [quotes, setQuotes] = useState<QuoteOp>("none");
  const [delimiter, setDelimiter] = useState("\n");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    let lines = input.split("\n");
    if (trimLines) lines = lines.map((l) => l.trim());
    if (dropEmpty) lines = lines.filter((l) => l.length > 0);
    if (dedupe) {
      const seen = new Set<string>();
      lines = lines.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
    }
    if (sort === "az") lines = [...lines].sort((x, y) => x.localeCompare(y));
    if (sort === "za") lines = [...lines].sort((x, y) => y.localeCompare(x));
    if (caseOp === "upper") lines = lines.map((l) => l.toUpperCase());
    if (caseOp === "lower") lines = lines.map((l) => l.toLowerCase());
    if (caseOp === "title") lines = lines.map(titleCase);
    lines = lines.map((l) => {
      let s = `${prefix}${l}${suffix}`;
      if (quotes === "double") s = `"${s}"`;
      if (quotes === "single") s = `'${s}'`;
      return s;
    });
    return { text: lines.join(delimiter), count: lines.length };
  }, [input, trimLines, dropEmpty, dedupe, sort, caseOp, prefix, suffix, quotes, delimiter]);

  const copy = () => {
    if (!output.text || !trial.canUse) return;
    navigator.clipboard
      .writeText(output.text)
      .then(() => {
        setCopied(true);
        trial.recordUse();
        toast.success("Converted list copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const CheckRow = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 text-sm font-semibold transition hover:border-primary/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {label}
    </label>
  );

  const SegButton = <T extends string>({
    value,
    current,
    label,
    onClick,
  }: {
    value: T;
    current: T;
    label: string;
    onClick: (v: T) => void;
  }) => (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[13px] font-bold transition",
        current === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <ToolPageShell toolId="list-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="List Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Input list</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="One item per line..."
            spellCheck={false}
            className="h-72 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              Output
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {output.count} lines
              </span>
            </span>
            <button
              type="button"
              onClick={copy}
              disabled={!output.text || !trial.canUse}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {output.text ? (
            <textarea
              value={output.text}
              readOnly
              spellCheck={false}
              className="h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <ListFilter className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                Pick operations below and the live output appears here
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <span className="mb-1 block text-sm font-bold">Operations (applied in order)</span>
        <p className="mb-4 text-xs text-muted-foreground">
          Cleanup first, then sort, case, prefix/suffix, quotes, and finally joining.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Cleanup</p>
            <div className="flex flex-wrap gap-2">
              <CheckRow label="Trim lines" checked={trimLines} onChange={setTrimLines} />
              <CheckRow label="Drop empty lines" checked={dropEmpty} onChange={setDropEmpty} />
              <CheckRow label="Remove duplicates" checked={dedupe} onChange={setDedupe} />
            </div>

            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Sort</p>
            <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
              <SegButton value="none" current={sort} label="None" onClick={setSort} />
              <SegButton value="az" current={sort} label="A to Z" onClick={setSort} />
              <SegButton value="za" current={sort} label="Z to A" onClick={setSort} />
            </div>

            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Case</p>
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
              <SegButton value="none" current={caseOp} label="Keep" onClick={setCaseOp} />
              <SegButton value="upper" current={caseOp} label="UPPER" onClick={setCaseOp} />
              <SegButton value="lower" current={caseOp} label="lower" onClick={setCaseOp} />
              <SegButton value="title" current={caseOp} label="Title" onClick={setCaseOp} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Wrap</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Prefix</span>
                <input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. item-"
                  spellCheck={false}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Suffix</span>
                <input
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="e.g. .com"
                  spellCheck={false}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                />
              </label>
            </div>

            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quotes</p>
            <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
              <SegButton value="none" current={quotes} label="None" onClick={setQuotes} />
              <SegButton value="double" current={quotes} label='"double"' onClick={setQuotes} />
              <SegButton value="single" current={quotes} label="'single'" onClick={setQuotes} />
            </div>

            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Join with</p>
            <input
              value={delimiter === "\n" ? "" : delimiter}
              onChange={(e) => setDelimiter(e.target.value === "" ? "\n" : e.target.value)}
              placeholder="Newline (or , ; | ...)"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Leave empty for one item per line.</p>
          </div>
        </div>

        {!isPro && (
          <p className="mt-4 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs in your browser, nothing is uploaded.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
