// /tools/css-custom-highlights - Style text ranges with the CSS Custom Highlight
// API: ::highlight() for search hits, spellcheck marks and syntax coloring.
// Free, client-side only. Needs CSS.highlights support (feature-detected).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, Search, SpellCheck, Code2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-custom-highlights";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-custom-highlights";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-custom-highlights")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-custom-highlights";
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
  component: HighlightsTool,
});

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    return true;
  } catch {
    toast.error("Copy failed. Select the code manually.");
    return false;
  }
}

const HL_CSS = `/* 1. Define how each highlight name looks */
::highlight(search-hit) {
  background: #fde047;
  color: #1c1917;
  border-radius: 2px;
}

::highlight(spell-error) {
  background: transparent;
  text-decoration: underline wavy #ef4444 2px;
  text-underline-offset: 3px;
}

::highlight(code-keyword) {
  color: #c084fc;
  font-weight: 700;
}

::highlight(code-string) {
  color: #86efac;
}

::highlight(code-comment) {
  color: #6b7280;
  font-style: italic;
}

/* 2. Register ranges from JavaScript */
function highlightMatches(root, query) {
  CSS.highlights.delete("search-hit");
  if (!query) return;
  const ranges = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    let i = node.textContent.toLowerCase().indexOf(query.toLowerCase());
    while (i >= 0) {
      const r = new Range();
      r.setStart(node, i);
      r.setEnd(node, i + query.length);
      ranges.push(r);
      i = node.textContent.toLowerCase().indexOf(query.toLowerCase(), i + query.length);
    }
  }
  CSS.highlights.set("search-hit", new Highlight(...ranges));
}`;

const SAMPLE =
  "The quick brown fox jumps over the lazy dog. The fox was very quick that day, and the dog watched the quick fox run. Highlighting every occurrence of a word is what the Custom Highlight API was built for.";

const MISSPELLED = ["recieve", "definately", "occured", "seperate"];
const SPELL_TEXT =
  "Please recieve the package and definately check the list. It occured to me that we should seperate these items before shipping.";

const CODE_SAMPLE = `function greet(name) {
  // say hello to the user
  const message = "Hello, " + name + "!";
  return message;
}`;

function textNodes(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    out.push(n as Text);
    n = walker.nextNode();
  }
  return out;
}

function rangesFor(root: HTMLElement, words: string[]): Range[] {
  const ranges: Range[] = [];
  for (const node of textNodes(root)) {
    const text = node.textContent ?? "";
    for (const w of words) {
      let i = text.toLowerCase().indexOf(w.toLowerCase());
      while (i >= 0) {
        const r = new Range();
        r.setStart(node, i);
        r.setEnd(node, i + w.length);
        ranges.push(r);
        i = text.toLowerCase().indexOf(w.toLowerCase(), i + w.length);
      }
    }
  }
  return ranges;
}

function HighlightsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-custom-highlights", isPro);
  const seo = toolSeo;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [query, setQuery] = useState("fox");
  const [spellOn, setSpellOn] = useState(false);
  const [syntaxOn, setSyntaxOn] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);
  const spellRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSupported(typeof CSS !== "undefined" && "highlights" in CSS);
  }, []);

  const applySearch = useCallback(() => {
    if (!supported || !searchRef.current) return;
    CSS.highlights.delete("search-hit");
    if (!query.trim()) return;
    const ranges = rangesFor(searchRef.current, [query.trim()]);
    if (ranges.length > 0) CSS.highlights.set("search-hit", new Highlight(...ranges));
  }, [supported, query]);

  useEffect(() => {
    applySearch();
    return () => {
      try {
        CSS.highlights.delete("search-hit");
      } catch { /* noop */ }
    };
  }, [applySearch]);

  useEffect(() => {
    if (!supported || !spellRef.current) return;
    CSS.highlights.delete("spell-error");
    if (spellOn) {
      const ranges = rangesFor(spellRef.current, MISSPELLED);
      if (ranges.length > 0) CSS.highlights.set("spell-error", new Highlight(...ranges));
    }
    return () => {
      try {
        CSS.highlights.delete("spell-error");
      } catch { /* noop */ }
    };
  }, [supported, spellOn]);

  // Simple tokenizer for the syntax demo.
  useEffect(() => {
    if (!supported || !codeRef.current) return;
    CSS.highlights.delete("code-keyword");
    CSS.highlights.delete("code-string");
    CSS.highlights.delete("code-comment");
    if (!syntaxOn) return;
    const nodes = textNodes(codeRef.current);
    const kw: Range[] = [];
    const str: Range[] = [];
    const com: Range[] = [];
    const push = (arr: Range[], node: Text, i: number, len: number) => {
      const r = new Range();
      r.setStart(node, i);
      r.setEnd(node, i + len);
      arr.push(r);
    };
    for (const node of nodes) {
      const text = node.textContent ?? "";
      for (const m of text.matchAll(/\b(function|const|return|let|var)\b/g)) push(kw, node, m.index ?? 0, m[0].length);
      for (const m of text.matchAll(/"[^"]*"/g)) push(str, node, m.index ?? 0, m[0].length);
      for (const m of text.matchAll(/\/\/.*/g)) push(com, node, m.index ?? 0, m[0].length);
    }
    if (kw.length) CSS.highlights.set("code-keyword", new Highlight(...kw));
    if (str.length) CSS.highlights.set("code-string", new Highlight(...str));
    if (com.length) CSS.highlights.set("code-comment", new Highlight(...com));
    return () => {
      try {
        CSS.highlights.delete("code-keyword");
        CSS.highlights.delete("code-string");
        CSS.highlights.delete("code-comment");
      } catch { /* noop */ }
    };
  }, [supported, syntaxOn]);

  const css = useMemo(() => HL_CSS, []);
  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(css)) trial.recordUse();
  };

  return (
    <ToolPageShell toolId="css-custom-highlights" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Custom Highlights" left={trial.left} />
      <style>{HL_CSS.split("/* 2.")[0]}</style>

      {supported === false && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser does not support the CSS Custom Highlight API yet.</span>{" "}
            The demos are static here. Chrome 105+, Edge 105+ and recent Firefox/Safari support it, and the code below
            is the real syntax.
          </p>
        </div>
      )}
      {supported === true && (
        <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser supports ::highlight().</span> All three demos
            below are live: ranges are registered with CSS.highlights and styled purely in CSS.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
              <Search className="h-3.5 w-3.5" /> Search highlight
            </p>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a word to find"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">Try: fox, quick, dog, the</p>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={spellOn} onChange={(e) => setSpellOn(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="flex items-center gap-1.5 font-medium">
              <SpellCheck className="h-4 w-4" /> Spellcheck marks
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={syntaxOn} onChange={(e) => setSyntaxOn(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="flex items-center gap-1.5 font-medium">
              <Code2 className="h-4 w-4" /> Syntax coloring
            </span>
          </label>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Highlights are not in the DOM: they do not disturb selection, copy/paste or screen readers. One
            Highlight object can hold many ranges across many nodes.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">::highlight(search-hit)</p>
            <div ref={searchRef} className="text-[15px] leading-relaxed">{SAMPLE}</div>
          </div>
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">::highlight(spell-error)</p>
            <div ref={spellRef} className={cn("text-[15px] leading-relaxed", !spellOn && "opacity-60")}>{SPELL_TEXT}</div>
            {!spellOn && <p className="mt-2 text-xs text-muted-foreground">Enable the spellcheck toggle to mark the misspelled words.</p>}
          </div>
          <div className="rounded-xl border border-border bg-[#0f172a] p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Syntax demo</p>
            <pre className="overflow-x-auto text-sm leading-relaxed">
              <code ref={codeRef} className="text-slate-200">{CODE_SAMPLE}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Copy the code</h2>
          <ActionButton disabled={!trial.canUse} onClick={copy}>
            <Copy className="h-4 w-4" /> Copy code
          </ActionButton>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{css}</pre>
        {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of 5 free copies left.</p>}
      </div>
    </ToolPageShell>
  );
}
