// /tools/xsd-generator - Generate an XSD schema from sample XML in your browser.
// Infers elements, attributes, simple types and min/max occurrences.
// Nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Eraser, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/xsd-generator")({
  head: () => {
    const seo = getToolSeoMeta("xsd-generator");
    const canonical = "https://iconvault.site/tools/xsd-generator";
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
  component: XsdGeneratorTool,
});

const SAMPLE = `<catalog>
  <book id="bk101" lang="en">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <price>44.95</price>
    <inPrint>true</inPrint>
    <published>2000-10-01</published>
  </book>
  <book id="bk102">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <price>5.95</price>
    <inPrint>false</inPrint>
    <published>2001-03-15</published>
  </book>
</catalog>`;

function inferType(value: string): string {
  const t = value.trim();
  if (/^[+-]?\d+$/.test(t)) return "xs:integer";
  if (/^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) return "xs:decimal";
  if (/^(true|false)$/i.test(t)) return "xs:boolean";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return "xs:date";
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(t)) return "xs:dateTime";
  return "xs:string";
}

function mergeType(a: string | null, b: string): string {
  if (a === null) return b;
  if (a === b) return a;
  // integer + decimal -> decimal, anything else conflicting -> string
  if ((a === "xs:integer" && b === "xs:decimal") || (a === "xs:decimal" && b === "xs:integer")) {
    return "xs:decimal";
  }
  return "xs:string";
}

interface AttrModel {
  count: number;
  type: string | null;
}

interface ElemModel {
  name: string;
  instances: number;
  attrs: Map<string, AttrModel>;
  childCounts: Map<string, number[]>;
  childOrder: string[];
  textType: string | null;
  hasElementChildren: boolean;
}

function buildModel(el: Element, models: Map<string, ElemModel>): void {
  let model = models.get(el.tagName);
  if (!model) {
    model = {
      name: el.tagName,
      instances: 0,
      attrs: new Map(),
      childCounts: new Map(),
      childOrder: [],
      textType: null,
      hasElementChildren: false,
    };
    models.set(el.tagName, model);
  }
  model.instances += 1;

  for (const attr of Array.from(el.attributes)) {
    let am = model.attrs.get(attr.name);
    if (!am) {
      am = { count: 0, type: null };
      model.attrs.set(attr.name, am);
    }
    am.count += 1;
    am.type = mergeType(am.type, inferType(attr.value));
  }

  const kids = Array.from(el.children);
  if (kids.length > 0) model.hasElementChildren = true;
  const seenThisInstance = new Map<string, number>();
  for (const kid of kids) {
    if (!model.childOrder.includes(kid.tagName)) model.childOrder.push(kid.tagName);
    seenThisInstance.set(kid.tagName, (seenThisInstance.get(kid.tagName) ?? 0) + 1);
  }
  for (const name of model.childOrder) {
    const arr = model.childCounts.get(name) ?? [];
    arr.push(seenThisInstance.get(name) ?? 0);
    model.childCounts.set(name, arr);
  }

  const text = Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent ?? "")
    .join("")
    .trim();
  if (text !== "") model.textType = mergeType(model.textType, inferType(text));

  for (const kid of kids) buildModel(kid, models);
}

function escapeAttrXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderElement(
  model: ElemModel,
  models: Map<string, ElemModel>,
  depth: number,
  isRoot: boolean,
): string {
  const pad = "  ".repeat(depth);
  const minMax = isRoot ? "" : ' minOccurs="0"';
  const hasStructure = model.hasElementChildren || model.attrs.size > 0;
  if (!hasStructure) {
    const type = model.textType ?? "xs:string";
    return `${pad}<xs:element name="${model.name}" type="${type}"${minMax}/>`;
  }
  let out = `${pad}<xs:element name="${model.name}"${minMax}>\n`;
  out += `${pad}  <xs:complexType>\n`;
  if (model.hasElementChildren) {
    out += `${pad}    <xs:sequence>\n`;
    for (const childName of model.childOrder) {
      const child = models.get(childName)!;
      const counts = model.childCounts.get(childName) ?? [];
      const min = counts.some((c) => c === 0) ? 0 : 1;
      const max = Math.max(...counts, 1);
      const childMinMax = ` minOccurs="${min}"${max > 1 ? ' maxOccurs="unbounded"' : ""}`;
      out += renderChild(child, models, depth + 3, childMinMax);
    }
    out += `${pad}    </xs:sequence>\n`;
  } else {
    const type = model.textType ?? "xs:string";
    out += `${pad}    <xs:simpleContent><xs:extension base="${type}">\n`;
    for (const [attrName, am] of model.attrs) {
      const use = am.count === model.instances ? ' use="required"' : "";
      out += `${pad}      <xs:attribute name="${attrName}" type="${am.type ?? "xs:string"}"${use}/>\n`;
    }
    out += `${pad}    </xs:extension></xs:simpleContent>\n`;
  }
  if (model.hasElementChildren) {
    for (const [attrName, am] of model.attrs) {
      const use = am.count === model.instances ? ' use="required"' : "";
      out += `${pad}    <xs:attribute name="${escapeAttrXml(attrName)}" type="${am.type ?? "xs:string"}"${use}/>\n`;
    }
  }
  out += `${pad}  </xs:complexType>\n`;
  out += `${pad}</xs:element>`;
  return out;
}

