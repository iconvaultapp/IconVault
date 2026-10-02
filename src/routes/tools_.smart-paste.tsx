// /tools/smart-paste - Paste anything; auto-detects JWT, JSON, XML, SQL, URL,
// Base64, CSV, Markdown and points you at the right IconVault tool.
// 100% in-browser: nothing you paste is uploaded.

import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ClipboardPaste, Eraser, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/smart-paste")({
  head: () => {
    const seo = getToolSeoMeta("smart-paste");
    const canonical = "https://iconvault.site/tools/smart-paste";
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
  component: SmartPasteTool,
});

type DetectedType = "jwt" | "json" | "xml" | "sql" | "url" | "base64" | "csv" | "markdown" | "text";

const TYPE_META: Record<DetectedType, { label: string; blurb: string; tool?: { path: string; label: string } }> = {
  jwt: {
    label: "JWT",
    blurb: "Three base64url segments. Decode the header and payload to inspect claims.",
    tool: { path: "/tools/jwt-decoder", label: "JWT Decoder" },
  },
  json: {
    label: "JSON",
    blurb: "Looks like JSON. Format, validate and explore it as a tree.",
    tool: { path: "/tools/json-formatter", label: "JSON Formatter" },
  },
  xml: {
    label: "XML",
    blurb: "Looks like XML or HTML markup. IconVault does not have an XML formatter yet, so the raw text is shown below.",
  },
  sql: {
    label: "SQL",
    blurb: "Looks like a SQL statement. The keywords are highlighted below.",
  },
  url: {
    label: "URL",
    blurb: "A web address. Inspect or encode its parts.",
    tool: { path: "/tools/url-encoder", label: "URL Encoder" },
  },
  base64: {
    label: "Base64",
    blurb: "Valid Base64. Decode it to see what it holds.",
    tool: { path: "/tools/base64", label: "Base64" },
  },
  csv: {
    label: "CSV",
    blurb: "Comma-separated rows. The first rows are previewed below.",
  },
  markdown: {
    label: "Markdown",
    blurb: "Markdown text. See a live rendered preview.",
    tool: { path: "/tools/markdown-preview", label: "Markdown Preview" },
  },
  text: {
    label: "Plain text",
    blurb: "No known structured format detected in this paste.",
  },
};

