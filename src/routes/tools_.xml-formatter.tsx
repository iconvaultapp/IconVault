// /tools/xml-formatter - Pretty-print, minify and validate XML in your browser.
// Includes an XPath query box powered by document.evaluate. Nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Check, Copy, Eraser, Minimize2, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/xml-formatter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/xml-formatter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/xml-formatter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/xml-formatter";
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
  component: XmlFormatterTool,
});

const SAMPLE = `<catalog>
  <book id="bk101"><author>Gambardella, Matthew</author><title>XML Developer's Guide</title><price>44.95</price></book>
  <book id="bk102"><author>Ralls, Kim</author><title>Midnight Rain</title><price>5.95</price></book>
</catalog>`;

function parseXml(text: string): { doc: Document | null; error: string | null } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  const err = doc.querySelector("parsererror");
  if (!err) return { doc, error: null };
  const msg = err.textContent ?? "Invalid XML.";
  const m = msg.match(/line\s*(?:number\s*)?(\d+)[^\d]*(?:column\s*(?:number\s*)?(\d+))?/i);
  const where = m ? ` (line ${m[1]}${m[2] ? `, column ${m[2]}` : ""})` : "";
  const clean = msg.replace(/This page contains the following errors:.*$/s, "").trim();
  return { doc: null, error: `${clean || "Invalid XML"}${where}` };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function prettyNode(node: Node, depth: number): string {
  const pad = "  ".repeat(depth);
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      const el = node as Element;
      const attrs = Array.from(el.attributes)
        .map((a) => ` ${a.name}="${escapeAttr(a.value)}"`)
        .join("");
      const kids = Array.from(el.childNodes).filter(
        (n) => n.nodeType !== Node.TEXT_NODE || (n.textContent ?? "").trim() !== "",
      );
      if (kids.length === 0) return `${pad}<${el.tagName}${attrs}/>`;
      const allText = kids.every(
        (n) => n.nodeType === Node.TEXT_NODE || n.nodeType === Node.CDATA_SECTION_NODE,
      );
      if (allText) {
        const text = kids
          .map((n) =>
            n.nodeType === Node.CDATA_SECTION_NODE
              ? `<![CDATA[${n.textContent}]]>`
              : escapeXml(n.textContent ?? ""),
          )
          .join("");
        return `${pad}<${el.tagName}${attrs}>${text}</${el.tagName}>`;
      }
      const inner = kids.map((k) => prettyNode(k, depth + 1)).join("\n");
      return `${pad}<${el.tagName}${attrs}>\n${inner}\n${pad}</${el.tagName}>`;
    }
    case Node.TEXT_NODE:
      return pad + escapeXml((node.textContent ?? "").trim());
    case Node.COMMENT_NODE:
      return `${pad}<!--${node.textContent}-->`;
    case Node.CDATA_SECTION_NODE:
      return `${pad}<![CDATA[${node.textContent}]]>`;
    case Node.PROCESSING_INSTRUCTION_NODE: {
      const pi = node as ProcessingInstruction;
      return `${pad}<?${pi.target} ${pi.data}?>`;
    }
    default:
      return "";
  }
}

function minifyDoc(doc: Document): string {
  const clone = doc.cloneNode(true) as Document;
  const walker = clone.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const toRemove: Text[] = [];
  let t = walker.nextNode() as Text | null;
  while (t) {
    if (t.textContent?.trim() === "" && t.parentNode) toRemove.push(t);
    t = walker.nextNode() as Text | null;
  }
  toRemove.forEach((n) => n.parentNode?.removeChild(n));
  return new XMLSerializer().serializeToString(clone);
}

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

interface XPathHit {
  path: string;
  value: string;
}

function runXPath(doc: Document, expr: string): { hits: XPathHit[]; scalar: string | null } {
  const res = document.evaluate(expr, doc, null, XPathResult.ANY_TYPE, null);
  switch (res.resultType) {
    case XPathResult.BOOLEAN_TYPE:
      return { hits: [], scalar: String(res.booleanValue) };
    case XPathResult.NUMBER_TYPE:
      return { hits: [], scalar: String(res.numberValue) };
    case XPathResult.STRING_TYPE:
      return { hits: [], scalar: res.stringValue };
    default: {
      const hits: XPathHit[] = [];
      let node = res.iterateNext();
      let guard = 0;
      while (node && guard < 500) {
        guard += 1;
        const value =
          node.nodeType === Node.ATTRIBUTE_NODE
            ? (node as Attr).value
            : ((node.textContent ?? "").trim().slice(0, 200) ||
              `<${(node as Element).tagName ?? node.nodeName}>`);
        const path =
          node.nodeType === Node.ATTRIBUTE_NODE
            ? `${nodePath((node as Attr).ownerElement ?? doc)}/@${(node as Attr).name}`
            : nodePath(node);
        hits.push({ path, value });
        node = res.iterateNext();
      }
      return { hits, scalar: null };
    }
  }
}

function XmlFormatterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("xml-formatter", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validMsg, setValidMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [xpath, setXpath] = useState("//book/title");
  const [xpathHits, setXpathHits] = useState<XPathHit[] | null>(null);
  const [xpathScalar, setXpathScalar] = useState<string | null>(null);
  const [xpathError, setXpathError] = useState<string | null>(null);

  const transform = (mode: "format" | "minify") => {
    if (!trial.canUse || !input.trim()) return;
    setError(null);
    setValidMsg(null);
    const { doc, error: parseError } = parseXml(input);
    if (!doc) {
      setOutput(null);
      setError(parseError ?? "Invalid XML.");
      return;
    }
    setOutput(
      mode === "format"
        ? Array.from(doc.childNodes)
            .map((n) => prettyNode(n, 0))
            .filter(Boolean)
            .join("\n")
        : minifyDoc(doc),
    );
    trial.recordUse();
    toast.success(mode === "format" ? "XML formatted" : "XML minified");
  };

  const validate = () => {
    if (!input.trim()) return;
    const { error: parseError } = parseXml(input);
    if (parseError) {
      setError(parseError);
      setValidMsg(null);
    } else {
      setError(null);
      setValidMsg("Valid XML. The document parsed with no errors.");
    }
  };

  const evaluate = () => {
    if (!trial.canUse || !input.trim() || !xpath.trim()) return;
    setXpathError(null);
    const { doc, error: parseError } = parseXml(input);
    if (!doc) {
      setXpathHits(null);
      setXpathScalar(null);
      setXpathError(parseError ?? "Invalid XML.");
      return;
    }
    try {
      const { hits, scalar } = runXPath(doc, xpath);
      setXpathHits(hits);
      setXpathScalar(scalar);
      trial.recordUse();
    } catch (e) {
      setXpathHits(null);
      setXpathScalar(null);
      setXpathError(e instanceof Error ? e.message : "Invalid XPath expression.");
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setOutput(null);
    setError(null);
    setValidMsg(null);
    setXpathHits(null);
    setXpathScalar(null);
    setXpathError(null);
  };

  return (
    <ToolPageShell toolId="xml-formatter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="XML Formatter" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">XML input</p>
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
                onClick={() => {
                  setInput("");
                  setOutput(null);
                  setError(null);
                  setValidMsg(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your XML here…"
            spellCheck={false}
            rows={12}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton
              busy={false}
              disabled={!trial.canUse || !input.trim()}
              onClick={() => transform("format")}
            >
              <Braces className="h-4 w-4" /> Format (pretty-print)
            </ActionButton>
            <ActionButton
              busy={false}
              disabled={!trial.canUse || !input.trim()}
              onClick={() => transform("minify")}
            >
              <Minimize2 className="h-4 w-4" /> Minify
            </ActionButton>
            <button
              type="button"
              onClick={validate}
              disabled={!input.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Validate
            </button>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free format/minify/XPath runs left. Validate is
              unlimited, and everything runs in your browser, nothing is uploaded.
            </p>
          )}
          {validMsg && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" /> {validMsg}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <p className="text-sm font-bold text-red-500">Invalid XML</p>
            <p className="mt-1 font-mono text-[13px] text-red-500/90">{error}</p>
          </div>
        )}

        {output !== null && !error && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Output</p>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed">
              {output}
            </pre>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-bold">XPath query</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run an XPath expression against the XML above using document.evaluate. Node sets, single
            nodes, strings, numbers and booleans are all shown.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={xpath}
              onChange={(e) => setXpath(e.target.value)}
              placeholder='e.g. //book[@id="bk101"]/title'
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
            <ActionButton
              busy={false}
              disabled={!trial.canUse || !input.trim() || !xpath.trim()}
              onClick={evaluate}
            >
              <Play className="h-4 w-4" /> Run
            </ActionButton>
          </div>
          {xpathError && (
            <p className="mt-3 text-sm font-medium text-red-500">{xpathError}</p>
          )}
          {xpathScalar !== null && !xpathError && (
            <div className="mt-3 rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-bold text-muted-foreground">RESULT</p>
              <p className="mt-1 font-mono text-sm">{xpathScalar}</p>
            </div>
          )}
          {xpathHits !== null && xpathScalar === null && !xpathError && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-bold text-muted-foreground">
                {xpathHits.length} MATCH{xpathHits.length === 1 ? "" : "ES"}
              </p>
              {xpathHits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No nodes matched this expression.
                </p>
              ) : (
                <div className="space-y-2">
                  {xpathHits.map((h, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-background p-3"
                    >
                      <p className={cn("font-mono text-xs text-primary")}>{h.path}</p>
                      <p className="mt-1 break-words font-mono text-[13px]">{h.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
