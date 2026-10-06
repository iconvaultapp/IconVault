// /tools/http-status - Searchable reference of 64 HTTP status codes (1xx-5xx)
// with plain-English descriptions. Click any code to copy it. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/http-status";
import toolSeoMeta from "@/lib/tool-seo-meta-data/http-status";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/http-status")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/http-status";
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
  component: HttpStatusTool,
});

interface StatusCode { code: number; name: string; desc: string; cat: string }

const CODES: StatusCode[] = [
  // 1xx
  { code: 100, name: "Continue", desc: "Server received the request headers; the client should send the body.", cat: "Informational" },
  { code: 101, name: "Switching Protocols", desc: "Server agrees to switch protocols as requested by the Upgrade header.", cat: "Informational" },
  { code: 102, name: "Processing", desc: "Request is being processed but will take noticeable time (WebDAV).", cat: "Informational" },
  { code: 103, name: "Early Hints", desc: "Preliminary headers sent so the client can start preloading resources.", cat: "Informational" },
  // 2xx
  { code: 200, name: "OK", desc: "The request succeeded; the response body contains the result.", cat: "Success" },
  { code: 201, name: "Created", desc: "The request succeeded and a new resource was created.", cat: "Success" },
  { code: 202, name: "Accepted", desc: "The request was accepted for processing, but is not complete yet.", cat: "Success" },
  { code: 203, name: "Non-Authoritative Information", desc: "Response is a transformed copy of the origin response.", cat: "Success" },
  { code: 204, name: "No Content", desc: "The request succeeded with no body to return.", cat: "Success" },
  { code: 205, name: "Reset Content", desc: "The client should reset its document view (e.g. clear a form).", cat: "Success" },
  { code: 206, name: "Partial Content", desc: "The server is returning part of the resource per a Range request.", cat: "Success" },
  { code: 207, name: "Multi-Status", desc: "Multiple independent operations reported in one body (WebDAV).", cat: "Success" },
  { code: 208, name: "Already Reported", desc: "Members of a DAV binding are already listed in a previous response.", cat: "Success" },
  { code: 226, name: "IM Used", desc: "The server fulfilled a GET request with an instance manipulation.", cat: "Success" },
  // 3xx
  { code: 300, name: "Multiple Choices", desc: "Several representations exist; the client can choose one.", cat: "Redirection" },
  { code: 301, name: "Moved Permanently", desc: "The resource moved to the Location URL forever; update bookmarks.", cat: "Redirection" },
  { code: 302, name: "Found", desc: "The resource is temporarily available at the Location URL.", cat: "Redirection" },
  { code: 303, name: "See Other", desc: "Repeat the request with GET at the Location URL.", cat: "Redirection" },
  { code: 304, name: "Not Modified", desc: "The cached copy is still fresh; no body is sent.", cat: "Redirection" },
  { code: 305, name: "Use Proxy", desc: "The request must go through the given proxy. Mostly deprecated.", cat: "Redirection" },
  { code: 307, name: "Temporary Redirect", desc: "Like 302 but the client must reuse the original HTTP method.", cat: "Redirection" },
  { code: 308, name: "Permanent Redirect", desc: "Like 301 but the client must reuse the original HTTP method.", cat: "Redirection" },
  // 4xx
  { code: 400, name: "Bad Request", desc: "The server cannot process the request due to client error (bad syntax or payload).", cat: "Client Error" },
  { code: 401, name: "Unauthorized", desc: "Authentication is required and has failed or not been provided.", cat: "Client Error" },
  { code: 402, name: "Payment Required", desc: "Reserved for future use; some APIs use it for billing-related blocks.", cat: "Client Error" },
  { code: 403, name: "Forbidden", desc: "The server understood the request but refuses to authorize it.", cat: "Client Error" },
  { code: 404, name: "Not Found", desc: "The server cannot find the requested resource.", cat: "Client Error" },
  { code: 405, name: "Method Not Allowed", desc: "The method is not supported for this resource (see Allow header).", cat: "Client Error" },
  { code: 406, name: "Not Acceptable", desc: "No available response matches the client's Accept headers.", cat: "Client Error" },
  { code: 407, name: "Proxy Authentication Required", desc: "The client must authenticate with the proxy first.", cat: "Client Error" },
  { code: 408, name: "Request Timeout", desc: "The server timed out waiting for the request.", cat: "Client Error" },
  { code: 409, name: "Conflict", desc: "The request conflicts with the current state of the resource.", cat: "Client Error" },
  { code: 410, name: "Gone", desc: "The resource is permanently gone with no forwarding address.", cat: "Client Error" },
  { code: 411, name: "Length Required", desc: "The request needs a Content-Length header.", cat: "Client Error" },
  { code: 412, name: "Precondition Failed", desc: "A precondition in If-Match or similar headers was not met.", cat: "Client Error" },
  { code: 413, name: "Content Too Large", desc: "The request body is larger than the server accepts.", cat: "Client Error" },
  { code: 414, name: "URI Too Long", desc: "The request URI is longer than the server accepts.", cat: "Client Error" },
  { code: 415, name: "Unsupported Media Type", desc: "The request's media type is not supported.", cat: "Client Error" },
  { code: 416, name: "Range Not Satisfiable", desc: "The requested range cannot be served.", cat: "Client Error" },
  { code: 417, name: "Expectation Failed", desc: "The server cannot meet the Expect request header requirements.", cat: "Client Error" },
  { code: 418, name: "I'm a teapot", desc: "A joke code from an April Fools RFC; some APIs return it as an easter egg.", cat: "Client Error" },
  { code: 421, name: "Misdirected Request", desc: "The request was sent to a server that cannot produce a response.", cat: "Client Error" },
  { code: 422, name: "Unprocessable Content", desc: "The request was well-formed but has semantic errors.", cat: "Client Error" },
  { code: 423, name: "Locked", desc: "The resource is locked (WebDAV).", cat: "Client Error" },
  { code: 424, name: "Failed Dependency", desc: "The request failed because a previous request failed (WebDAV).", cat: "Client Error" },
  { code: 425, name: "Too Early", desc: "The server is unwilling to process a request that might be replayed.", cat: "Client Error" },
  { code: 426, name: "Upgrade Required", desc: "The client should switch to a different protocol (e.g. TLS).", cat: "Client Error" },
  { code: 428, name: "Precondition Required", desc: "The server requires a conditional request to avoid lost updates.", cat: "Client Error" },
  { code: 429, name: "Too Many Requests", desc: "Rate limit exceeded; the client should back off and retry later.", cat: "Client Error" },
  { code: 431, name: "Request Header Fields Too Large", desc: "Headers are too large; the client should shrink them.", cat: "Client Error" },
  { code: 451, name: "Unavailable For Legal Reasons", desc: "The resource is blocked for legal reasons (censorship, court order).", cat: "Client Error" },
  // 5xx
  { code: 500, name: "Internal Server Error", desc: "A generic unexpected error occurred on the server.", cat: "Server Error" },
  { code: 501, name: "Not Implemented", desc: "The server does not support the functionality required.", cat: "Server Error" },
  { code: 502, name: "Bad Gateway", desc: "A proxy got an invalid response from the upstream server.", cat: "Server Error" },
  { code: 503, name: "Service Unavailable", desc: "The server is temporarily down for maintenance or overloaded.", cat: "Server Error" },
  { code: 504, name: "Gateway Timeout", desc: "A proxy timed out waiting for the upstream server.", cat: "Server Error" },
  { code: 505, name: "HTTP Version Not Supported", desc: "The server does not support the HTTP version used.", cat: "Server Error" },
  { code: 506, name: "Variant Also Negotiates", desc: "Transparent content negotiation failed with an internal loop.", cat: "Server Error" },
  { code: 507, name: "Insufficient Storage", desc: "The server ran out of storage for the requested method (WebDAV).", cat: "Server Error" },
  { code: 508, name: "Loop Detected", desc: "The server detected an infinite loop while processing (WebDAV).", cat: "Server Error" },
  { code: 510, name: "Not Extended", desc: "Further extensions to the request are required.", cat: "Server Error" },
  { code: 511, name: "Network Authentication Required", desc: "The client must authenticate to gain network access (captive portal).", cat: "Server Error" },
];

