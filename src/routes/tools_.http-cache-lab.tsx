// /tools/http-cache-lab - A simulated browser cache lab: pick Cache-Control
// headers and an ETag, send requests, advance the clock, and watch the
// hit / miss / revalidate decision tree light up.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, RotateCcw, Copy, Database, Clock, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/http-cache-lab";
import toolSeoMeta from "@/lib/tool-seo-meta-data/http-cache-lab";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/http-cache-lab")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/http-cache-lab";
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
  component: CacheLab,
});

type Policy = "fresh-1h" | "fresh-1m" | "no-cache" | "no-store" | "stale-reval";

const POLICIES: { id: Policy; label: string; header: string; desc: string }[] = [
  { id: "fresh-1h", label: "public, max-age=3600", header: "Cache-Control: public, max-age=3600", desc: "Fresh for one hour, served from cache with zero requests." },
  { id: "fresh-1m", label: "max-age=60", header: "Cache-Control: max-age=60", desc: "Fresh for 60 seconds - advance the clock to watch it go stale." },
  { id: "no-cache", label: "no-cache", header: "Cache-Control: no-cache", desc: "Stored but revalidated with the server on every use." },
  { id: "no-store", label: "no-store", header: "Cache-Control: no-store", desc: "Never stored. Every request hits the origin." },
  { id: "stale-reval", label: "max-age=0, must-revalidate", header: "Cache-Control: max-age=0, must-revalidate", desc: "Instantly stale - revalidates every time, never serves blind." },
];

type Outcome = "MISS" | "HIT" | "REVAL-304" | "REVAL-200";

interface ReqEntry {
  n: number;
  t: number; // simulated seconds
  outcome: Outcome;
  detail: string;
  status: number;
  ms: number;
}

interface CacheEntry {
  storedAt: number;
  etag: string;
  body: string;
}

const OUTCOME_STYLE: Record<Outcome, string> = {
  MISS: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  HIT: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  "REVAL-304": "border-amber-500/50 bg-amber-500/10 text-amber-300",
  "REVAL-200": "border-violet-500/50 bg-violet-500/10 text-violet-300",
};

const TREE: { id: string; label: string; sub: string }[] = [
  { id: "lookup", label: "1. Cache lookup", sub: "Is there a stored entry?" },
  { id: "fresh", label: "2. Freshness check", sub: "age < max-age?" },
  { id: "reval", label: "3. Revalidate", sub: "If-None-Match: ETag" },
  { id: "serve", label: "4. Serve", sub: "HIT, 304 or 200" },
];

