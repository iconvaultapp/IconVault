// /tools/device-info - A snapshot of this device and browser, as JSON.
// Runs fully in your browser, nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/device-info")({
  head: () => {
    const seo = getToolSeoMeta("device-info");
    const canonical = "https://iconvault.site/tools/device-info";
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
  component: DeviceInfoTool,
});

function parseBrowser(ua: string): string {
  const m = ua.match(/(Edg|Edge|Chrome|Chromium|Firefox|Safari|OPR|Opera)\/(\d+)/);
  if (m) {
    const name = m[1] === "OPR" ? "Opera" : m[1] === "Edg" ? "Edge" : m[1];
    return `${name} ${m[2]}`;
  }
  return "Unknown";
}

interface NavExtras {
  cores?: number;
  memory?: number;
  touch?: boolean;
  connection?: string;
}

function getInfo(): { cards: { label: string; value: string }[]; json: Record<string, string | number | boolean | null> } {
  const ua = navigator.userAgent;
  const nav = navigator as Navigator & NavExtras & { connection?: { effectiveType?: string } };
  const screenRes = `${window.screen.width} x ${window.screen.height}`;
  const viewport = `${window.innerWidth} x ${window.innerHeight}`;
  const dpr = window.devicePixelRatio ?? 1;
  const platform = navigator.platform || "Unknown";
  const browser = parseBrowser(ua);
  const cores = nav.hardwareConcurrency ?? null;
  const devMem = (nav as any).deviceMemory;
  const memory = typeof devMem === "number" ? `${devMem} GB (approx)` : "Not available";
  const touch = navigator.maxTouchPoints > 0 ? `Yes (${navigator.maxTouchPoints} points)` : "No";
  const connection = nav.connection?.effectiveType ?? "Not available";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  const language = navigator.language || "Unknown";

  const json: Record<string, string | number | boolean | null> = {
    screenResolution: screenRes,
    viewport: viewport,
    devicePixelRatio: dpr,
    platform,
    browser,
    cpuCores: cores,
    deviceMemory: memory,
    touchSupport: touch,
    connectionType: connection,
    timezone,
    language,
    userAgent: ua,
  };

  return {
    cards: [
      { label: "Screen resolution", value: screenRes },
      { label: "Viewport", value: viewport },
      { label: "Device pixel ratio", value: String(dpr) },
      { label: "Platform", value: platform },
      { label: "Browser", value: browser },
      { label: "CPU cores", value: cores != null ? String(cores) : "Not available" },
      { label: "Device memory", value: memory },
      { label: "Touch support", value: touch },
      { label: "Connection type", value: connection },
      { label: "Timezone", value: timezone },
      { label: "Language", value: language },
    ],
    json,
  };
}

function DeviceInfoTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("device-info", isPro);
  const seo = getToolSeo("device-info");
  const [refreshKey, setRefreshKey] = useState(0);

  const { cards, json } = useMemo(getInfo, [refreshKey]);
  const jsonText = useMemo(() => JSON.stringify(json, null, 2), [json]);

  const copyJson = () => {
    navigator.clipboard.writeText(jsonText).then(() => {
      trial.recordUse();
      toast.success("Device info copied as JSON");
    });
  };

  return (
    <ToolPageShell toolId="device-info" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Device Info" left={trial.left} />

      <div className="mb-4 flex flex-wrap gap-2">
        <ActionButton onClick={copyJson}>
          <Copy className="h-4 w-4" /> Copy as JSON
        </ActionButton>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1 break-words font-mono text-sm font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <details className="mt-6 rounded-2xl border border-border bg-card p-5">
        <summary className="cursor-pointer text-sm font-bold">Raw JSON</summary>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs">{jsonText}</pre>
      </details>

      <p className="mt-4 text-xs text-muted-foreground">
        Detected live from this device - runs fully in your browser, nothing is uploaded.
        {!isPro && ` ${trial.left} of ${TOOL_TRIAL_LIMIT} free copies left.`}
      </p>
    </ToolPageShell>
  );
}
