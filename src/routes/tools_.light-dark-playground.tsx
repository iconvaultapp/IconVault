// /tools/light-dark-playground - Build theme tokens with the CSS
// light-dark() function and preview them live. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Contrast, Copy, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/light-dark-playground")({
  head: () => {
    const seo = getToolSeoMeta("light-dark-playground");
    const canonical = "https://iconvault.site/tools/light-dark-playground";
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
  component: LightDarkPlayground,
});

interface Token {
  key: string;
  label: string;
  light: string;
  dark: string;
}

const DEFAULTS: Token[] = [
  { key: "bg", label: "Background", light: "#ffffff", dark: "#0f172a" },
  { key: "surface", label: "Surface", light: "#f1f5f9", dark: "#1e293b" },
  { key: "text", label: "Text", light: "#0f172a", dark: "#f8fafc" },
  { key: "muted", label: "Muted text", light: "#64748b", dark: "#94a3b8" },
  { key: "border", label: "Border", light: "#e2e8f0", dark: "#334155" },
  { key: "primary", label: "Primary", light: "#0d9488", dark: "#2dd4bf" },
  { key: "on-primary", label: "On primary", light: "#ffffff", dark: "#042f2e" },
];

function LightDarkPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("light-dark-playground", isPro);
  const seo = getToolSeo("light-dark-playground");

  const [tokens, setTokens] = useState<Token[]>(DEFAULTS);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const set = (key: string, side: "light" | "dark", v: string) =>
    setTokens((ts) => ts.map((t) => (t.key === key ? { ...t, [side]: v } : t)));

  const get = (key: string) => {
    const t = tokens.find((x) => x.key === key);
    return t ? (theme === "light" ? t.light : t.dark) : "#000";
  };

  const css = useMemo(
    () =>
      `:root {\n  color-scheme: light dark;\n${tokens
        .map((t) => `  --${t.key}: light-dark(${t.light}, ${t.dark});`)
        .join("\n")}\n}\n\n/* usage */\n.card {\n  background: var(--surface);\n  color: var(--text);\n  border: 1px solid var(--border);\n}`,
    [tokens],
  );

  const copyCss = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      toast.success("Theme CSS copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="light-dark-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Light-Dark() Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-bold">Theme tokens</p>
          <div className="space-y-3">
            {tokens.map((t) => (
              <div key={t.key} className="rounded-xl bg-background p-3">
                <p className="mb-2 font-mono text-xs font-bold">--{t.key}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["light", "dark"] as const).map((side) => (
                    <div key={side} className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={t[side]}
                        onChange={(e) => set(t.key, side, e.target.value)}
                        className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-card p-0.5"
                        aria-label={`${t.label} ${side}`}
                      />
                      <input
                        value={t[side]}
                        spellCheck={false}
                        onChange={(e) => {
                          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value.trim())) set(t.key, side, e.target.value.trim());
                        }}
                        className="w-full min-w-0 rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-xs uppercase"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{t.label} light</span>
                  <span>dark</span>
                </div>
              </div>
            ))}
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
            <Copy className="h-4 w-4" /> Copy theme CSS
          </ActionButton>
          <p className="text-xs leading-relaxed text-muted-foreground">
            light-dark() picks the first color in light mode and the second in dark mode, driven by
            color-scheme. No JavaScript theme toggling needed.
          </p>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold">Live preview</p>
              <div className="flex rounded-full border border-border p-1">
                {(
                  [
                    { v: "light", icon: Sun, label: "Light" },
                    { v: "dark", icon: Moon, label: "Dark" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setTheme(o.v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
                      theme === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <o.icon className="h-3.5 w-3.5" /> {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl p-6 transition-colors sm:p-8"
              style={{ background: get("bg"), color: get("text") }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: get("muted") }}>
                Preview card
              </p>
              <h3 className="mt-2 text-2xl font-extrabold">Ship dark mode in one line</h3>
              <p className="mt-2 max-w-md text-sm" style={{ color: get("muted") }}>
                Every token below reads from the same light-dark() values you set on the left. Flip the
                toggle to see the whole card re-theme instantly.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-bold"
                  style={{ background: get("primary"), color: get("on-primary") }}
                >
                  Primary action
                </button>
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-bold"
                  style={{ border: `1px solid ${get("border")}`, color: get("text") }}
                >
                  Secondary
                </button>
              </div>
              <div
                className="mt-4 rounded-xl p-4 text-sm"
                style={{ background: get("surface"), border: `1px solid ${get("border")}` }}
              >
                <span style={{ color: get("muted") }}>Surface panel with a border token.</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Contrast className="h-4 w-4" /> Generated CSS
            </p>
            <pre className="max-h-[300px] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200">
              {css}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
