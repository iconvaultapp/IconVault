// /tools/url-parser - Paste any URL and see every component broken out:
// protocol, credentials, host, port, path segments, query params and
// hash. 100% client-side; nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/tools_/url-parser")({
  head: () => {
    const seo = getToolSeoMeta("url-parser");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: UrlParserTool,
});

interface ParsedUrl {
  assumedProtocol: boolean;
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  segments: string[];
  search: string;
  params: { key: string; value: string }[];
  hash: string;
  origin: string;
}

const SAMPLE = "https://user:secret@example.com:8080/docs/guides/setup?lang=en&theme=dark#install";

function parseUrl(raw: string): ParsedUrl {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Paste a URL first.");
  const assumedProtocol = !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  let u: URL;
  try {
    u = new URL(assumedProtocol ? `https://${trimmed}` : trimmed);
  } catch {
    throw new Error("That is not a valid URL. Check for typos, spaces or missing dots.");
  }
  if (!u.hostname) throw new Error("That URL has no host.");
  const params: { key: string; value: string }[] = [];
  u.searchParams.forEach((value, key) => params.push({ key, value }));
  return {
    assumedProtocol,
    protocol: u.protocol.replace(/:$/, ""),
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.host,
    hostname: u.hostname,
    port: u.port,
    pathname: u.pathname,
    segments: u.pathname.split("/").filter((s) => s !== ""),
    search: u.search,
    params,
    hash: u.hash ? decodeURIComponent(u.hash.slice(1)) : "",
    origin: u.origin === "null" ? "" : u.origin,
  };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      toast.error(`Could not copy ${label}.`);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {done ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function UrlParserTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("url-parser", isPro);
  const seo = getToolSeo("url-parser");

  const [input, setInput] = useState(SAMPLE);
  const [parsed, setParsed] = useState<ParsedUrl | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doParse = () => {
    if (!trial.canUse) return;
    setError(null);
    try {
      const p = parseUrl(input);
      setParsed(p);
      trial.recordUse();
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "Invalid URL.");
    }
  };

  const cards: { label: string; value: string; mono?: boolean }[] = parsed
    ? [
        { label: "Protocol", value: parsed.protocol, mono: true },
        { label: "Username", value: parsed.username || "(none)" },
        { label: "Password", value: parsed.password ? "••••••••" : "(none)" },
        { label: "Host", value: parsed.host, mono: true },
        { label: "Hostname", value: parsed.hostname, mono: true },
        { label: "Port", value: parsed.port || "(default)" },
        { label: "Path", value: parsed.pathname, mono: true },
        { label: "Hash", value: parsed.hash || "(none)", mono: true },
        { label: "Origin", value: parsed.origin || "(none)", mono: true },
      ]
    : [];

  return (
    <ToolPageShell toolId="url-parser" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="URL Parser" left={trial.left} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <Label className="mb-2 block text-[13px] font-medium text-foreground/80">URL to parse</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doParse();
            }}
            placeholder="https://example.com/path?x=1#hash"
            spellCheck={false}
            className="font-mono"
          />
          <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={doParse}>
            <Link2 className="h-4 w-4" /> Parse URL
          </ActionButton>
        </div>
        {parsed?.assumedProtocol && (
          <p className="mt-1.5 text-xs text-muted-foreground">No protocol detected, so https:// was assumed.</p>
        )}
        {!isPro && (
          <p className="mt-2 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free parses left - runs fully in your browser, nothing is uploaded.
          </p>
        )}
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
      </div>

      {!parsed ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-border bg-card text-center">
          <Link2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-semibold">Your URL breakdown appears here</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Every component is shown on its own card with a copy button.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
                  {c.value && !c.value.startsWith("(") && <CopyButton text={c.value} label={c.label} />}
                </div>
                <p className={`break-all text-sm font-medium ${c.mono ? "font-mono" : ""}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-[13px] font-medium text-foreground/80">
                Path segments ({parsed.segments.length})
              </p>
              {parsed.segments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No path segments, the URL points at the root.</p>
              ) : (
                <ol className="space-y-1.5">
                  {parsed.segments.map((s, i) => (
                    <li key={i} className="flex items-center gap-2.5 rounded-lg bg-muted px-3 py-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="flex-1 break-all font-mono text-sm">{s}</span>
                      <CopyButton text={s} label={`segment ${i + 1}`} />
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-[13px] font-medium text-foreground/80">
                Query parameters ({parsed.params.length})
              </p>
              {parsed.params.length === 0 ? (
                <p className="text-sm text-muted-foreground">No query string on this URL.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Key</th>
                        <th className="py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.params.map((p, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 font-mono font-semibold">{p.key}</td>
                          <td className="py-2">
                            <span className="mr-2 break-all font-mono text-muted-foreground">{p.value || "(empty)"}</span>
                            {p.value && <CopyButton text={p.value} label={`param ${p.key}`} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
