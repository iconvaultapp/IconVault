// /tools/web-font-analyzer - Paste @font-face CSS or a Google Fonts CSS URL
// and get a breakdown of families, weights, styles, unicode ranges, plus a
// preload snippet and honest performance tips. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileSearch, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/web-font-analyzer")({
  head: () => {
    const seo = getToolSeoMeta("web-font-analyzer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: WebFontAnalyzerTool,
});

interface FontFace {
  family: string;
  weight: string;
  style: string;
  display: string;
  srcs: string[];
  unicodeRange: string;
  subsets: string[];
}

const SUBSET_HINTS: [RegExp, string][] = [
  [/U\+0000-00FF/i, "latin"],
  [/U\+0100-024F/i, "latin-ext"],
  [/U\+0370-03FF/i, "greek"],
  [/U\+0400-04FF/i, "cyrillic"],
  [/U\+0500-052F/i, "cyrillic-ext"],
  [/U\+0590-05FF/i, "hebrew"],
  [/U\+0600-06FF/i, "arabic"],
  [/U\+0750-077F/i, "arabic"],
  [/U\+0900-097F/i, "devanagari"],
  [/U\+0980-09FF/i, "bengali"],
  [/U\+0A00-0A7F/i, "gurmukhi"],
  [/U\+0A80-0AFF/i, "gujarati"],
  [/U\+0B00-0B7F/i, "oriya"],
  [/U\+0B80-0BFF/i, "tamil"],
  [/U\+0C00-0C7F/i, "telugu"],
  [/U\+0C80-0CFF/i, "kannada"],
  [/U\+0D00-0D7F/i, "malayalam"],
  [/U\+0E00-0E7F/i, "thai"],
  [/U\+1F00-1FFF/i, "greek-ext"],
  [/U\+2C00-2C5F/i, "glagolitic"],
  [/U\+3040-309F/i, "hiragana"],
  [/U\+30A0-30FF/i, "katakana"],
  [/U\+4E00-9FFF/i, "cjk"],
  [/U\+AC00-D7AF/i, "korean"],
  [/U\+FF00-FFEF/i, "halfwidth/fullwidth"],
  [/U\+2000-206F/i, "punctuation"],
  [/U\+20A0-20CF/i, "currency"],
  [/U\+2100-214F/i, "letterlike"],
];

function detectSubsets(range: string): string[] {
  const out: string[] = [];
  for (const [re, name] of SUBSET_HINTS) {
    if (re.test(range) && !out.includes(name)) out.push(name);
  }
  return out;
}

function parseFontFaces(css: string): FontFace[] {
  const blocks = css.match(/@font-face\s*{[^}]*}/gi) ?? [];
  return blocks.map((block) => {
    const get = (prop: string) => {
      const m = block.match(new RegExp(`${prop}\\s*:\\s*([^;]+);`, "i"));
      return m ? (m[1] ?? "").trim().replace(/^['"]|['"]$/g, "") : "";
    };
    const src = get("src");
    const urls = [...src.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)]
      .map((m) => m[1])
      .filter((u): u is string => Boolean(u));
    const unicodeRange = get("unicode-range");
    return {
      family: get("font-family"),
      weight: get("font-weight") || "400",
      style: get("font-style") || "normal",
      display: get("font-display") || "(not set)",
      srcs: urls,
      unicodeRange,
      subsets: unicodeRange ? detectSubsets(unicodeRange) : [],
    };
  });
}

const EXAMPLE_CSS = `/* Paste your @font-face CSS here, or a Google Fonts CSS URL below. */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}`;

function WebFontAnalyzerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-font-analyzer", isPro);
  const seo = getToolSeo("web-font-analyzer");

  const [cssInput, setCssInput] = useState(EXAMPLE_CSS);
  const [urlInput, setUrlInput] = useState("");
  const [analyzed, setAnalyzed] = useState<FontFace[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    if (!analyzed) return null;
    const families = [...new Set(analyzed.map((f) => f.family))];
    const weights = [...new Set(analyzed.map((f) => f.weight))];
    const styles = [...new Set(analyzed.map((f) => f.style))];
    const woff2 = analyzed.filter((f) => f.srcs.some((s) => s.includes(".woff2"))).length;
    const missingDisplay = analyzed.filter((f) => f.display === "(not set)").length;
    const allSubsets = [...new Set(analyzed.flatMap((f) => f.subsets))];
    return { families, weights, styles, woff2, missingDisplay, allSubsets };
  }, [analyzed]);

  const preloadSnippet = useMemo(() => {
    if (!analyzed) return "";
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const f of analyzed) {
      const url = f.srcs.find((s) => s.includes(".woff2")) ?? f.srcs[0];
      if (!url || seen.has(url)) continue;
      seen.add(url);
      lines.push(`<link rel="preload" as="font" type="font/woff2" crossorigin href="${url}">`);
    }
    return lines.join("\n");
  }, [analyzed]);

  const analyze = async () => {
    if (busy || !trial.canUse) return;
    setBusy(true);
    setFetchError(null);
    try {
      let css = cssInput;
      if (urlInput.trim()) {
        const res = await fetch(urlInput.trim());
        if (!res.ok) throw new Error(`Request failed with status ${res.status}.`);
        css = await res.text();
        if (!/@font-face/i.test(css)) {
          throw new Error("That URL did not return @font-face CSS. Paste a Google Fonts css2 URL or raw CSS.");
        }
      }
      const faces = parseFontFaces(css);
      if (faces.length === 0) throw new Error("No @font-face blocks found. Paste valid font CSS.");
      setAnalyzed(faces);
      trial.recordUse();
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Could not analyze that input.");
    } finally {
      setBusy(false);
    }
  };

  const copyPreload = async () => {
    if (!preloadSnippet) return;
    try {
      await navigator.clipboard.writeText(preloadSnippet);
      setCopied(true);
      toast.success("Preload snippet copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="web-font-analyzer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Web Font Analyzer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Google Fonts CSS URL (optional)</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://fonts.googleapis.com/css2?family=Inter…"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Fetched live in your browser. Some hosts block cross-origin reads; if a URL fails, paste the CSS instead.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">@font-face CSS</label>
            <textarea
              value={cssInput}
              onChange={(e) => setCssInput(e.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs outline-none focus:border-primary"
            />
          </div>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={analyze}>
            <FileSearch className="h-4 w-4" /> {busy ? "Analyzing…" : "Analyze fonts"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left - nothing leaves your browser.
            </p>
          )}
          {fetchError && (
            <p className="flex items-start gap-2 text-sm font-medium text-red-500">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {fetchError}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {!analyzed ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
              <FileSearch className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Paste font CSS or a URL to analyze it</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                You get a full breakdown of families, weights, styles, unicode ranges, a preload snippet, and honest performance advice.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Font faces", value: String(analyzed.length) },
                  { label: "Families", value: String(summary!.families.length) },
                  { label: "Weights", value: String(summary!.weights.length) },
                  { label: "WOFF2 files", value: String(summary!.woff2) },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-sm font-bold">All @font-face blocks</p>
                <div className="space-y-2">
                  {analyzed.map((f, i) => (
                    <div key={i} className="rounded-xl border border-border p-3 text-sm">
                      <p className="font-bold">{f.family || "(unnamed)"}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        weight {f.weight} · style {f.style} · display {f.display}
                      </p>
                      {f.subsets.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {f.subsets.map((s) => (
                            <span key={s} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {f.srcs[0] && <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{f.srcs[0]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold">Preload snippet (put in your &lt;head&gt;)</p>
                  <button
                    type="button"
                    onClick={copyPreload}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="max-h-48 overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{preloadSnippet || "No font URLs found."}</pre>
                <p className="mt-2 text-xs text-muted-foreground">
                  Only preload the 1-2 weights your hero text actually uses. Preloading everything slows the page down.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="mb-2 text-sm font-bold">FOIT vs FOUT</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">FOIT</strong> (flash of invisible text): the browser hides text until the font loads.
                    <strong className="text-foreground"> FOUT</strong> (flash of unstyled text): it shows a fallback font first, then swaps.
                    <strong className="text-foreground"> font-display: swap</strong> chooses FOUT, which keeps text readable during load.
                    {summary!.missingDisplay > 0 && (
                      <> <strong className="text-red-500">{summary!.missingDisplay} of your faces</strong> do not set font-display at all, which means the browser default (usually FOIT-like blocking) applies.</>
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="mb-2 text-sm font-bold">Performance tips</p>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                    <li>Use <strong className="text-foreground">WOFF2 only</strong>; drop WOFF/TTF fallbacks for modern browsers.</li>
                    <li>Load only the <strong className="text-foreground">weights and styles you use</strong> ({summary!.weights.length} weight{summary!.weights.length === 1 ? "" : "s"} found here).</li>
                    <li>Self-host instead of a font CDN when you need full caching control.</li>
                    <li>Set <strong className="text-foreground">font-display: swap</strong> on every face.</li>
                    <li>Match fallback metrics (size-adjust) to reduce layout shift on swap.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
