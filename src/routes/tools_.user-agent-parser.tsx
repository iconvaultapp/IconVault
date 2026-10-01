// /tools/user-agent-parser - Parse a user agent string into browser, engine, OS and device.
// Runs fully in your browser, nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/user-agent-parser")({
  head: () => {
    const seo = getToolSeoMeta("user-agent-parser");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: UserAgentParserTool,
});

interface Parsed {
  browser: string;
  browserVersion: string;
  engine: string;
  os: string;
  osVersion: string;
  device: string;
}

function parseUA(ua: string): Parsed {
  let browser = "Unknown";
  let browserVersion = "";
  const bm =
    ua.match(/Edg\/([\d.]+)/) ||
    ua.match(/Edge\/([\d.]+)/) ||
    ua.match(/OPR\/([\d.]+)/) ||
    ua.match(/Opera\/([\d.]+)/) ||
    ua.match(/Chrome\/([\d.]+)/) ||
    ua.match(/Chromium\/([\d.]+)/) ||
    ua.match(/Firefox\/([\d.]+)/) ||
    ua.match(/Version\/([\d.]+).*Safari/) ||
    ua.match(/Safari\/([\d.]+)/);
  const bName =
    /Edg\//.test(ua) || /Edge\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) || /Opera\//.test(ua) ? "Opera" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Chromium\//.test(ua) ? "Chromium" :
    /Safari\//.test(ua) ? "Safari" : "Unknown";
  if (bName !== "Unknown") {
    browser = bName;
    browserVersion = bm ? (bm[1] ?? "") : "";
  }

  const engine =
    /Gecko\/\d/.test(ua) && !/like Gecko/.test(ua) ? "Gecko" :
    /AppleWebKit\/([\d.]+)/.test(ua) ? "WebKit (Blink)" :
    /Trident\/([\d.]+)/.test(ua) ? "Trident" : "Unknown";

  let os = "Unknown";
  let osVersion = "";
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Windows NT ([\d.]+)/))) {
    os = "Windows";
    const ver = m[1] ?? "";
    osVersion = ver.startsWith("10") ? "10 / 11" : ver;
  } else if ((m = ua.match(/Mac OS X ([\d_]+)/))) {
    os = "macOS";
    osVersion = (m[1] ?? "").replace(/_/g, ".");
  } else if (/iPhone/.test(ua) || /iPad/.test(ua) || /iPod/.test(ua)) {
    os = /iPad/.test(ua) ? "iPadOS" : "iOS";
    const v = ua.match(/OS ([\d_]+) like Mac OS X/);
    osVersion = v?.[1] ? v[1].replace(/_/g, ".") : "";
  } else if ((m = ua.match(/Android ([\d.]+)/))) {
    os = "Android";
    osVersion = m[1] ?? "";
  } else if ((m = ua.match(/Linux/))) {
    os = "Linux";
    osVersion = "";
  } else if ((m = ua.match(/CrOS [\w_]+ ([\d.]+)/))) {
    os = "ChromeOS";
    osVersion = m[1] ?? "";
  }

  const device =
    /Mobile/.test(ua) || /iPhone/.test(ua) || /Android.*Mobile/.test(ua) ? "Mobile" :
    /iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || /Tablet/.test(ua) ? "Tablet" :
    /Bot|bot|crawl|spider/i.test(ua) ? "Bot" : "Desktop";

  return { browser, browserVersion, engine, os, osVersion, device };
}

function UserAgentParserTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("user-agent-parser", isPro);
  const seo = getToolSeo("user-agent-parser");
  const [single, setSingle] = useState(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
  );
  const [batch, setBatch] = useState(false);
  const [batchInput, setBatchInput] = useState("");
  const [batchResults, setBatchResults] = useState<Parsed[] | null>(null);

  const result = useMemo(() => parseUA(single), [single]);

  const parseSingle = () => {
    if (!single.trim()) {
      toast.error("Paste a user agent string first");
      return;
    }
    trial.recordUse();
  };

  const parseBatch = () => {
    const lines = batchInput.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error("Paste at least one user agent string");
      return;
    }
    setBatchResults(lines.map(parseUA));
    trial.recordUse();
    toast.success(`Parsed ${lines.length} user agent${lines.length === 1 ? "" : "s"}`);
  };

  const copySingle = () => {
    const text = `Browser: ${result.browser} ${result.browserVersion}\nEngine: ${result.engine}\nOS: ${result.os} ${result.osVersion}\nDevice: ${result.device}`;
    navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      toast.success("Result copied");
    });
  };

  const copyBatch = () => {
    if (!batchResults) return;
    const lines = batchInput.split("\n").map((l) => l.trim()).filter(Boolean);
    const text = lines.map((ua, i) => {
      const r = batchResults[i];
      if (!r) return ua;
      return `${ua}\n  -> ${r.browser} ${r.browserVersion} | ${r.engine} | ${r.os} ${r.osVersion} | ${r.device}`;
    }).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      toast.success("Results copied");
    });
  };

  const rows = [
    { label: "Browser", value: `${result.browser}${result.browserVersion ? " " + result.browserVersion : ""}` },
    { label: "Engine", value: result.engine },
    { label: "OS", value: `${result.os}${result.osVersion ? " " + result.osVersion : ""}` },
    { label: "Device type", value: result.device },
  ];

  return (
    <ToolPageShell toolId="user-agent-parser" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="User Agent Parser" left={trial.left} />

      <div className="mb-4 flex gap-2">
        {[
          { label: "Single", value: false },
          { label: "Batch", value: true },
        ].map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => setBatch(m.value)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-bold transition",
              batch === m.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {!batch ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">
              User agent string (prefilled with yours)
            </label>
            <textarea
              value={single}
              onChange={(e) => setSingle(e.target.value)}
              rows={3}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs outline-none focus:border-primary/50"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton onClick={parseSingle} disabled={!single.trim()}>
                Parse
              </ActionButton>
              <button
                type="button"
                onClick={copySingle}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Copy className="h-4 w-4" /> Copy results
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((r) => (
              <div key={r.label} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{r.label}</p>
                <p className="mt-1 break-words font-mono text-sm font-bold">{r.value}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">
            One user agent per line
          </label>
          <textarea
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            rows={6}
            placeholder="Paste one user agent string per line…"
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs outline-none focus:border-primary/50"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton onClick={parseBatch} disabled={!batchInput.trim()}>
              Parse batch
            </ActionButton>
            {batchResults && (
              <button
                type="button"
                onClick={copyBatch}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Copy className="h-4 w-4" /> Copy results
              </button>
            )}
          </div>
          {batchResults && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Browser</th>
                    <th className="py-2 pr-3">Engine</th>
                    <th className="py-2 pr-3">OS</th>
                    <th className="py-2">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((r, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 font-mono text-[13px] font-bold">
                        {r.browser}{r.browserVersion ? ` ${r.browserVersion}` : ""}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[13px]">{r.engine}</td>
                      <td className="py-2 pr-3 font-mono text-[13px]">
                        {r.os}{r.osVersion ? ` ${r.osVersion}` : ""}
                      </td>
                      <td className="py-2 font-mono text-[13px]">{r.device}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free parses left - runs fully in your browser, nothing is uploaded.
        </p>
      )}
    </ToolPageShell>
  );
}
