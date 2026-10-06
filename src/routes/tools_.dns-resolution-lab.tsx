// /tools/dns-resolution-lab - Follow a DNS query from the stub resolver
// through the recursive resolver, root, TLD and authoritative servers.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, StepForward, StepBack, RotateCcw, Copy, Globe, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/dns-resolution-lab";
import toolSeoMeta from "@/lib/tool-seo-meta-data/dns-resolution-lab";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/dns-resolution-lab")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/dns-resolution-lab";
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
  component: DnsLab,
});

interface Hop {
  node: string;
  role: string;
  query: string;
  answer: string;
  detail: string;
  record: string;
  ms: number;
}

function cleanDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}

function validDomain(d: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d);
}

function buildHops(domain: string, cached: boolean): Hop[] {
  const labels = domain.split(".");
  const tld = labels[labels.length - 1]!;
  const parent = labels.slice(-2).join(".");
  const authNs = `ns1.${parent}`;
  // Documentation IPs (TEST-NET) - simulated, not real lookups.
  const finalIp = "203.0.113.10";
  const hops: Hop[] = [
    {
      node: "Stub resolver",
      role: "your device",
      query: `getaddrinfo("${domain}")`,
      answer: "forward to recursive resolver",
      detail: "Your app asks the operating system for the IP. The OS stub resolver does no real DNS work itself - it forwards the question to the configured recursive resolver (often your ISP or 1.1.1.1).",
      record: "system call",
      ms: 1,
    },
  ];
  if (cached) {
    hops.push({
      node: "Recursive resolver",
      role: "cache HIT",
      query: `A ${domain}?`,
      answer: `${domain} -> ${finalIp} (TTL 280s left)`,
      detail: "The recursive resolver already knows this answer from a recent query, so it replies straight from cache. No root, TLD or authoritative servers are contacted. This is why the second lookup is instant.",
      record: "A (cached)",
      ms: 2,
    });
  } else {
    hops.push(
      {
        node: "Recursive resolver",
        role: "cache MISS",
        query: `A ${domain}?`,
        answer: "not in cache - start at the root",
        detail: "Cache miss. The recursive resolver must now walk down the DNS hierarchy itself, starting from the root servers, whose IPs are built into every resolver.",
        record: "A",
        ms: 3,
      },
      {
        node: "Root servers",
        role: '".", 13 logical clusters',
        query: `A ${domain}?`,
        answer: `referral: ask the .${tld} servers (NS records)`,
        detail: "Root servers do not know your domain. They answer with a referral: the NS records of the servers responsible for the ." + tld + " zone, plus glue A records so the resolver can reach them.",
        record: "NS referral",
        ms: 28,
      },
      {
        node: `.${tld} TLD servers`,
        role: "top-level domain",
        query: `A ${domain}?`,
        answer: `referral: ask ${authNs} (NS records)`,
        detail: `The .${tld} servers know which nameservers are authoritative for ${parent}, because the domain owner registered them there. Another referral, one level closer.`,
        record: "NS referral",
        ms: 34,
      },
      {
        node: "Authoritative server",
        role: authNs,
        query: `A ${domain}?`,
        answer: `${domain} -> ${finalIp} (TTL 300s)`,
        detail: "The authoritative server holds the actual zone file and gives the final answer: an A record mapping the name to an IPv4 address. (AAAA would give IPv6, MX would give mail servers, CNAME would give an alias.)",
        record: "A",
        ms: 41,
      },
      {
        node: "Recursive resolver",
        role: "answer + cache",
        query: "store for TTL",
        answer: `returns ${finalIp} to the stub`,
        detail: "The resolver caches the answer for its TTL (here 300s) and hands the IP back to your device. Run the lookup again to see the cache HIT path.",
        record: "A (cached)",
        ms: 2,
      },
    );
  }
  return hops;
}

function DnsLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("dns-resolution-lab", isPro);
  const seo = toolSeo;

  const [domain, setDomain] = useState("blog.example.com");
  const [lookups, setLookups] = useState(0); // completed lookups, drives cache
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = cleanDomain(domain);
  const ok = validDomain(clean);
  const cached = lookups > 0;
  const hops = useMemo(() => (ok ? buildHops(clean, cached) : []), [clean, cached, ok]);
  const total = hops.length;
  const cur = hops[Math.min(stepIdx, Math.max(0, total - 1))];

  useEffect(() => {
    setStepIdx(0);
    setPlaying(false);
    setLookups(0);
    setError(null);
  }, [domain]);

  useEffect(() => {
    if (!playing) return;
    if (stepIdx >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIdx((s) => Math.min(s + 1, total - 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, stepIdx, speed, total]);

  const runLookup = () => {
    if (!ok) {
      setError("Enter a valid domain like blog.example.com");
      return;
    }
    setError(null);
    setStepIdx(0);
    setPlaying(true);
  };

  const clearCache = () => {
    setLookups(0);
    setStepIdx(0);
    setPlaying(false);
    toast.info("Resolver cache cleared");
  };

  // when a full run finishes, mark the cache as warm
  useEffect(() => {
    if (total > 0 && stepIdx >= total - 1 && !cached) {
      const t = setTimeout(() => setLookups((l) => l + 1), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stepIdx, total, cached]);

  const copyTrace = useCallback(() => {
    if (!trial.canUse || hops.length === 0) return;
    const text = [
      `DNS resolution trace for ${clean}`,
      ``,
      ...hops.map((h, k) => `${k + 1}. ${h.node} [${h.record}] (~${h.ms}ms)\n   Q: ${h.query}\n   A: ${h.answer}`),
      ``,
      `Simulated in IconVault DNS Lab - answers use documentation IPs, no real lookups are performed.`,
    ].join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Trace copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [hops, clean, trial]);

  const totalMs = hops.reduce((a, h) => a + h.ms, 0);

  return (
    <ToolPageShell toolId="dns-resolution-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="DNS Lab" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Domain to resolve</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              placeholder="blog.example.com"
            />
            {error && <p className="mt-1.5 text-xs font-medium text-rose-400">{error}</p>}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Resolver cache:{" "}
              <span className={cn("font-mono font-bold", cached ? "text-emerald-300" : "text-muted-foreground")}>
                {cached ? "WARM - next lookup hits cache" : "COLD"}
              </span>
            </p>
          </div>

          <div className="flex gap-2">
            <ActionButton busy={false} disabled={!ok} onClick={runLookup}>
              <Globe className="h-4 w-4" /> Run lookup
            </ActionButton>
            <button
              type="button"
              onClick={clearCache}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Clear cache
            </button>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStepIdx((s) => Math.max(0, s - 1))} disabled={stepIdx === 0} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step back">
                <StepBack className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} disabled={total === 0} className="rounded-lg bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-40" title={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setStepIdx((s) => Math.min(total - 1, s + 1))} disabled={stepIdx >= total - 1} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step forward">
                <StepForward className="h-4 w-4" />
              </button>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{total === 0 ? "0 / 0" : `${stepIdx + 1} / ${total}`}</span>
            </div>
            <input type="range" min={0} max={Math.max(0, total - 1)} value={stepIdx} onChange={(e) => { setStepIdx(Number(e.target.value)); setPlaying(false); }} className="mt-3 w-full accent-primary" />
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Speed</span>
              <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-primary" />
              <span className="font-mono text-xs text-muted-foreground">{speed}/s</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">SIMULATED RESOLUTION TIME</span>
              <span className="font-mono text-lg font-bold text-primary">~{totalMs}ms</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{cached ? "Served from cache - zero hierarchy walk." : "Full hierarchy walk: stub, recursive, root, TLD, authoritative."}</p>
          </div>

          <ActionButton disabled={!trial.canUse || hops.length === 0} onClick={copyTrace}>
            {copied ? <Globe className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy trace"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {hops.map((h, hi) => {
            const shown = hi <= stepIdx;
            const active = hi === stepIdx;
            return (
              <div key={hi}>
                <div
                  className={cn(
                    "rounded-2xl border p-5 transition-all duration-300",
                    active ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(0,0,0,0.2)]" : shown ? "border-border bg-card" : "border-border bg-card opacity-30",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {hi + 1}
                    </span>
                    <p className="font-bold text-foreground/90">{h.node}</p>
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{h.role}</span>
                    <span className="ml-auto rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">{h.record}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">~{h.ms}ms</span>
                  </div>
                  <div className="mt-3 grid gap-2 font-mono text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-background p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-300">query</p>
                      <p className="mt-0.5 text-foreground/85">{h.query}</p>
                    </div>
                    <div className="rounded-lg bg-background p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">response</p>
                      <p className="mt-0.5 text-foreground/85">{h.answer}</p>
                    </div>
                  </div>
                  {active && <p className="mt-3 text-sm leading-relaxed text-foreground/85">{h.detail}</p>}
                </div>
                {hi < hops.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className={cn("h-4 w-4", hi < stepIdx ? "text-primary" : "text-muted-foreground/40")} />
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Record types you will meet</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["A", "hostname -> IPv4 address (the final answer here)"],
                ["AAAA", "hostname -> IPv6 address"],
                ["NS", "which servers are authoritative for a zone"],
                ["CNAME", "alias: one name points at another name"],
                ["MX", "mail servers for a domain"],
                ["SOA", "zone metadata: primary server, serial, timers"],
              ].map(([t, d]) => (
                <div key={t} className="flex items-center gap-2.5 rounded-lg bg-background px-3 py-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">{t}</span>
                  <span className="text-xs text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Simulated lab: answers use documentation IPs (203.0.113.0/24). No real DNS queries leave your browser.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
