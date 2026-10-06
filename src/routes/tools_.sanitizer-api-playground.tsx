// /tools/sanitizer-api-playground - Paste HTML or fire labeled XSS attack
// payloads, then sanitize with the browser's built-in Sanitizer API
// (setHTML) or a strict built-in allowlist fallback. The cleaned result
// renders in a sandboxed iframe, with removal stats and copyable code.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/sanitizer-api-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/sanitizer-api-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sanitizer-api-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/sanitizer-api-playground";
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
  component: SanitizerTool,
});

const PAYLOADS: { label: string; html: string }[] = [
  { label: "img onerror", html: `<img src="x" onerror="alert('xss')">Hello` },
  { label: "svg onload", html: `<svg onload="alert('xss')"><circle r="10"/></svg>` },
  { label: "script tag", html: `<p>Hi</p><script>alert('xss')<\/script>` },
  { label: "javascript: link", html: `<a href="javascript:alert('xss')">click me</a>` },
  { label: "iframe embed", html: `<iframe src="https://evil.example"></iframe><b>bold</b>` },
  { label: "event on div", html: `<div onmouseover="alert('xss')" style="color:red">hover text</div>` },
  { label: "form hijack", html: `<form action="https://evil.example"><input name="pw"></form>` },
  { label: "mixed safe + evil", html: `<h2>Title</h2><p>A <a href="https://example.com">safe link</a> and <img src="x" onerror="alert(1)">` },
];

const ALLOWED_TAGS = new Set([
  "p", "div", "span", "b", "i", "u", "em", "strong", "s", "mark", "del", "ins",
  "sub", "sup", "code", "pre", "kbd", "blockquote", "ul", "ol", "li", "dl", "dt", "dd",
  "h1", "h2", "h3", "h4", "a", "img", "br", "hr", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "td", "th", "caption",
]);
const GLOBAL_ATTRS = new Set(["class", "title", "lang", "dir"]);
const ATTR_RULES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

interface SanitizeResult { html: string; removed: number; method: string }

function safeUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("mailto:") ||
    u.startsWith("data:image/")
  );
}

/** Strict allowlist sanitizer used when the browser has no Sanitizer API. */
function allowlistSanitize(dirty: string): SanitizeResult {
  const doc = new DOMParser().parseFromString(`<body>${dirty}</body>`, "text/html");
  let removed = 0;
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          // Drop dangerous elements entirely (script, style, iframe, form...),
          // unwrap harmless unknown ones so their text survives.
          const dangerous = ["script", "style", "iframe", "form", "object", "embed", "link", "meta", "base"].includes(tag);
          removed++;
          if (dangerous) {
            el.remove();
          } else {
            const frag = doc.createDocumentFragment();
            while (el.firstChild) frag.appendChild(el.firstChild);
            el.replaceWith(frag);
            walk(frag);
          }
          continue;
        }
        const allowed = new Set(GLOBAL_ATTRS);
        const extra = ATTR_RULES[tag];
        if (extra) for (const a of extra) allowed.add(a);
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || name === "style" || !allowed.has(name)) {
            el.removeAttribute(attr.name);
            removed++;
            continue;
          }
          if ((name === "href" || name === "src") && !safeUrl(attr.value)) {
            el.removeAttribute(attr.name);
            removed++;
            continue;
          }
          if (name === "target" && attr.value !== "_blank") {
            el.removeAttribute(attr.name);
            removed++;
            continue;
          }
          if (name === "target" && attr.value === "_blank") {
            el.setAttribute("rel", "noopener noreferrer");
          }
        }
        walk(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        removed++;
      }
    }
  };
  const body = doc.body;
  if (body) walk(body);
  return { html: body ? body.innerHTML : "", removed, method: "allowlist fallback" };
}