function b64urlToJson(part: string): unknown {
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

function detectType(raw: string): { type: DetectedType; detail?: string } {
  const t = raw.trim();
  if (!t) return { type: "text" };

  // JWT: exactly 3 base64url parts, decodable header/payload
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)) {
    try {
      const [h, p] = t.split(".");
      b64urlToJson(h ?? "");
      b64urlToJson(p ?? "");
      return { type: "jwt" };
    } catch {
      /* fall through */
    }
  }
  // URL: single line, scheme://
  if (/^https?:\/\/[^\s]+$/i.test(t)) {
    try {
      const u = new URL(t);
      return { type: "url", detail: `${u.hostname}${u.pathname}${u.search}` };
    } catch {
      /* fall through */
    }
  }
  // JSON
  if (/^[{[]/.test(t)) {
    try {
      JSON.parse(t);
      return { type: "json" };
    } catch {
      /* fall through */
    }
  }
  // XML
  if (/^<(!DOCTYPE|[a-zA-Z][^>]*>)/i.test(t)) return { type: "xml" };
  // SQL
  if (/^\s*(SELECT|INSERT\s+INTO|UPDATE\s+\w+|DELETE\s+FROM|CREATE\s+(TABLE|INDEX|VIEW)|DROP\s+TABLE|ALTER\s+TABLE)\b/i.test(t))
    return { type: "sql" };
  // Markdown
  if (/(^|\n)#{1,6}\s|^```|\*\*[^*]+\*\*|!\[[^\]]*\]\(|^\s*[-*+]\s+\S/m.test(t)) return { type: "markdown" };
  // CSV: multiple lines, commas in most lines
  const lines = t.split("\n").filter((l) => l.trim());
  if (lines.length >= 2) {
    const withComma = lines.filter((l) => l.includes(",")).length;
    if (withComma / lines.length >= 0.7) return { type: "csv", detail: `${lines.length} rows` };
  }
  // Base64: long single chunk of the alphabet, valid length
  const noSpace = t.replace(/\s+/g, "");
  if (noSpace.length >= 16 && noSpace.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(noSpace)) {
    try {
      atob(noSpace);
      return { type: "base64", detail: `${noSpace.length} chars` };
    } catch {
      /* fall through */
    }
  }
  return { type: "text" };
}

function prettyJson(t: string): string {
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return t;
  }
}

function buildPreview(type: DetectedType, t: string): string {
  switch (type) {
    case "jwt": {
      const [h, p] = t.split(".");
      try {
        return `HEADER\n${JSON.stringify(b64urlToJson(h ?? ""), null, 2)}\n\nPAYLOAD\n${JSON.stringify(b64urlToJson(p ?? ""), null, 2)}`;
      } catch {
        return t;
      }
    }
    case "json":
      return prettyJson(t).slice(0, 2000);
    case "url": {
      try {
        const u = new URL(t);
        const parts = [
          `protocol: ${u.protocol}`,
          `host: ${u.host}`,
          `path: ${u.pathname || "/"}`,
          u.search ? `query: ${u.search.slice(1)}` : null,
          u.hash ? `hash: ${u.hash}` : null,
        ].filter(Boolean);
        return parts.join("\n");
      } catch {
        return t;
      }
    }
    case "base64": {
      try {
        const decoded = atob(t.replace(/\s+/g, ""));
        const printable = decoded.replace(/[^\x20-\x7E\n\r\t]/g, "");
        return (printable.length > decoded.length / 2 ? printable : "Binary data - cannot show as text").slice(0, 1000);
      } catch {
        return t;
      }
    }
    case "csv": {
      const lines = t.split("\n").filter((l) => l.trim());
      const head = lines.slice(0, 8);
      return head.map((l, i) => `row ${i + 1}: ${l}`).join("\n") + (lines.length > 8 ? `\n... and ${lines.length - 8} more rows` : "");
    }
    default:
      return t.slice(0, 2000);
  }
}

function SmartPasteTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("smart-paste", isPro);
  const seo = getToolSeo("smart-paste");

  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ type: DetectedType; detail?: string; preview: string } | null>(null);

  const analyze = (raw: string) => {
    const t = raw.trim();
    if (!t) {
      setResult(null);
      return;
    }
    const { type, detail } = detectType(raw);
    setResult({ type, preview: buildPreview(type, t), ...(detail !== undefined ? { detail } : {}) });
  };

  const meta = result ? TYPE_META[result.type] : null;

  // Cheap live hint (does not consume trial)
  const hint = useMemo(() => (input.trim() ? detectType(input).type : null), [input]);

  const runAnalyze = () => {
    if (!input.trim() || !trial.canUse) return;
    analyze(input);
    trial.recordUse();
    toast.success("Format detected");
  };

  return (
    <ToolPageShell toolId="smart-paste" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Smart Paste" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <label htmlFor="paste-area" className="text-sm font-semibold">
              Paste anything here
            </label>
            {hint && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Looks like: {TYPE_META[hint].label}
              </span>
            )}
          </div>
          <textarea
            id="paste-area"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Paste a JWT, some JSON, a URL, SQL, Base64, CSV or Markdown..."}
            rows={14}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="flex flex-wrap gap-3">
            <ActionButton busy={false} disabled={!input.trim() || !trial.canUse} onClick={runAnalyze}>
              <ClipboardPaste className="h-4 w-4" /> Detect format
            </ActionButton>
            <button
              type="button"
              onClick={() => { setInput(""); setResult(null); }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
            >
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free detections left - pastes never leave your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result || !meta ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ClipboardPaste className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your paste is analyzed here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Smart Paste recognizes JWTs, JSON, XML, SQL, URLs, Base64, CSV and Markdown, then points you at the right tool.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", result.type === "text" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary")}>
                  {meta.label}
                </span>
                {result.detail && <span className="text-xs text-muted-foreground">{result.detail}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{meta.blurb}</p>
              {meta.tool && (
                <Link
                  to={meta.tool.path}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  Open in {meta.tool.label} <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Preview</p>
                <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed">
                  {result.preview}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
