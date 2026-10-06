// /tools/dns-lookup - Query DNS records through Cloudflare DNS-over-HTTPS.
// No backend involved; the query goes from your browser straight to
// cloudflare-dns.com. Graceful failure if the endpoint is unreachable.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Globe, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/dns-lookup";
import toolSeoMeta from "@/lib/tool-seo-meta-data/dns-lookup";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/dns-lookup")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/dns-lookup";
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
  component: DnsLookupTool,
});

const TYPES = ["A", "AAAA", "MX", "TXT", "CNAME", "NS", "SOA"] as const;

interface DnsRecord {
  name: string;
  type: number;
  ttl: number;
  data: string;
}

const TYPE_NAMES: Record<number, string> = { 1: "A", 28: "AAAA", 15: "MX", 16: "TXT", 5: "CNAME", 2: "NS", 6: "SOA" };

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function DnsLookupTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("dns-lookup", isPro);
  const seo = toolSeo;

  const [domain, setDomain] = useState("");
  const [type, setType] = useState<string>("A");
  const [records, setRecords] = useState<DnsRecord[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queried, setQueried] = useState("");

  const lookup = async () => {
    const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    setRecords(null);
    try {
      const res = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(d)}&type=${type}`,
        { headers: { Accept: "application/dns-json" } },
      );
      if (!res.ok) throw new Error(`DNS server replied with HTTP ${res.status}`);
      const json = await res.json();
      if (json.Status !== 0) {
        setRecords([]);
        setQueried(d);
        setError(
          json.Status === 3
            ? `No ${type} records found for ${d} (name does not exist).`
            : `The DNS query for ${d} failed with status ${json.Status}.`,
        );
        return;
      }
      setRecords((json.Answer ?? []) as DnsRecord[]);
      setQueried(d);
      trial.recordUse();
      toast.success("DNS records fetched");
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("Failed to fetch")
          ? "Could not reach the DNS-over-HTTPS endpoint. Check your connection or try again later."
          : e instanceof Error
            ? e.message
            : "DNS query failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell toolId="dns-lookup" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="DNS Lookup" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Domain</p>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void lookup(); }}
              placeholder="example.com"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Record type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                    type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ActionButton busy={busy} disabled={!trial.canUse || !domain.trim()} onClick={() => void lookup()}>
            <Search className="h-4 w-4" /> {busy ? "Querying…" : "Look up"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Queried live over DNS-over-HTTPS (Cloudflare). Nothing is stored.
          </p>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {records === null && !error ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Globe className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Real DNS answers, no install</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Look up A, AAAA, MX, TXT, CNAME, NS and SOA records straight from your browser via Cloudflare's DNS-over-HTTPS endpoint.
              </p>
            </div>
          ) : records && records.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {type} records for <span className="font-mono">{queried}</span>
                </p>
                <button
                  type="button"
                  onClick={() => copy(records.map((r) => r.data).join("\n"), "Records")}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy all
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Type</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">TTL</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Data</th>
                      <th className="w-14 px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-4 py-2.5 font-mono font-bold">{TYPE_NAMES[r.type] ?? r.type}</td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{r.ttl}s</td>
                        <td className="max-w-[320px] break-all px-4 py-2.5 font-mono text-[13px]">{r.data}</td>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => copy(r.data, "Record")}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Copy record data"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Globe className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="max-w-sm text-sm font-medium text-muted-foreground">{error}</p>
            </div>
          ) : null}
        </div>
      </div>
    </ToolPageShell>
  );
}
