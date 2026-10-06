// /tools/dotnet-config-converter - Convert appsettings.json to .env format
// (Section__Key) and parse ConnectionStrings into a readable table.
// 100% in-browser.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, Copy, Eraser } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/dotnet-config-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/dotnet-config-converter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/dotnet-config-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/dotnet-config-converter";
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
  component: DotnetConfigTool,
});

function flatten(obj: unknown, prefix: string, out: [string, string][]): void {
  if (obj === null || obj === undefined) {
    out.push([prefix, ""]);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${prefix}__${i}`, out));
    return;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}__${k}` : k, out);
    }
    return;
  }
  out.push([prefix, String(obj)]);
}

function toEnvValue(v: string): string {
  if (/[\s#"']/.test(v) || v === "") return `"${v.replace(/"/g, '\\"')}"`;
  return v;
}

function parseConnectionString(cs: string): [string, string][] {
  return cs
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf("=");
      return i < 0 ? [p, ""] as [string, string] : [p.slice(0, i).trim(), p.slice(i + 1).trim()] as [string, string];
    });
}

function DotnetConfigTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("dotnet-config-converter", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [envText, setEnvText] = useState("");
  const [connStrings, setConnStrings] = useState<{ name: string; pairs: [string, string][]; raw: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    if (!input.trim() || !trial.canUse) return;
    try {
      const parsed = JSON.parse(input) as Record<string, unknown>;
      const pairs: [string, string][] = [];
      flatten(parsed, "", pairs);
      setEnvText(pairs.map(([k, v]) => `${k}=${toEnvValue(v)}`).join("\n"));
      const cs = parsed["ConnectionStrings"];
      if (cs && typeof cs === "object" && !Array.isArray(cs)) {
        setConnStrings(
          Object.entries(cs as Record<string, unknown>).map(([name, v]) => ({
            name,
            raw: String(v ?? ""),
            pairs: parseConnectionString(String(v ?? "")),
          })),
        );
      } else {
        setConnStrings([]);
      }
      setError(null);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That is not valid JSON.");
    }
  }, [input, trial]);

  const copyText = useCallback(async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  }, []);

  const clear = useCallback(() => {
    setInput("");
    setEnvText("");
    setConnStrings([]);
    setError(null);
  }, []);

  return (
    <ToolPageShell toolId="dotnet-config-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName=".NET Config Converter" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">appsettings.json</p>
            <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"Logging": {"LogLevel": {"Default": "Information"}}, "ConnectionStrings": {"Default": "Server=.;Database=App;"}}'
            spellCheck={false}
            className="h-44 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton disabled={!input.trim() || !trial.canUse} onClick={run}>
              <ArrowRightLeft className="h-4 w-4" /> Convert
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">.env output</p>
            {envText && (
              <button type="button" onClick={() => copyText(envText, ".env copied")} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                <Copy className="h-3.5 w-3.5" /> Copy .env
              </button>
            )}
          </div>
          <textarea
            value={envText}
            readOnly
            placeholder=".env variables appear here"
            spellCheck={false}
            className="h-44 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Nested sections become <code className="rounded bg-muted px-1">Section__Key</code> names, which .NET reads as the same configuration. Arrays use zero-based indexes.
          </p>
        </div>

        {connStrings.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Connection strings</p>
              <button
                type="button"
                onClick={() => copyText(connStrings.map((c) => `${c.name}=${c.raw}`).join("\n"), "Connection strings copied")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Copy className="h-3.5 w-3.5" /> Copy all
              </button>
            </div>
            <div className="space-y-4">
              {connStrings.map((c) => (
                <div key={c.name} className="overflow-hidden rounded-xl border border-border">
                  <div className="bg-muted/60 px-4 py-2 font-mono text-sm font-bold">{c.name}</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {c.pairs.map(([k, v], i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="w-48 px-4 py-2 font-mono font-semibold text-foreground/80">{k}</td>
                          <td className="break-all px-4 py-2 font-mono text-muted-foreground">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
