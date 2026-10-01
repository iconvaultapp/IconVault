import { createFileRoute } from "@tanstack/react-router";
import { Key, Gauge, Zap, ShieldCheck } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, FeatureGrid, CodeBlock, FaqList, CTABand, Stack } from "@/components/kit";
import { ApiKeysSection } from "@/components/ApiKeyManager";

export const Route = createFileRoute("/api-access")({
  head: () => ({
    meta: [
      { title: "Icon API - REST endpoints and keys | IconVault" },
      {
        name: "description",
        content:
          "A JSON REST API for 421,020 icons: search, fetch SVG and batch icon bodies. Free API keys with 1,000 calls a month, or keyless access under per-minute IP limits.",
      },
      { property: "og:title", content: "Icon API - REST endpoints and keys" },
      {
        property: "og:description",
        content: "Search icons, fetch SVG and batch icon bodies over a plain JSON REST API.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/api-access" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/api-access" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "IconVault REST API",
          description: "REST API reference for searching icons, fetching SVG and batching icon bodies.",
        }),
      },
    ],
  }),
  component: Page,
});

const endpoints = [
  { method: "GET", path: "/api/iconify/search", desc: "Full-text search across every indexed set. Params: query, limit, start, prefix." },
  { method: "GET", path: "/api/icon/:prefix/:name.svg", desc: "Raw SVG for one icon. Params: color, width, height." },
  { method: "POST", path: "/api/icons", desc: "Batch icon bodies. Body: { icons: [\"mdi:cart\", \"lucide:heart\"] }." },
  { method: "GET", path: "/api/iconify/collections", desc: "List every icon set with totals and licences." },
  { method: "GET", path: "/api/iconify/collection/:prefix", desc: "All icon names in one set, with categories and aliases." },
];

function Page() {
  return (
    <PageShell
      wide
      eyebrow="Developers"
      title="An icon API you can build on"
      description="Everything the icon library does is available over plain JSON REST. Search and fetch without an account under per-minute IP limits, or generate a free key below for 1,000 calls a month."
    >
      <Stack>
        <div>
          <SectionHeading eyebrow="Quick start" title="Your first call, in under a minute" />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <CodeBlock
              label="curl - no key needed"
              code={`curl "https://iconvault.site/api/iconify/search?query=shopping%20cart&limit=5"`}
            />
            <CodeBlock
              label="curl - with your key"
              code={`curl "https://iconvault.site/api/iconify/search?query=shopping%20cart&limit=20" \\
  -H "x-api-key: ivk_live_YOUR_KEY_HERE"

# or: -H "Authorization: Bearer ivk_live_YOUR_KEY_HERE"`}
            />
          </div>
        </div>

        <ApiKeysSection />

        <div>
          <SectionHeading eyebrow="Reference" title="Endpoints" />
          <Reveal>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
              {endpoints.map((e) => (
                <div
                  key={e.path}
                  className="flex flex-col gap-1 border-b border-border px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="w-14 shrink-0 font-mono text-[11px] font-semibold text-primary">{e.method}</span>
                  <code className="w-72 shrink-0 font-mono text-[13px]">{e.path}</code>
                  <span className="text-sm text-muted-foreground">{e.desc}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div>
          <SectionHeading eyebrow="Platform" title="Built for production traffic" />
          <div className="mt-8">
            <FeatureGrid
              items={[
                { icon: Key, title: "Keys that work", body: "Generate a key above in one click. Read-only or read-write scope, revocable instantly, usage metered per key." },
                { icon: Gauge, title: "Honest rate limits", body: "Keyless: 120 searches, 240 icon fetches and 120 batch calls per minute per IP. Keyed: 1,000 calls per key per month." },
                { icon: Zap, title: "Cached at the edge", body: "SVG responses are immutable and CDN-cached, so repeat fetches are fast and never touch your quota." },
                { icon: ShieldCheck, title: "No SDK required", body: "Plain JSON over HTTPS with CORS enabled. fetch and a key header is the whole integration." },
              ]}
              columns={2}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Responses" title="Predictable shapes, predictable errors" />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <CodeBlock
              label="200 search response"
              code={`{
  "icons": ["mdi:cart", "mdi:cart-outline", "..."],
  "total": 412,
  "limit": 20,
  "start": 0,
  "collections": { "mdi": { "name": "Material Design Icons", "...": "..." } }
}`}
            />
            <CodeBlock
              label="401 invalid key"
              code={`HTTP/1.1 401 Unauthorized

{ "error": "Invalid API key." }

# Other key errors:
# "This API key has been revoked."
# 429: "Monthly API quota exhausted. Usage resets
#      30 days after the period started."`}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Questions" title="API FAQ" />
          <div className="mt-8">
            <FaqList
              items={[
                {
                  q: "Do I need an account to use the API?",
                  a: "No. Every endpoint works keyless under per-minute IP limits (120 searches, 240 icon fetches, 120 batch calls). An account just gets you a key with 1,000 calls a month and no per-minute cap.",
                },
                {
                  q: "How is usage counted?",
                  a: "One JSON request with your key is one unit against that key's monthly quota. Repeat SVG fetches served from the edge cache are free.",
                },
                {
                  q: "Can I use a key from the browser?",
                  a: "Use a read-only key and keep it to low-traffic pages, or proxy through your own backend. Never ship a read-write key in client-side code.",
                },
                {
                  q: "What happens when I revoke a key?",
                  a: "It stops working immediately and cannot be restored. Generate a fresh one and update the places that used the old key.",
                },
              ]}
            />
          </div>
        </div>

        <CTABand
          title="Generate your first key"
          body="Sign in, pick a name, and your key is ready in seconds with a 1,000-call monthly quota."
          primary={{ label: "Create an account", to: "/auth" }}
          secondary={{ label: "Try the CLI", to: "/cli" }}
        />
      </Stack>
    </PageShell>
  );
}