function renderChild(
  model: ElemModel,
  models: Map<string, ElemModel>,
  depth: number,
  minMax: string,
): string {
  const pad = "  ".repeat(depth);
  const hasStructure = model.hasElementChildren || model.attrs.size > 0;
  if (!hasStructure) {
    const type = model.textType ?? "xs:string";
    return `${pad}<xs:element name="${model.name}" type="${type}"${minMax}/>\n`;
  }
  let out = `${pad}<xs:element name="${model.name}"${minMax}>\n`;
  out += `${pad}  <xs:complexType>\n`;
  if (model.hasElementChildren) {
    out += `${pad}    <xs:sequence>\n`;
    for (const childName of model.childOrder) {
      const child = models.get(childName)!;
      const counts = model.childCounts.get(childName) ?? [];
      const min = counts.some((c) => c === 0) ? 0 : 1;
      const max = Math.max(...counts, 1);
      out += renderChild(child, models, depth + 3, ` minOccurs="${min}"${max > 1 ? ' maxOccurs="unbounded"' : ""}`);
    }
    out += `${pad}    </xs:sequence>\n`;
  } else {
    const type = model.textType ?? "xs:string";
    out += `${pad}    <xs:simpleContent><xs:extension base="${type}">\n`;
    for (const [attrName, am] of model.attrs) {
      const use = am.count === model.instances ? ' use="required"' : "";
      out += `${pad}      <xs:attribute name="${attrName}" type="${am.type ?? "xs:string"}"${use}/>\n`;
    }
    out += `${pad}    </xs:extension></xs:simpleContent>\n`;
  }
  if (model.hasElementChildren) {
    for (const [attrName, am] of model.attrs) {
      const use = am.count === model.instances ? ' use="required"' : "";
      out += `${pad}    <xs:attribute name="${attrName}" type="${am.type ?? "xs:string"}"${use}/>\n`;
    }
  }
  out += `${pad}  </xs:complexType>\n`;
  out += `${pad}</xs:element>\n`;
  return out;
}

function XsdGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("xsd-generator", isPro);
  const seo = getToolSeo("xsd-generator");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    if (!trial.canUse || !input.trim()) return;
    setError(null);
    const doc = new DOMParser().parseFromString(input, "application/xml");
    if (doc.querySelector("parsererror")) {
      setOutput(null);
      setError("The XML is not well-formed. Fix it first (try the XML Formatter tool).");
      return;
    }
    const models = new Map<string, ElemModel>();
    buildModel(doc.documentElement, models);
    const root = models.get(doc.documentElement.tagName)!;
    const xsd =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">\n` +
      renderElement(root, models, 1, true) +
      `\n</xs:schema>`;
    setOutput(xsd);
    trial.recordUse();
    toast.success("XSD generated");
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

  const download = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: "application/xml" }), "schema.xsd");
  };

  return (
    <ToolPageShell toolId="xsd-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="XSD Generator" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Sample XML</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setOutput(null); setError(null); }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => { setInput(""); setOutput(null); setError(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste representative sample XML…"
            spellCheck={false}
            rows={12}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={generate}>
              <FilePlus className="h-4 w-4" /> Generate XSD
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free generations left. Runs in your browser,
                nothing is uploaded.
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The more representative your sample (repeated elements, optional fields), the better the
            inferred minOccurs, maxOccurs and types.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        )}

        {output !== null && !error && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Generated XSD</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  <Download className="h-3.5 w-3.5" /> .xsd
                </button>
              </div>
            </div>
            <pre className="max-h-[480px] overflow-auto whitespace-pre rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed">
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
