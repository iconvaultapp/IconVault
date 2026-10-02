// /tools/css-attr-function - Style from HTML data attributes with typed attr():
// <length>, <number>, <color> and fallbacks, with live demos.
// Free, client-side only. Uses real attr() when supported, inline styles otherwise.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-attr-function")({
  head: () => {
    const seo = getToolSeoMeta("css-attr-function");
    const canonical = "https://iconvault.site/tools/css-attr-function";
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
  component: AttrTool,
});

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    return true;
  } catch {
    toast.error("Copy failed. Select the code manually.");
    return false;
  }
}

const DEMO_CSS = `/* attr() reads a data-* attribute and casts it to a CSS type.
   Syntax: attr(name type(<type>), fallback) */

.attr-box {
  /* data-size="180px" drives the width, 120px if missing */
  width: attr(data-size type(<length>), 120px);
  height: 64px;
}

.attr-progress {
  /* data-value="72" * 1% = 72% width */
  width: calc(attr(data-value type(<number>), 0) * 1%);
  height: 12px;
  border-radius: 999px;
  background: var(--primary);
}

.attr-swatch {
  /* data-color="#0d9488" drives the fill, gray if invalid */
  background: attr(data-color type(<color>), #9ca3af);
}

.attr-label::after {
  /* classic string attr(), works in every browser */
  content: attr(data-note);
}`;

const TYPES = [
  { type: "<length>", ex: 'width: attr(data-w type(<length>), 120px);', note: "px, rem, em..." },
  { type: "<number>", ex: "opacity: attr(data-o type(<number>), 1);", note: "unitless numbers" },
  { type: "<percentage>", ex: "width: attr(data-p type(<percentage>), 50%);", note: "for widths, stops" },
  { type: "<color>", ex: "color: attr(data-c type(<color>), black);", note: "hex, rgb(), named" },
  { type: "<string>", ex: "content: attr(data-label);", note: "classic, universal" },
] as const;

function AttrTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-attr-function", isPro);
  const seo = getToolSeo("css-attr-function");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [size, setSize] = useState(200);
  const [value, setValue] = useState(64);
  const [color, setColor] = useState("#0d9488");
  const [note, setNote] = useState("typed attr() is live");

  useEffect(() => {
    try {
      setSupported(typeof CSS !== "undefined" && CSS.supports("width", "attr(data-x type(<length>))"));
    } catch {
      setSupported(false);
    }
  }, []);

  const css = useMemo(() => DEMO_CSS, []);
  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(css)) trial.recordUse();
  };

  // Fallback inline styles when attr() is unsupported: same values, applied directly.
  const boxFallback = supported === false ? { width: size } : undefined;
  const barFallback = supported === false ? { width: `${value}%` } : undefined;
  const swatchFallback = supported === false ? { background: color } : undefined;

  return (
    <ToolPageShell toolId="css-attr-function" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS attr() Playground" left={trial.left} />
      <style>{DEMO_CSS}</style>

      {supported === false && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser does not support typed attr() yet.</span> The
            demos below are simulated with inline styles. Typed attr() needs Chrome 133+ or a recent Edge. The code is
            the real syntax.
          </p>
        </div>
      )}
      {supported === true && (
        <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser supports typed attr().</span> Every demo below
            is styled purely from its data attribute. Inspect the elements to see it.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>
                Box <span className="font-mono text-xs text-muted-foreground">data-size</span>
              </span>
              <span className="font-mono text-muted-foreground">{size}px</span>
            </div>
            <input type="range" min={80} max={360} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-primary" />
            <p className="mt-1 text-xs text-muted-foreground">
              Drives <span className="font-mono">width: attr(data-size type(&lt;length&gt;))</span>
            </p>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>
                Progress <span className="font-mono text-xs text-muted-foreground">data-value</span>
              </span>
              <span className="font-mono text-muted-foreground">{value}%</span>
            </div>
            <input type="range" min={0} max={100} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-primary" />
            <p className="mt-1 text-xs text-muted-foreground">
              Drives <span className="font-mono">calc(attr(data-value type(&lt;number&gt;)) * 1%)</span>
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              Swatch <span className="font-mono text-xs text-muted-foreground">data-color</span>
            </p>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent" />
              <span className="font-mono text-sm text-muted-foreground">{color}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Drives <span className="font-mono">background: attr(data-color type(&lt;color&gt;))</span>
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              Label <span className="font-mono text-xs text-muted-foreground">data-note</span>
            </p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              maxLength={40}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Classic string <span className="font-mono">content: attr(data-note)</span>, works everywhere.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Length demo</p>
            <div data-size={`${size}px`} className="attr-box flex items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary" style={boxFallback}>
              data-size="{size}px"
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Number demo</p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div data-value={value} className="attr-progress" style={barFallback} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">data-value="{value}"</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Color demo</p>
              <div className="flex items-center gap-3">
                <div data-color={color} className="attr-swatch h-12 w-12 rounded-lg border border-border" style={swatchFallback} />
                <span className="font-mono text-sm">data-color="{color}"</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">String demo</p>
              <p className="text-sm font-semibold">
                Status <span data-note={note} className="attr-label font-mono text-primary" />
              </p>
              <p className="mt-2 text-xs text-muted-foreground">data-note="{note}"</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">attr() types at a glance</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Example</th>
                    <th className="px-3 py-2 font-semibold">Accepts</th>
                  </tr>
                </thead>
                <tbody>
                  {TYPES.map((t) => (
                    <tr key={t.type} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono font-bold text-primary">{t.type}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{t.ex}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Copy the CSS</h2>
          <ActionButton disabled={!trial.canUse} onClick={copy}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{css}</pre>
        {!isPro && <p className={cn("mt-2 text-xs text-muted-foreground")}>{trial.left} of 5 free copies left.</p>}
      </div>
    </ToolPageShell>
  );
}