function fmtT(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function CacheLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("http-cache-lab", isPro);
  const seo = toolSeo;

  const [policy, setPolicy] = useState<Policy>("fresh-1h");
  const [etag, setEtag] = useState('"v1-abc"');
  const [now, setNow] = useState(0);
  const [originRev, setOriginRev] = useState(1);
  const [cache, setCache] = useState<CacheEntry | null>(null);
  const [log, setLog] = useState<ReqEntry[]>([]);
  const [lastPath, setLastPath] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const policyInfo = POLICIES.find((p) => p.id === policy)!;

  const maxAge = policy === "fresh-1h" ? 3600 : policy === "fresh-1m" ? 60 : 0;
  const noStore = policy === "no-store";
  const noCache = policy === "no-cache";

  const sendRequest = useCallback(() => {
    const n = log.length + 1;
    const originEtag = `"v${originRev}-abc"`;
    let outcome: Outcome;
    let detail: string;
    let status: number;
    let ms: number;
    let path: string[];
    let nextCache: CacheEntry | null = cache;

    if (noStore) {
      outcome = "MISS";
      status = 200;
      ms = 180;
      detail = "no-store: nothing is cached, origin served a full 200.";
      path = ["lookup", "serve"];
    } else if (!cache) {
      outcome = "MISS";
      status = 200;
      ms = 180;
      detail = `cold cache - origin served 200 and the response was stored with ETag ${originEtag}.`;
      path = ["lookup", "serve"];
      nextCache = { storedAt: now, etag: originEtag, body: `body-rev-${originRev}` };
    } else {
      const age = now - cache.storedAt;
      const fresh = !noCache && age < maxAge;
      if (fresh) {
        outcome = "HIT";
        status = 200;
        ms = 2;
        detail = `fresh (age ${age}s < max-age ${maxAge}s) - served from cache, no network.`;
        path = ["lookup", "fresh", "serve"];
      } else {
        path = ["lookup", "fresh", "reval", "serve"];
        if (cache.etag === originEtag) {
          outcome = "REVAL-304";
          status = 304;
          ms = 45;
          detail = `stale - revalidated with If-None-Match ${cache.etag}, origin replied 304 Not Modified. Freshness timer reset.`;
          nextCache = { ...cache, storedAt: now };
        } else {
          outcome = "REVAL-200";
          status = 200;
          ms = 170;
          detail = `stale - revalidated, but the origin changed (ETag now ${originEtag}). Full 200 downloaded and cache updated.`;
          nextCache = { storedAt: now, etag: originEtag, body: `body-rev-${originRev}` };
        }
      }
    }

    setCache(nextCache);
    setLastPath(path);
    setLog((l) => [...l, { n, t: now, outcome, detail, status, ms }]);
  }, [log.length, cache, now, originRev, noStore, noCache, maxAge]);

  const advance = (sec: number) => setNow((t) => t + sec);

  const bumpOrigin = () => {
    setOriginRev((r) => r + 1);
    toast.info("Origin content changed - ETag bumped");
  };

  const reset = () => {
    setNow(0);
    setOriginRev(1);
    setCache(null);
    setLog([]);
    setLastPath([]);
  };

  const copyHeaders = useCallback(() => {
    if (!trial.canUse) return;
    const originEtag = `"v${originRev}-abc"`;
    const text = [
      `HTTP/1.1 200 OK`,
      `Cache-Control: ${policyInfo.label}`,
      `ETag: ${etag.trim() || originEtag}`,
      `Age: simulated in the lab`,
      ``,
      `Lab notes:`,
      `- ${policyInfo.desc}`,
      `- Revalidation uses If-None-Match with the ETag above.`,
      `- Simulated in IconVault HTTP Cache Lab - a simplified model of RFC 9111.`,
    ].join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Header set copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [policyInfo, etag, originRev, trial]);

  const cacheAge = cache ? now - cache.storedAt : null;
  const cacheFresh = cache !== null && !noCache && cacheAge !== null && cacheAge < maxAge;

  const decision = useMemo(() => {
    if (log.length === 0) return null;
    return log[log.length - 1]!;
  }, [log]);

  return (
    <ToolPageShell toolId="http-cache-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTTP Cache Lab" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Response Cache-Control</p>
            <div className="space-y-2">
              {POLICIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPolicy(p.id)}
                  className={cn(
                    "w-full rounded-xl border px-3.5 py-2.5 text-left transition",
                    policy === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className={cn("font-mono text-xs font-bold", policy === p.id ? "text-primary" : "text-foreground/85")}>{p.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Origin ETag</label>
            <input
              value={etag}
              onChange={(e) => setEtag(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Bump origin content below to change the ETag and force a 200 on revalidate.</p>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-bold">Simulated clock</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">t = {fmtT(now)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "+10s", s: 10 },
                { label: "+60s", s: 60 },
                { label: "+1h", s: 3600 },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => advance(b.s)}
                  className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  {b.label}
                </button>
              ))}
              <button
                type="button"
                onClick={bumpOrigin}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Change origin
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>

          <ActionButton busy={false} disabled={false} onClick={sendRequest}>
            <Send className="h-4 w-4" /> Send GET request
          </ActionButton>

          <ActionButton disabled={!trial.canUse} onClick={copyHeaders}>
            {copied ? <Database className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy header set"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {/* cache state */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-[13px] font-medium text-foreground/80">Browser cache</p>
              {cache ? (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">ETag</span><span className="font-bold text-foreground/90">{cache.etag}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">stored at</span><span>t = {fmtT(cache.storedAt)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">age</span><span>{cacheAge}s</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">status</span>
                    <span className={cn("rounded px-2 py-0.5 font-bold", noStore ? "bg-sky-500/15 text-sky-300" : cacheFresh ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300")}>
                      {noStore ? "NOT STORED" : cacheFresh ? "FRESH" : "STALE"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-xs text-muted-foreground">empty - send a request to fill it</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-[13px] font-medium text-foreground/80">Origin server (simulated)</p>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">current ETag</span><span className="font-bold text-foreground/90">"v{originRev}-abc"</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">revision</span><span>rev-{originRev}</span></div>
                <p className="pt-1 text-muted-foreground">Answers conditional requests with 304 while the ETag matches.</p>
              </div>
            </div>
          </div>

          {/* decision tree */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Decision tree (last request)</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {TREE.map((t, ti) => {
                const active = lastPath.includes(t.id);
                return (
                  <div key={t.id} className="relative">
                    <div
                      className={cn(
                        "rounded-xl border p-3 transition",
                        active ? "border-primary bg-primary/10 shadow-[0_0_16px_rgba(0,0,0,0.2)]" : "border-border bg-background opacity-50",
                      )}
                    >
                      <p className={cn("text-xs font-bold", active ? "text-primary" : "text-muted-foreground")}>{t.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{t.sub}</p>
                    </div>
                    {ti < TREE.length - 1 && (
                      <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 font-mono text-muted-foreground sm:block">-&gt;</span>
                    )}
                  </div>
                );
              })}
            </div>
            {decision && (
              <div className={cn("mt-4 rounded-xl border px-4 py-3", OUTCOME_STYLE[decision.outcome])}>
                <p className="font-mono text-sm font-bold">
                  Request #{decision.n} at t={fmtT(decision.t)}: {decision.outcome} (HTTP {decision.status}, {decision.ms}ms)
                </p>
                <p className="mt-1 font-mono text-xs opacity-90">{decision.detail}</p>
              </div>
            )}
          </div>

          {/* timeline */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Request timeline</p>
            {log.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" /> No requests yet. Try: send twice with max-age=3600 (HIT), then +1h and send again (revalidate).
              </p>
            ) : (
              <div className="space-y-2">
                {log.map((e) => (
                  <div key={e.n} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                    <span className={cn("rounded-lg border px-2.5 py-1 font-mono text-xs font-bold", OUTCOME_STYLE[e.outcome])}>
                      {e.outcome}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-foreground/85">
                        #{e.n} <span className="font-normal text-muted-foreground">t={fmtT(e.t)} - HTTP {e.status} in {e.ms}ms</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Simplified model of RFC 9111: heuristic freshness, Vary, and private/shared cache splits are not simulated.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
