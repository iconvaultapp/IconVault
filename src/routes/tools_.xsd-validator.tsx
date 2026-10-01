// /tools/xsd-validator - Best-effort structural XSD validation in your browser.
// Checks element presence, xs:sequence order, required attributes and basic
// simple types. It is NOT a full XSD 1.1 validator. Nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Eraser, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/xsd-validator")({
  head: () => {
    const seo = getToolSeoMeta("xsd-validator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: XsdValidatorTool,
});

const SAMPLE_XML = `<catalog>
  <book id="bk101">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <price>44.95</price>
    <published>2000-10-01</published>
  </book>
  <book id="bk102">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <price>5.95</price>
    <published>2001-03-15</published>
  </book>
</catalog>`;

const SAMPLE_XSD = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="catalog">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="book" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="author" type="xs:string"/>
              <xs:element name="title" type="xs:string"/>
              <xs:element name="price" type="xs:decimal"/>
              <xs:element name="published" type="xs:date"/>
            </xs:sequence>
            <xs:attribute name="id" type="xs:string" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

interface XsdAttr {
  name: string;
  type: string;
  use: "required" | "optional";
}

interface XsdElement {
  name: string;
  type: string;
  minOccurs: number;
  maxOccurs: number; // -1 means unbounded
  children: XsdElement[];
  attrs: XsdAttr[];
}

function localName(el: Element): string {
  return el.localName ?? el.tagName;
}

function xsdChildrenOf(el: Element): Element[] {
  return Array.from(el.children).filter(
    (c) => localName(c) === "element" && (c.namespaceURI ?? "").includes("XMLSchema"),
  );
}

function parseOccurs(el: Element): { min: number; max: number } {
  const min = el.getAttribute("minOccurs");
  const max = el.getAttribute("maxOccurs");
  return {
    min: min === null ? 1 : parseInt(min, 10),
    max: max === null ? 1 : max === "unbounded" ? -1 : parseInt(max, 10),
  };
}

function parseAttributes(complexType: Element | null): XsdAttr[] {
  if (!complexType) return [];
  const out: XsdAttr[] = [];
  for (const child of Array.from(complexType.children)) {
    const ln = localName(child);
    if (ln !== "attribute") continue;
    const ns = child.namespaceURI ?? "";
    if (!ns.includes("XMLSchema")) continue;
    out.push({
      name: child.getAttribute("name") ?? "",
      type: child.getAttribute("type") ?? "xs:string",
      use: child.getAttribute("use") === "required" ? "required" : "optional",
    });
  }
  return out;
}

/** Parse one xs:element declaration, resolving named complexTypes from the type map. */
function parseElementDecl(
  el: Element,
  complexTypes: Map<string, Element>,
): XsdElement {
  const { min, max } = parseOccurs(el);
  const decl: XsdElement = {
    name: el.getAttribute("name") ?? el.getAttribute("ref") ?? "",
    type: el.getAttribute("type") ?? "xs:string",
    minOccurs: min,
    maxOccurs: max,
    children: [],
    attrs: [],
  };
  let ct: Element | null = null;
  for (const child of Array.from(el.children)) {
    if (localName(child) === "complexType") ct = child;
  }
  if (!ct && decl.type && !decl.type.startsWith("xs:")) {
    ct = complexTypes.get(decl.type.split(":").pop() ?? "") ?? null;
  }
  if (ct) {
    decl.attrs = parseAttributes(ct);
    let seq: Element | null = null;
    for (const child of Array.from(ct.children)) {
      const ln = localName(child);
      if (ln === "sequence" || ln === "all" || ln === "choice") seq = child;
    }
    if (seq) {
      decl.children = xsdChildrenOf(seq).map((c) => parseElementDecl(c, complexTypes));
    }
  }
  return decl;
}

function parseXsd(xsd: string): { root: XsdElement | null; error: string | null } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsd, "application/xml");
  if (doc.querySelector("parsererror")) return { root: null, error: "The XSD itself is not well-formed XML." };
  const schema = Array.from(doc.children).find(
    (c) => localName(c) === "schema" && (c.namespaceURI ?? "").includes("XMLSchema"),
  );
  if (!schema) return { root: null, error: "No xs:schema root element found in the XSD." };
  const complexTypes = new Map<string, Element>();
  for (const child of Array.from(schema.children)) {
    if (localName(child) === "complexType" && child.getAttribute("name")) {
      complexTypes.set(child.getAttribute("name")!, child);
    }
  }
  const roots = xsdChildrenOf(schema);
  if (roots.length === 0) return { root: null, error: "No top-level xs:element found in the XSD." };
  const firstRoot = roots[0];
  if (!firstRoot) return { root: null, error: "No top-level xs:element found in the XSD." };
  return { root: parseElementDecl(firstRoot, complexTypes), error: null };
}

function checkType(value: string, type: string): string | null {
  const t = value.trim();
  if (t === "") return null;
  const base = type.includes(":") ? type.split(":").pop()! : type;
  switch (base) {
    case "integer":
    case "int":
    case "long":
    case "short":
    case "byte":
    case "nonNegativeInteger":
    case "positiveInteger":
      return /^[+-]?\d+$/.test(t) ? null : `value "${t}" is not a valid ${type}`;
    case "decimal":
    case "float":
    case "double":
      return /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(t) ? null : `value "${t}" is not a valid ${type}`;
    case "boolean":
      return /^(true|false|1|0)$/.test(t) ? null : `value "${t}" is not a valid ${type}`;
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(t) ? null : `value "${t}" is not a valid ${type} (expected YYYY-MM-DD)`;
    case "dateTime":
      return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(t) ? null : `value "${t}" is not a valid ${type}`;
    default:
      return null;
  }
}

function childElements(el: Element): Element[] {
  return Array.from(el.children);
}

