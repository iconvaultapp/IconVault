// /tools/reporting-playground - Learn the Reporting API: attach a real
// ReportingObserver, watch genuine reports land live, simulate others, and build
// a Report-To header with server snippets. Fully client-side.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, RotateCcw, Copy, Check, Info, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/reporting-playground")({
  head: () => {
    const seo = getToolSeoMeta("reporting-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ReportingPlayground,
});

interface ReportEntry {
  time: string;
  type: string;
  url: string;
  body: string;
  simulated: boolean;
}

const REPORT_TYPES = ["deprecation", "intervention", "network-error", "crash", "security", "permissions-policy"] as const;

const SAMPLES: Record<string, { body: string; note: string }> = {
  deprecation: {
    body: `{"id":"ChromeLoadTimesWasCalled","anticipatedRemoval":"115.0.0.0","message":"chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2.","lineNumber":42,"columnNumber":7}`,
    note: "Triggered by deprecated platform APIs.",
  },
  intervention: {
    body: `{"id":"LargeLayoutShift","message":"Blocked a large layout shift to avoid visual instability."}`,
    note: "Chrome 96+: e.g. scroll-anchoring intervention.",
  },
  "network-error": {
    body: `{"phase":"application","method":"GET","serverIp":"93.184.216.34","protocol":"h2","referrer":"https://example.com/","samplingFraction":1,"statusCode":503,"elapsedTime":231}`,
    note: "From NEL (Network Error Logging) policies.",
  },
  crash: {
    body: `{"reason":"oom","isTopLevel":true}`,
    note: "Renderer crashed; needs crash report collection.",
  },
  security: {
    body: `{"blockedURL":"https://evil.example/","effectiveDirective":"script-src","disposition":"enforce"}`,
    note: "CSP violations report here in modern Chrome.",
  },
  "permissions-policy": {
    body: `{"featureId":"geolocation","disposition":"enforce"}`,
    note: "Permissions-Policy violations.",
  },
};

const now = () => new Date().toLocaleTimeString();

function ReportingPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("reporting-playground", isPro);
  const seo = getToolSeo("reporting-playground");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [observing, setObserving] = useState(false);
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([...REPORT_TYPES.slice(0, 3)]);
  const [selectedSample, setSelectedSample] = useState<string>("deprecation");
  const observerRef = useRef<unknown>(null);

  // Report-To header builder state
  const [group, setGroup] = useState("default");
  const [endpoint, setEndpoint] = useState("https://reports.example.com/reports");
  const [maxAge, setMaxAge] = useState("10886400");
  const [priority, setPriority] = useState("1");
  const [subdomains, setSubdomains] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "ReportingObserver" in window);
    return () => stopObserver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleType = (t: string) =>
    setActiveTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const startObserver = () => {
    if (!trial.canUse) return;
    if (!(window as unknown as { ReportingObserver?: unknown }).ReportingObserver) {
      toast.error("ReportingObserver is not supported in this browser");
      return;
    }
    stopObserver();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RO = (window as any).ReportingObserver;
      const ob = new RO(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entries: any[]) => {
          setReports((prev) => [
            ...prev.slice(-29),
            ...entries.map((e) => ({
              time: now(),
              type: e.type as string,
              url: (e.url as string) || location.href,
              body: JSON.stringify(e.body ?? {}),
              simulated: false,
            })),
          ]);
        },
        { types: activeTypes, buffered: true },
      );
      ob.observe();
      observerRef.current = ob;
      setObserving(true);
      trial.recordUse();
      toast.success(`Observing: ${activeTypes.join(", ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start observer");
    }
  };

  const stopObserver = () => {
    const ob = observerRef.current as { disconnect?: () => void } | null;
    try { ob?.disconnect?.(); } catch { /* noop */ }
    observerRef.current = null;
    setObserving(false);
  };

  const simulateReport = () => {
    if (!trial.canUse) return;
    const s = SAMPLES[selectedSample];
    if (!s) return;
    setReports((prev) => [
      ...prev.slice(-29),
      { time: now(), type: selectedSample, url: location.href, body: s.body, simulated: true },
    ]);
    trial.recordUse();
    toast.success(`Simulated ${selectedSample} report added`);
  };

  const clear = () => setReports([]);

  const headerValue = JSON.stringify({
    group, max_age: Number(maxAge) || 0, priority: Number(priority) || 1,
    endpoints: [{ url: endpoint }],
    include_subdomains: subdomains,
  });

  const serverSnippet = `# HTTP response header
Report-To: ${headerValue}
Reporting-Endpoints: ${group}="${endpoint}"

# Express / Node
res.setHeader("Reporting-Endpoints", '${group}="${endpoint}"');`;

  const copyHeader = async () => {
    try {
      await navigator.clipboard.writeText(serverSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Header snippet copied");
    } catch {
      toast.error("Clipboard blocked - copy the text manually");
    }
  };

  const exportReports = () => {
    downloadBlob(new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" }), "reports-log.json");
    toast.success("Reports log downloaded");
  };

  return (
    <ToolPageShell toolId="reporting-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Reporting API" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
            <span className="text-muted-foreground">ReportingObserver</span>
            <span className={cn("font-bold", supported ? "text-green-600" : "text-red-500")}>
              {supported === null ? "Checking…" : supported ? "Supported" : "Not supported"}
            </span>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Report types to observe</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold transition",
                    activeTypes.includes(t) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!observing ? (
              <ActionButton busy={false} disabled={!trial.canUse} onClick={startObserver}>
                <Play className="h-4 w-4" /> Start observing
              </ActionButton>
            ) : (
              <button type="button" onClick={stopObserver} className="inline-flex items-center gap-2 rounded-xl border border-red-500/50 px-6 py-3 text-sm font-bold text-red-500 transition hover:bg-red-500/10">
                Stop observing
              </button>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-1 text-sm font-bold">Simulate a report</p>
            <p className="mb-2 text-xs text-muted-foreground">{SAMPLES[selectedSample]?.note ?? ""}</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {Object.keys(SAMPLES).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedSample(t)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold transition",
                    selectedSample === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <ActionButton busy={false} disabled={!trial.canUse} onClick={simulateReport}>
              <Megaphone className="h-4 w-4" /> Inject sample report
            </ActionButton>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Real reports only arrive if the browser emits them (try loading this page's deprecated features, or visit a
              site with CSP/NEL headers). Samples are clearly marked so the log never lies.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Reports log {observing && <span className="ml-1 text-xs font-normal text-green-600">- live</span>}</p>
              <div className="flex gap-2">
                <button type="button" onClick={exportReports} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">Download JSON</button>
                <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {reports.length === 0 && <p className="font-mono text-xs text-muted-foreground">No reports yet. Start the observer or inject a sample.</p>}
              {reports.map((r, i) => (
                <div key={i} className="rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">[{r.time}]</span>
                    <span className="font-bold text-primary">{r.type}</span>
                    {r.simulated && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">simulated</span>}
                  </div>
                  <p className="mt-1 break-all text-foreground/80">{r.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Report-To header builder</p>
              <button type="button" onClick={copyHeader} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40">
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold">Group name</span>
                <input value={group} onChange={(e) => setGroup(e.target.value.replace(/\s+/g, "-"))} className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold">Endpoint URL</span>
                <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold">max_age (seconds)</span>
                <input value={maxAge} onChange={(e) => setMaxAge(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold">Priority (1 = highest)</span>
                <input value={priority} onChange={(e) => setPriority(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm" />
              </label>
            </div>
            <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={subdomains} onChange={(e) => setSubdomains(e.target.checked)} className="h-4 w-4 accent-primary" />
              include_subdomains
            </label>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{serverSnippet}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
