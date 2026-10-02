// /tools/json-xml-converter - Convert JSON to XML and XML to JSON in your
// browser. Custom serializer for JSON to XML, DOMParser for XML to JSON.
// 100% client-side, runs in your browser, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Check, Copy, Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-xml-converter")({
  head: () => {
    const seo = getToolSeoMeta("json-xml-converter");
    const canonical = "https://iconvault.site/tools/json-xml-converter";
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
  component: JsonXmlConverterTool,
});

type Mode = "json2xml" | "xml2json";

const SAMPLE_JSON = `{
  "name": "IconVault",
  "version": 2,
  "tags": ["icons", "tools"],
  "meta": { "author": "Sameer" }
}`;

const SAMPLE_XML = `<root>
  <name>IconVault</name>
  <version>2</version>
  <tags>
    <tag>icons</tag>
    <tag>tools</tag>
  </tags>
  <meta>
    <author>Sameer</author>
  </meta>
</root>`;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function safeTag(name: string): string {
  const t = name.replace(/[^A-Za-z0-9_.-]/g, "_").replace(/^[^A-Za-z_]/, "_");
  return t || "item";
}

function singular(tag: string): string {
  return tag.length > 1 && tag.endsWith("s") ? tag.slice(0, -1) : "item";
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function toXml(value: unknown, tag: string, indent: string): string {
  const pad = indent;
  if (value === null || value === undefined) return `${pad}<${tag}/>`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}<${tag}/>`;
    return value.map((v) => toXml(v, singular(tag), pad)).join("\n");
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return `${pad}<${tag}/>`;
    const inner = keys.map((k) => toXml(value[k], safeTag(k), `${pad}  `)).join("\n");
    return `${pad}<${tag}>\n${inner}\n${pad}</${tag}>`;
  }
  return `${pad}<${tag}>${escapeXml(String(value))}</${tag}>`;
}

function xmlNodeToJson(el: Element): unknown {
  const children = Array.from(el.children);
  if (children.length === 0) return el.textContent ?? "";
  const obj: Record<string, unknown> = {};
  for (const c of children) {
    const v = xmlNodeToJson(c);
    const key = c.tagName;
    if (key in obj) {
      obj[key] = [...(Array.isArray(obj[key]) ? (obj[key] as unknown[]) : [obj[key]]), v];
    } else {
      obj[key] = v;
    }
  }
  return obj;
}

function JsonXmlConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-xml-converter", isPro);
  const seo = getToolSeo("json-xml-converter");

  const [mode, setMode] = useState<Mode>("json2xml");
  const [input, setInput] = useState("");
  const [rootName, setRootName] = useState("root");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const convert = () => {
    if (!trial.canUse || busy || !input.trim()) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      if (mode === "json2xml") {
        const parsed: unknown = JSON.parse(input);
        const root = safeTag(rootName.trim() || "root");
        setOutput(`<?xml version="1.0" encoding="UTF-8"?>\n${toXml(parsed, root, "")}`);
      } else {
        const doc = new DOMParser().parseFromString(input, "text/xml");
        const errNode = doc.querySelector("parsererror");
        if (errNode) throw new Error(errNode.textContent?.trim() || "XML parse error");
        const root = doc.documentElement;
        const body = xmlNodeToJson(root);
        setOutput(JSON.stringify({ [root.tagName]: body }, null, 2));
      }
      trial.recordUse();
      toast.success("Converted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed";
      setError(mode === "json2xml" ? `Invalid JSON: ${msg}` : `Invalid XML: ${msg}`);
      setOutput("");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setInput("");
    setOutput("");
    setError(null);
    setCopied(false);
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const download = () => {
    if (!output) return;
    const ext = mode === "json2xml" ? "xml" : "json";
    downloadBlob(new Blob([output], { type: "text/plain" }), `converted.${ext}`);
    toast.success("File downloaded");
  };

  const fromLabel = mode === "json2xml" ? "JSON" : "XML";
  const toLabel = mode === "json2xml" ? "XML" : "JSON";

  const paneClass =
    "h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary";

  return (
    <ToolPageShell toolId="json-xml-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON to XML" left={trial.left} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => switchMode("json2xml")}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
            mode === "json2xml"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          JSON to XML
        </button>
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        <button
          type="button"
          onClick={() => switchMode("xml2json")}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
            mode === "xml2json"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          XML to JSON
        </button>
        <button
          type="button"
          onClick={() => { setInput(mode === "json2xml" ? SAMPLE_JSON : SAMPLE_XML); setOutput(""); setError(null); }}
          className="ml-2 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          Sample
        </button>
        {mode === "json2xml" && (
          <div className="ml-2 flex items-center gap-2">
            <label htmlFor="root-tag" className="text-xs font-bold text-muted-foreground">Root element</label>
            <input
              id="root-tag"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              placeholder="root"
              spellCheck={false}
              className="w-32 rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">{fromLabel} input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste your ${fromLabel} here...`}
            spellCheck={false}
            className={paneClass}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">{toLabel} output</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
          {output ? (
            <textarea value={output} readOnly spellCheck={false} className={paneClass} />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <RefreshCcw className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">Your {toLabel} appears here</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>
      </div>

      <div className="mt-6">
        <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={convert}>
          <RefreshCcw className="h-4 w-4" /> {busy ? "Converting..." : `Convert to ${toLabel}`}
        </ActionButton>
      </div>
      {!isPro && (
        <p className="mt-3 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left. Runs in your browser, nothing is uploaded.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Note: XML has no data types, so numbers and booleans become strings when converting XML to JSON. Array items
        use the singular of their key name (tags becomes tag).
      </p>
    </ToolPageShell>
  );
}
