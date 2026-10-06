// /tools/storage-access-playground - Learn the Storage Access API: check
// document.hasStorageAccess(), request access with real user-activation flow,
// test first-party cookies, and read the StorageManager estimate. All real,
// fully client-side, with honest notes about third-party iframe contexts.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cookie, KeyRound, Play, RotateCcw, Info, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/storage-access-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/storage-access-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/storage-access-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/storage-access-playground";
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
  component: StorageAccessPlayground,
});

interface FlowLog {
  time: string;
  step: string;
  detail: string;
}

const now = () => new Date().toLocaleTimeString();

function StorageAccessPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("storage-access-playground", isPro);
  const seo = toolSeo;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [inIframe, setInIframe] = useState<boolean | null>(null);
  const [cookieEnabled, setCookieEnabled] = useState<boolean | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<string | null>(null);
  const [cookieTest, setCookieTest] = useState<string | null>(null);
  const [log, setLog] = useState<FlowLog[]>([]);
  const [copied, setCopied] = useState(false);

  const push = (step: string, detail: string) =>
    setLog((p) => [...p, { time: now(), step, detail }]);

  const checkHasAccess = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = await (document as any).hasStorageAccess();
      setHasAccess(v as boolean);
      push("hasStorageAccess()", String(v));
      return v as boolean;
    } catch {
      setHasAccess(null);
      push("hasStorageAccess()", "not available");
      return null;
    }
  };

  useEffect(() => {
    setSupported(typeof document !== "undefined" && "hasStorageAccess" in document);
    setInIframe(typeof window !== "undefined" && window.self !== window.top);
    setCookieEnabled(typeof navigator !== "undefined" && navigator.cookieEnabled);
    void checkHasAccess();
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((e) => {
        const mb = (b?: number) => (b ? `${(b / 1048576).toFixed(1)} MB` : "n/a");
        setStorageEstimate(`usage ${mb(e.usage)} / quota ${mb(e.quota)}`);
      }).catch(() => setStorageEstimate("unavailable"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runFlow = async () => {
    if (!trial.canUse) return;
    setLog([]);
    push("Step 1", "Checking whether this frame already has storage access…");
    await checkHasAccess();
    push("Step 2", "requestStorageAccess() must be called from a user gesture - this click counts.");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (document as any).requestStorageAccess();
      push("Step 3", "Granted. Unpartitioned cookies are now readable in this frame.");
      setHasAccess(true);
      toast.success("Storage access granted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      push("Step 3", `Denied or unavailable: ${msg}`);
      if (msg.includes("top-level") || inIframe === false) {
        toast.info("This API is for embedded (third-party) frames - here you are top-level, so the request cannot succeed. That is the honest result.");
      } else {
        toast.error(msg);
      }
    }
    trial.recordUse();
  };

  const testCookie = () => {
    try {
      document.cookie = "iv_sa_test=1; max-age=30; path=/";
      const ok = document.cookie.includes("iv_sa_test=1");
      document.cookie = "iv_sa_test=; max-age=0; path=/";
      const res = ok ? "Set + read worked" : "Could not read back (blocked)";
      setCookieTest(res);
      push("cookie probe", res);
    } catch {
      setCookieTest("Cookie access threw");
      push("cookie probe", "threw");
    }
  };

  const reset = () => { setLog([]); setCookieTest(null); void checkHasAccess(); };

  const snippet = `// The Storage Access API flow (embedded frame context)
if (await document.hasStorageAccess()) {
  // unpartitioned cookies are already available
} else {
  try {
    await document.requestStorageAccess(); // user gesture required
    // cookies now readable: document.cookie works
  } catch (err) {
    // user or browser denied: stay partitioned, degrade gracefully
  }
}`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Snippet copied");
    } catch {
      toast.error("Clipboard blocked - copy the text manually");
    }
  };

  const exportLog = () => {
    const text = log.map((l) => `[${l.time}] ${l.step} - ${l.detail}`).join("\n");
    downloadBlob(new Blob([text || "No events yet"], { type: "text/plain" }), "storage-access-log.txt");
    toast.success("Flow log downloaded");
  };

  return (
    <ToolPageShell toolId="storage-access-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Storage Access" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-1.5 text-[13px]">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">Storage Access API</span>
              <span className={cn("font-bold", supported ? "text-green-600" : "text-red-500")}>
                {supported === null ? "Checking…" : supported ? "Supported" : "Not supported"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">document.hasStorageAccess()</span>
              <span className={cn("font-bold", hasAccess === true ? "text-green-600" : hasAccess === false ? "text-amber-600" : "text-muted-foreground")}>
                {hasAccess === null ? "unknown" : hasAccess ? "true" : "false"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">Frame context</span>
              <span className="font-bold">{inIframe === null ? "Checking…" : inIframe ? "embedded iframe" : "top-level page"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">navigator.cookieEnabled</span>
              <span className={cn("font-bold", cookieEnabled ? "text-green-600" : "text-red-500")}>{cookieEnabled === null ? "-" : String(cookieEnabled)}</span>
            </div>
            {storageEstimate && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Storage estimate</span>
                <span className="font-mono text-xs font-bold">{storageEstimate}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton busy={false} disabled={!trial.canUse} onClick={runFlow}>
              <KeyRound className="h-4 w-4" /> Run access flow
            </ActionButton>
            <button type="button" onClick={testCookie} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/40">
              <Cookie className="h-4 w-4" /> Cookie probe
            </button>
          </div>
          {cookieTest && <p className="rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">{cookieTest}</p>}

          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Reset lab
          </button>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              requestStorageAccess() is designed for third-party iframes. Since this lab runs top-level,
              the request will fail or be a no-op, and this page reports that real outcome instead of faking a grant.
              Embed it as an iframe on another origin to see the full flow.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold"><Play className="h-4 w-4" /> Flow log</p>
              <button type="button" onClick={exportLog} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                Download log
              </button>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto font-mono text-xs">
              {log.length === 0 && <p className="text-muted-foreground">Run the access flow to watch each step and its real result.</p>}
              {log.map((l, i) => (
                <div key={i} className="rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">[{l.time}]</span> <span className="font-bold text-primary">{l.step}</span>
                  <p className="text-foreground/80">{l.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">The correct pattern</p>
              <button type="button" onClick={copySnippet} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40">
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Always call requestStorageAccess() inside a click handler: browsers require transient user activation.
              Chrome also supports requestStorageAccessFor() for specific top-level sites.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