function validateNode(el: Element, decl: XsdElement, path: string, violations: string[]): void {
  // Required attributes
  for (const attr of decl.attrs) {
    if (attr.use === "required" && !el.hasAttribute(attr.name)) {
      violations.push(`${path}: missing required attribute "${attr.name}"`);
    }
  }
  const actual = childElements(el);
  if (decl.children.length > 0) {
    const declNames = new Set(decl.children.map((d) => d.name));
    for (const child of actual) {
      if (!declNames.has(child.tagName)) {
        violations.push(`${path}: unexpected element <${child.tagName}> (not declared in the schema)`);
      }
    }
    // Occurrence + order check (xs:sequence)
    const byName = new Map<string, Element[]>();
    for (const child of actual) {
      const arr = byName.get(child.tagName) ?? [];
      arr.push(child);
      byName.set(child.tagName, arr);
    }
    const firstPos = new Map<string, number>();
    actual.forEach((child, i) => {
      if (!firstPos.has(child.tagName)) firstPos.set(child.tagName, i);
    });
    const order: string[] = [];
    for (const d of decl.children) {
      const count = byName.get(d.name)?.length ?? 0;
      if (count < d.minOccurs) {
        violations.push(`${path}: missing required element <${d.name}> (minOccurs=${d.minOccurs})`);
      }
      if (d.maxOccurs !== -1 && count > d.maxOccurs) {
        violations.push(`${path}: element <${d.name}> appears ${count} times, maxOccurs=${d.maxOccurs}`);
      }
      order.push(d.name);
    }
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const pi = firstPos.get(order[i] ?? "");
        const pj = firstPos.get(order[j] ?? "");
        if (pi !== undefined && pj !== undefined && pi > pj) {
          violations.push(`${path}: <${order[j]}> appears before <${order[i]}>, but the schema declares xs:sequence order`);
          break;
        }
      }
    }
    // Recurse
    for (const d of decl.children) {
      const kids = byName.get(d.name) ?? [];
      kids.forEach((kid, i) => {
        const kidPath = `${path}/${d.name}${kids.length > 1 ? `[${i + 1}]` : ""}`;
        validateNode(kid, d, kidPath, violations);
      });
    }
  } else {
    // Simple content: check text against declared type
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("");
    const typeError = checkType(text, decl.type);
    if (typeError) violations.push(`${path}: ${typeError}`);
  }
}

function XsdValidatorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("xsd-validator", isPro);
  const seo = getToolSeo("xsd-validator");

  const [xml, setXml] = useState("");
  const [xsd, setXsd] = useState("");
  const [result, setResult] = useState<{ ok: boolean; violations: string[]; error?: string } | null>(null);

  const validate = () => {
    if (!trial.canUse || !xml.trim() || !xsd.trim()) return;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "application/xml");
    if (xmlDoc.querySelector("parsererror")) {
      setResult({ ok: false, violations: [], error: "The XML document is not well-formed. Fix the XML first." });
      trial.recordUse();
      return;
    }
    const { root, error: xsdError } = parseXsd(xsd);
    if (!root) {
      setResult({ ok: false, violations: [], error: xsdError ?? "Could not parse the XSD." });
      trial.recordUse();
      return;
    }
    const rootEl = xmlDoc.documentElement;
    if ((rootEl.localName ?? rootEl.tagName) !== root.name) {
      setResult({
        ok: false,
        violations: [`Root element <${rootEl.tagName}> does not match the schema's root <${root.name}>`],
      });
      trial.recordUse();
      return;
    }
    const violations: string[] = [];
    validateNode(rootEl, root, `/${rootEl.tagName}`, violations);
    setResult({ ok: violations.length === 0, violations });
    trial.recordUse();
    if (violations.length === 0) toast.success("XML is valid against the schema (structural check)");
  };

  const loadSample = () => {
    setXml(SAMPLE_XML);
    setXsd(SAMPLE_XSD);
    setResult(null);
  };

  return (
    <ToolPageShell toolId="xsd-validator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="XSD Validator" left={trial.left} />

      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-foreground/90">
            <span className="font-bold">Structural check, not a full XSD 1.1 validator.</span> This
            tool verifies element presence, order (xs:sequence), required attributes, and basic
            simple types (string, integer, decimal, boolean, date). It does not enforce facets,
            xs:choice subtleties, namespaces, keys/keyrefs, or assertions.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
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
                  onClick={() => { setXml(""); setXsd(""); setResult(null); }}
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
              rows={14}
              className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
            />
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="mb-3 text-sm font-bold">XSD schema</p>
            <textarea
              value={xsd}
              onChange={(e) => setXsd(e.target.value)}
              placeholder="Paste your XSD schema…"
              spellCheck={false}
              rows={14}
              className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            busy={false}
            disabled={!trial.canUse || !xml.trim() || !xsd.trim()}
            onClick={validate}
          >
            <ShieldCheck className="h-4 w-4" /> Validate
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free validations left. Everything runs in your
              browser, nothing is uploaded.
            </p>
          )}
        </div>

        {result && (
          <div
            className={cn(
              "rounded-2xl border p-6",
              result.error || !result.ok
                ? "border-red-500/40 bg-red-500/10"
                : "border-emerald-500/40 bg-emerald-500/10",
            )}
          >
            {result.error ? (
              <p className="text-sm font-medium text-red-500">{result.error}</p>
            ) : result.ok ? (
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                <Check className="h-5 w-5" /> Valid. No structural violations found.
              </p>
            ) : (
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                  {result.violations.length} violation{result.violations.length === 1 ? "" : "s"} found
                </p>
                <ul className="mt-3 space-y-2">
                  {result.violations.map((v, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-red-500/30 bg-background p-3 font-mono text-[13px]"
                    >
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