const CATS = ["All", "Informational", "Success", "Redirection", "Client Error", "Server Error"] as const;

const CAT_STYLE: Record<string, string> = {
  Informational: "bg-sky-500/10 text-sky-600",
  Success: "bg-emerald-500/10 text-emerald-600",
  Redirection: "bg-violet-500/10 text-violet-600",
  "Client Error": "bg-amber-500/10 text-amber-600",
  "Server Error": "bg-red-500/10 text-red-600",
};

async function copy(code: number, trial: { canUse: boolean; recordUse: () => void }) {
  if (!trial.canUse) return;
  try {
    await navigator.clipboard.writeText(String(code));
    toast.success(`${code} copied`);
    trial.recordUse();
  } catch {
    toast.error("Copy failed");
  }
}

function HttpStatusTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("http-status", isPro);
  const seo = toolSeo;

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CODES.filter(
      (c) =>
        (cat === "All" || c.cat === cat) &&
        (!q || String(c.code).includes(q) || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)),
    );
  }, [query, cat]);

  return (
    <ToolPageShell toolId="http-status" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTTP Status Codes" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code or name, e.g. 404 or not found"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold transition",
                  cat === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <Info className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">No status codes match</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term or category.</p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => copy(c.code, trial)}
                className="group flex items-start gap-3 rounded-xl border border-border p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
              >
                <span className={cn("shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-sm font-extrabold", CAT_STYLE[c.cat])}>
                  {c.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{c.name}</span>
                    <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{c.desc}</span>
                  <span className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">{c.cat}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Click any code to copy its number. {CODES.length} codes listed.</p>
      </div>
    </ToolPageShell>
  );
}
