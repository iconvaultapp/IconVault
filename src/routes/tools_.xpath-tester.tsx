// /tools/xpath-tester - Evaluate XPath expressions against XML in your browser.
// Shows node paths and string values, all result types supported via
// document.evaluate. Nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Eraser, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/xpath-tester")({
  head: () => {
    const seo = getToolSeoMeta("xpath-tester");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: XPathTesterTool,
});

const SAMPLE_XML = `<catalog>
  <book id="bk101" lang="en">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <price>44.95</price>
  </book>
  <book id="bk102" lang="en">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <price>5.95</price>
  </book>
  <book id="bk103" lang="fr">
    <author>Corets, Eva</author>
    <title>Maeve Ascendant</title>
    <price>12.99</price>
  </book>
</catalog>`;

const SAMPLE_EXPRS = [
  "//book/title",
  "//book[@lang='en']/title",
  "//book[price > 10]/title",
  "count(//book)",
  "sum(//book/price)",
  "//book/@id",
];

function nodePath(n: Node): string {
  const parts: string[] = [];
  let cur: Node | null = n;
  while (cur && cur.nodeType === Node.ELEMENT_NODE) {
    const el = cur as Element;
    const parent = el.parentNode;
    const sibs = parent
      ? Array.from(parent.childNodes).filter(
          (x) => x.nodeType === Node.ELEMENT_NODE && (x as Element).tagName === el.tagName,
        )
      : [el];
    const idx = sibs.indexOf(el);
    parts.unshift(sibs.length > 1 ? `${el.tagName}[${idx + 1}]` : el.tagName);
    cur = parent;
  }
  return parts.length ? `/${parts.join("/")}` : "/";
}

interface Hit {
  path: string;
  value: string;
}

function evaluate(doc: Document, expr: string): { hits: Hit[]; scalar: string | null; kind: string } {
  const res = document.evaluate(expr, doc, null, XPathResult.ANY_TYPE, null);
  switch (res.resultType) {
    case XPathResult.BOOLEAN_TYPE:
      return { hits: [], scalar: String(res.booleanValue), kind: "Boolean" };
    case XPathResult.NUMBER_TYPE:
      return { hits: [], scalar: String(res.numberValue), kind: "Number" };
    case XPathResult.STRING_TYPE:
      return { hits: [], scalar: res.stringValue, kind: "String" };
    case XPathResult.FIRST_ORDERED_NODE_TYPE:
    case XPathResult.ANY_UNORDERED_NODE_TYPE: {
      const node = res.singleNodeValue;
      if (!node) return { hits: [], scalar: "", kind: "Empty node" };
      const value =
        node.nodeType === Node.ATTRIBUTE_NODE
          ? (node as Attr).value
          : (node.textContent ?? "").trim().slice(0, 200);
      return {
        hits: [
          {
            path:
              node.nodeType === Node.ATTRIBUTE_NODE
                ? `${nodePath((node as Attr).ownerElement ?? doc)}/@${(node as Attr).name}`
                : nodePath(node),
            value,
          },
        ],
        scalar: null,
        kind: "Node set (1)",
      };
    }
    default: {
      const hits: Hit[] = [];
      let node = res.iterateNext();
      let guard = 0;
      while (node && guard < 500) {
        guard += 1;
        const value =
          node.nodeType === Node.ATTRIBUTE_NODE
            ? (node as Attr).value
            : ((node.textContent ?? "").trim().slice(0, 200) || `<${(node as Element).tagName ?? node.nodeName}>`);
        hits.push({
          path:
            node.nodeType === Node.ATTRIBUTE_NODE
              ? `${nodePath((node as Attr).ownerElement ?? doc)}/@${(node as Attr).name}`
              : nodePath(node),
          value,
        });
        node = res.iterateNext();
      }
      return { hits, scalar: null, kind: `Node set (${hits.length})` };
    }
  }
}

function XPathTesterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("xpath-tester", isPro);
  const seo = getToolSeo("xpath-tester");

  const [xml, setXml] = useState("");
  const [expr, setExpr] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [scalar, setScalar] = useState<string | null>(null);
  const [kind, setKind] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!trial.canUse || !xml.trim() || !expr.trim()) return;
    setError(null);
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) {
      setHits(null);
      setScalar(null);
      setError("The XML is not well-formed. Fix it first (try the XML Formatter tool).");
      return;
    }
    try {
      const r = evaluate(doc, expr);
      setHits(r.hits);
      setScalar(r.scalar);
      setKind(r.kind);
      trial.recordUse();
    } catch (e) {
      setHits(null);
      setScalar(null);
      setError(e instanceof Error ? e.message : "Invalid XPath expression.");
    }
  };

  const loadSample = () => {
    setXml(SAMPLE_XML);
    setExpr(SAMPLE_EXPRS[0] ?? "");
    setHits(null);
    setScalar(null);
    setError(null);
  };

  const copyResults = async () => {
    const text =
      scalar !== null
        ? `${kind}: ${scalar}`
        : (hits ?? []).map((h) => `${h.path}\t${h.value}`).join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="xpath-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="XPath Tester" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">XML document</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadSample}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => { setXml(""); setHits(null); setScalar(null); setError(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={xml}
            onChange={(e) => setXml(e.target.value)}
            placeholder="Paste your XML document…"
            spellCheck={false}
            rows={11}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-bold">XPath expression</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder='e.g. //book[@lang="en"]/title'
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
            <ActionButton
              busy={false}
              disabled={!trial.canUse || !xml.trim() || !expr.trim()}
              onClick={run}
            >
              <Play className="h-4 w-4" /> Evaluate
            </ActionButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_EXPRS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setExpr(s)}
                className="rounded-lg border border-border px-2.5 py-1 font-mono text-xs hover:border-primary/50"
              >
                {s}
              </button>
            ))}
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free evaluations left. Runs in your browser,
              nothing is uploaded.
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Uses document.evaluate with all result types. Namespaces are not registered, so
            namespace-qualified paths may not match.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        )}

        {(hits !== null || scalar !== null) && !error && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">
                Results <span className="text-xs font-medium text-muted-foreground">{kind}</span>
              </p>
              <button
                type="button"
                onClick={copyResults}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {scalar !== null ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="font-mono text-sm">{scalar === "" ? "(empty string)" : scalar}</p>
              </div>
            ) : hits!.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" /> No nodes matched this expression.
              </p>
            ) : (
              <div className="space-y-2">
                {hits!.map((h, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-3">
                    <p className="font-mono text-xs text-primary">{h.path}</p>
                    <p className="mt-1 break-words font-mono text-[13px]">{h.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
