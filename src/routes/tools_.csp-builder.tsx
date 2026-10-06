// /tools/csp-builder - Visual Content-Security-Policy builder. Toggle
// directives, add sources with one click, pick a preset, copy the header.
// 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/csp-builder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/csp-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/csp-builder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/csp-builder";
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
  component: CspBuilderTool,
});

interface DirectiveDef {
  key: string;
  desc: string;
}

const DIRECTIVES: DirectiveDef[] = [
  { key: "default-src", desc: "Fallback for every fetch directive" },
  { key: "script-src", desc: "Where scripts may load from" },
  { key: "style-src", desc: "Where stylesheets may load from" },
  { key: "img-src", desc: "Where images may load from" },
  { key: "connect-src", desc: "fetch, WebSocket, EventSource targets" },
  { key: "font-src", desc: "Where fonts may load from" },
  { key: "frame-src", desc: "Where frames may be embedded from" },
  { key: "media-src", desc: "Where audio/video may load from" },
  { key: "object-src", desc: "Plugins and embeds (usually 'none')" },
  { key: "base-uri", desc: "Allowed <base> tag URLs" },
  { key: "form-action", desc: "Where forms may submit to" },
  { key: "frame-ancestors", desc: "Who may embed this page" },
];

const SOURCE_CHIPS = ["'self'", "'none'", "https:", "data:", "blob:", "'unsafe-inline'", "'unsafe-eval'"];

type PresetName = "strict" | "balanced" | "legacy";

const PRESETS: Record<PresetName, { label: string; note: string; values: Record<string, string>; upgrade: boolean }> = {
  strict: {
    label: "Strict",
    note: "Maximum protection. Inline scripts and styles will be blocked, use nonces or hashes.",
    values: {
      "default-src": "'self'",
      "script-src": "'self'",
      "style-src": "'self'",
      "img-src": "'self' data:",
      "connect-src": "'self'",
      "font-src": "'self'",
      "object-src": "'none'",
      "base-uri": "'self'",
      "form-action": "'self'",
      "frame-ancestors": "'none'",
    },
    upgrade: true,
  },
  balanced: {
    label: "Balanced",
    note: "Works with most real sites: allows inline styles and HTTPS images, blocks plugins.",
    values: {
      "default-src": "'self'",
      "script-src": "'self'",
      "style-src": "'self' 'unsafe-inline'",
      "img-src": "'self' data: https:",
      "connect-src": "'self' https:",
      "font-src": "'self' https: data:",
      "object-src": "'none'",
      "base-uri": "'self'",
      "form-action": "'self'",
      "frame-ancestors": "'self'",
    },
    upgrade: true,
  },
  legacy: {
    label: "Legacy",
    note: "For old apps that need inline code. Weak protection, migrate away when you can.",
    values: {
      "default-src": "* 'unsafe-inline' 'unsafe-eval' http: https: data:",
      "object-src": "'none'",
    },
    upgrade: false,
  },
};

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function CspBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("csp-builder", isPro);
  const seo = toolSeo;

  const [values, setValues] = useState<Record<string, string>>(PRESETS.balanced.values);
  const [upgrade, setUpgrade] = useState(true);
  const [copied, setCopied] = useState(false);

  const setDirective = (key: string, value: string) =>
    setValues((p) => ({ ...p, [key]: value }));

  const removeDirective = (key: string) =>
    setValues((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });

  const addChip = (key: string, chip: string) => {
    const cur = values[key] ?? "";
    if (cur.split(/\s+/).includes(chip)) return;
    setDirective(key, (cur ? cur + " " : "") + chip);
  };

  const addNonce = (key: string) => addChip(key, `'nonce-${randomNonce()}'`);

  const applyPreset = (name: PresetName) => {
    setValues(PRESETS[name].values);
    setUpgrade(PRESETS[name].upgrade);
    toast.success(`${PRESETS[name].label} preset applied`);
  };

  const policy = useMemo(() => {
    const parts = DIRECTIVES.filter((d) => values[d.key]?.trim()).map(
      (d) => `${d.key} ${values![d.key]!.trim!()}`,
    );
    if (upgrade) parts.push("upgrade-insecure-requests");
    return parts.join("; ");
  }, [values, upgrade]);

  const header = `Content-Security-Policy: ${policy}`;

  const doCopy = async () => {
    if (!trial.canUse || !policy) return;
    const ok = await copyText(header);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success("CSP header copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  return (
    <ToolPageShell toolId="csp-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSP Builder" left={trial.left} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Start from a preset:</span>
        {(Object.keys(PRESETS) as PresetName[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => applyPreset(p)}
            title={PRESETS[p].note}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold transition hover:border-primary/40 hover:text-primary"
          >
            {PRESETS[p].label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          {DIRECTIVES.map((d) => {
            const enabled = values[d.key] !== undefined;
            return (
              <div key={d.key} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Enable ${d.key}`}
                    onClick={() => (enabled ? removeDirective(d.key) : setDirective(d.key, "'self'"))}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition",
                      enabled ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        enabled ? "left-[22px]" : "left-0.5",
                      )}
                    />
                  </button>
                  <div className="min-w-0">
                    <p className={cn("font-mono text-sm font-bold", !enabled && "text-muted-foreground")}>{d.key}</p>
                    <p className="truncate text-xs text-muted-foreground">{d.desc}</p>
                  </div>
                </div>
                {enabled && (
                  <div className="mt-3 space-y-2">
                    <input
                      value={values[d.key]}
                      onChange={(e) => setDirective(d.key, e.target.value)}
                      placeholder="'self' https://cdn.example.com"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {SOURCE_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => addChip(d.key, chip)}
                          className="rounded-lg bg-muted px-2 py-1 font-mono text-[11px] font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                        >
                          {chip}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => addNonce(d.key)}
                        className="rounded-lg bg-muted px-2 py-1 font-mono text-[11px] font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                      >
                        + nonce
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-card p-4">
            <span>
              <span className="font-mono text-sm font-bold">upgrade-insecure-requests</span>
              <span className="block text-xs text-muted-foreground">Rewrite http:// subresource URLs to https://</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={upgrade}
              onClick={() => setUpgrade((v) => !v)}
              className={cn("relative h-6 w-11 shrink-0 rounded-full transition", upgrade ? "bg-primary" : "bg-muted")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", upgrade ? "left-[22px]" : "left-0.5")} />
            </button>
          </label>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">Generated header</p>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-3 font-mono text-[12px] leading-relaxed">
              {policy || "Enable at least one directive."}
            </pre>
            <div className="mt-4">
              <ActionButton disabled={!trial.canUse || !policy} onClick={() => void doCopy()}>
                {copied ? <Check className="h-4 w-4 text-green-200" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy header"}
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
            <div className="mt-4 flex gap-2 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              <Shield className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Deploy with the <code className="font-mono">Content-Security-Policy</code> response header,
                or as a <code className="font-mono">&lt;meta http-equiv&gt;</code> tag for testing. Meta tags
                cannot use frame-ancestors or reporting.
              </span>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