function setHtmlSanitize(dirty: string): SanitizeResult {
  const el = document.createElement("div");
  const withApi = el as HTMLDivElement & { setHTML?: (input: string) => void };
  if (typeof withApi.setHTML !== "function") throw new Error("no setHTML");
  withApi.setHTML(dirty);
  return { html: el.innerHTML, removed: -1, method: "Sanitizer API (setHTML)" };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function SanitizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sanitizer-api-playground", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState(PAYLOADS[0]?.html ?? "");
  const [result, setResult] = useState<SanitizeResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [hasSetHtml] = useState(
    () =>
      typeof document !== "undefined" &&
      typeof (document.createElement("div") as HTMLDivElement & { setHTML?: unknown }).setHTML === "function",
  );

  const sanitize = () => {
    if (!trial.canUse || !input.trim()) return;
    try {
      const r = hasSetHtml ? setHtmlSanitize(input) : allowlistSanitize(input);
      setResult(r);
      trial.recordUse();
      toast.success(`Sanitized with ${r.method}`);
    } catch {
      const r = allowlistSanitize(input);
      setResult(r);
      trial.recordUse();
      toast.success("Sanitized with allowlist fallback");
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.html);
      setCopied(true);
      toast.success("Clean HTML copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const code = useMemo(
    () => `// Prefer the built-in Sanitizer API where available
const el = document.createElement("div");
if (typeof el.setHTML === "function") {
  el.setHTML(untrustedHtml); // browser strips scripts, event handlers, javascript: URLs
  container.append(el);
} else {
  // Fallback: parse and keep only an allowlist of tags/attributes,
  // drop on* handlers, style, and non-http(s) URLs.
  container.append(allowlistSanitize(untrustedHtml));
}`,
    [],
  );

  return (
    <ToolPageShell toolId="sanitizer-api-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Sanitizer API Playground" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <span className="font-bold">Engine:</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", hasSetHtml ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600")}>
          {hasSetHtml ? "Browser Sanitizer API (setHTML)" : "Strict allowlist fallback"}
        </span>
        <span className="text-xs text-muted-foreground">
          {hasSetHtml
            ? "This browser exposes Element.setHTML(), so sanitizing uses the native Sanitizer implementation."
            : "This browser has no setHTML(), so a strict built-in allowlist sanitizer runs instead. Same rules, no dependency."}
        </span>
      </div>

      <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-50/60 p-4 text-sm dark:bg-amber-950/20">
        <p className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> Attack-payload test bench
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          These are real XSS attack patterns, clearly labeled. They are never executed: the input
          preview below is escaped text, and the cleaned result renders inside a sandboxed iframe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Test payloads</h2>
            <div className="flex flex-wrap gap-2">
              {PAYLOADS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setInput(p.html); setResult(null); }}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition",
                    input === p.html ? "border-red-400 bg-red-500/10 text-red-600" : "border-border hover:border-red-400/60",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="mb-1.5 mt-4 block text-xs font-bold text-foreground/80">
              Untrusted HTML input <span className="font-normal text-muted-foreground">(rendered below as escaped text only)</span>
            </label>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setResult(null); }}
              spellCheck={false}
              rows={8}
              className="w-full rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed focus:border-primary focus:outline-none"
            />
            <div className="mt-3">
              <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={sanitize}>
                <ShieldCheck className="h-4 w-4" /> Sanitize
              </ActionButton>
              {!isPro && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free sanitizations left.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-bold">Raw input (escaped, never rendered)</h2>
            <pre className="max-h-40 overflow-auto rounded-xl bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              <code dangerouslySetInnerHTML={{ __html: escapeHtml(input) }} />
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Sanitized output</h2>
              {result && (
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy clean HTML"}
                </button>
              )}
            </div>
            {!result ? (
              <p className="rounded-xl bg-muted/40 p-6 text-center text-xs text-muted-foreground">
                Press Sanitize to see what survives.
              </p>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 font-bold text-green-600">{result.method}</span>
                  {result.removed >= 0 && (
                    <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 font-bold text-red-600">
                      {result.removed} element{result.removed === 1 ? "" : "s"}/attribute{result.removed === 1 ? "" : "s"} removed
                    </span>
                  )}
                </div>
                <p className="mb-1.5 text-xs font-bold text-foreground/80">Live render (sandboxed iframe)</p>
                <iframe
                  title="Sanitized preview"
                  sandbox=""
                  srcDoc={`<body style="font-family:system-ui;font-size:14px;margin:8px">${result.html}</body>`}
                  className="h-40 w-full rounded-xl border border-border bg-white"
                />
                <p className="mb-1.5 mt-3 text-xs font-bold text-foreground/80">Clean HTML</p>
                <pre className="max-h-40 overflow-auto rounded-xl bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                  {result.html || <span className="text-muted-foreground">(everything was stripped)</span>}
                </pre>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-bold">The pattern</h2>
            <pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{code}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
