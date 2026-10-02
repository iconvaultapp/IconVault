// /tools/safelink-decoder - Paste Outlook SafeLinks and get the real URL back,
// batch-friendly. 100% in-browser: nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Eraser, ExternalLink, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/safelink-decoder")({
  head: () => {
    const seo = getToolSeoMeta("safelink-decoder");
    const canonical = "https://iconvault.site/tools/safelink-decoder";
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
  component: SafelinkTool,
});

interface DecodedRow {
  input: string;
  url: string | null;
  note: string;
}

function decodeOnce(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Repeatedly decode until stable (handles double encoding). */
function deepDecode(s: string): string {
  let prev = s;
  for (let i = 0; i < 5; i++) {
    const next = decodeOnce(prev);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

function decodeSafeLink(line: string): DecodedRow {
  const input = line.trim();
  if (!input) return { input: line, url: null, note: "Empty line" };
  let candidate = input;
  try {
    const u = new URL(input);
    if (!/safelinks\.protection\.outlook\.com$/i.test(u.hostname)) {
      return { input, url: null, note: "Not an Outlook SafeLink" };
    }
    const raw = u.searchParams.get("url");
    if (!raw) return { input, url: null, note: "No url= parameter found" };
    candidate = deepDecode(raw);
  } catch {
    // Not a full URL - try to pull a url= param out of the raw text
    const m = input.match(/[?&]url=([^&\s]+)/i);
    if (!m) return { input, url: null, note: "Not an Outlook SafeLink" };
    candidate = deepDecode(m[1] ?? "");
  }
  try {
    new URL(candidate);
    return { input, url: candidate, note: "" };
  } catch {
    return { input, url: null, note: "Decoded value is not a valid URL" };
  }
}

function SafelinkTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("safelink-decoder", isPro);
  const seo = getToolSeo("safelink-decoder");

  const [input, setInput] = useState("");
  const [rows, setRows] = useState<DecodedRow[] | null>(null);

  const decode = () => {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || !trial.canUse) return;
    setRows(lines.map(decodeSafeLink));
    trial.recordUse();
    toast.success("Links decoded");
  };

  const copyOne = (url: string) => {
    void navigator.clipboard.writeText(url).then(() => toast.success("URL copied"));
  };

  const copyAll = () => {
    if (!rows) return;
    const urls = rows.filter((r) => r.url).map((r) => r.url!);
    if (urls.length === 0) {
      toast.error("No valid URLs to copy");
      return;
    }
    void navigator.clipboard.writeText(urls.join("\n")).then(() => toast.success(`${urls.length} URLs copied`));
  };

  const good = rows?.filter((r) => r.url).length ?? 0;

  return (
    <ToolPageShell toolId="safelink-decoder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SafeLink Decoder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label htmlFor="safelink-input" className="text-sm font-semibold">
            Paste SafeLinks, one per line
          </label>
          <textarea
            id="safelink-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2Fpage&data=..."}
            rows={12}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="flex flex-wrap gap-3">
            <ActionButton busy={false} disabled={!input.trim() || !trial.canUse} onClick={decode}>
              <ShieldOff className="h-4 w-4" /> Decode links
            </ActionButton>
            <button
              type="button"
              onClick={() => { setInput(""); setRows(null); }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
            >
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free decodes left - links are decoded locally, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {rows ? `Results - ${good} of ${rows.length} decoded` : "Decoded URLs appear here"}
            </p>
            {rows && good > 0 && (
              <button type="button" onClick={copyAll} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-primary/40">
                <Copy className="h-3.5 w-3.5" /> Copy all
              </button>
            )}
          </div>
          {!rows ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <ShieldOff className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Unwrap those long Outlook links</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Paste any safelinks.protection.outlook.com link and see where it really goes, with double encoding handled.
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-auto">
              {rows.map((r, i) => (
                <div key={i} className={cn("rounded-xl border p-3", r.url ? "border-border bg-background" : "border-red-500/30 bg-red-500/5")}>
                  {r.url ? (
                    <>
                      <p className="break-all font-mono text-xs text-foreground">{r.url}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
                        >
                          <ExternalLink className="h-3 w-3" /> Open
                        </a>
                        <button
                          type="button"
                          onClick={() => copyOne(r.url!)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:border-primary/40"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="break-all font-mono text-xs text-muted-foreground">{r.input}</p>
                      <p className="mt-1.5 text-xs font-semibold text-red-500">{r.note}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
