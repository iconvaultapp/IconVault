// /tools/service-worker-recipes - Production-ready service worker
// recipes: cache-first, network-first and stale-while-revalidate, plus
// install/activate lifecycle code. Honest about the HTTPS/localhost
// requirement. Copy or download each recipe; trial use is recorded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Server } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/service-worker-recipes")({
  head: () => {
    const seo = getToolSeoMeta("service-worker-recipes");
    const canonical = "https://iconvault.site/tools/service-worker-recipes";
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
  component: ServiceWorkerTool,
});

type Recipe = "cache-first" | "network-first" | "swr" | "lifecycle";

const RECIPES: { id: Recipe; label: string; file: string }[] = [
  { id: "cache-first", label: "Cache First", file: "sw-cache-first.js" },
  { id: "network-first", label: "Network First", file: "sw-network-first.js" },
  { id: "swr", label: "Stale-While-Revalidate", file: "sw-swr.js" },
  { id: "lifecycle", label: "Install and Activate", file: "sw-lifecycle.js" },
];

const CODE: Record<Recipe, string> = {
  "cache-first": `// sw-cache-first.js - serve from cache, fall back to network.
// Best for: images, fonts, versioned bundles (app.[hash].js).

const CACHE = "static-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/", "/styles.css", "/app.js", "/logo.svg"])
    )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;                       // cache hit: instant
      return fetch(e.request).then((res) => {    // miss: go to network
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        return res;
      });
    })
  );
});`,
  "network-first": `// sw-network-first.js - try network, fall back to cache.
// Best for: HTML pages, API responses that change often.

const CACHE = "dynamic-v1";

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();                // refresh the cache
        caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))      // offline: last good copy
      .then((res) => res || Response.error())
  );
});`,
  "swr": `// sw-swr.js - instant cached response, refresh in background.
// Best for: avatars, config JSON, anything where "slightly old" is fine.

const CACHE = "swr-v1";

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      const network = fetch(e.request).then((res) => {
        cache.put(e.request, res.clone());       // revalidate silently
        return res;
      });
      return cached || network;                  // cached now, fresh next time
    })
  );
});`,
  "lifecycle": `// sw-lifecycle.js - install, activate, and clean up old caches.
// Pair with any recipe above.

const CACHE = "app-v2";                          // bump to deploy a new version

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/", "/app.js"]))
  );
  self.skipWaiting();                            // activate immediately
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())           // control open tabs now
  );
});`,
};

const FLOWS: Record<Recipe, string[]> = {
  "cache-first": [
    "Page requests /logo.svg",
    "Service worker checks the cache first",
    "Cache hit: respond instantly, zero network",
    "Cache miss: fetch from network, store a copy, then respond",
  ],
  "network-first": [
    "Page requests /api/feed",
    "Service worker tries the network first",
    "Network OK: refresh the cache with the fresh copy, respond",
    "Network fails (offline): respond with the last cached copy",
  ],
  "swr": [
    "Page requests /avatar.png",
    "Service worker responds from cache immediately (fast paint)",
    "In the background, it fetches a fresh copy",
    "Cache is updated, so the next visit gets the fresh image",
  ],
  "lifecycle": [
    "Browser finds a new sw.js (byte-different)",
    "install: pre-cache the app shell",
    "skipWaiting(): new worker activates without waiting for tabs to close",
    "activate: delete every cache except the current version",
  ],
};

const PROS: Record<Recipe, { pros: string[]; cons: string[]; best: string }> = {
  "cache-first": {
    pros: ["Instant repeat loads", "Works fully offline after first visit"],
    cons: ["Stale content until the cache version changes", "Cache grows unless you version it"],
    best: "Static assets: images, fonts, hashed JS/CSS bundles.",
  },
  "network-first": {
    pros: ["Always fresh when online", "Graceful offline fallback"],
    cons: ["Slower than cache-first", "First offline visit after deploy can miss"],
    best: "HTML documents and API responses that change often.",
  },
  "swr": {
    pros: ["Instant response and eventual freshness", "Feels fast everywhere"],
    cons: ["First paint can be one version behind", "Background fetches cost bandwidth"],
    best: "Avatars, config, and other nice-to-have-fresh resources.",
  },
  "lifecycle": {
    pros: ["Atomic deploys: bump one version string", "No zombie caches eating storage"],
    cons: ["skipWaiting + clients.claim can surprise open tabs", "Pre-caching too much delays install"],
    best: "Every service worker needs this install/activate pairing.",
  },
};

const REGISTER_SNIPPET = `// Register from your page (HTTPS or localhost only)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" });
  });
}`;

function ServiceWorkerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("service-worker-recipes", isPro);
  const seo = getToolSeo("service-worker-recipes");

  const [recipe, setRecipe] = useState<Recipe>("cache-first");
  const [copied, setCopied] = useState(false);

  const meta = RECIPES.find((r) => r.id === recipe)!;
  const code = CODE[recipe];

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      trial.recordUse();
      toast.success("Recipe copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([code], { type: "text/javascript" }), meta.file);
    trial.recordUse();
    toast.success(`${meta.file} downloaded`);
  };

  const fullSnippet = useMemo(
    () => `${REGISTER_SNIPPET}\n\n// ---- ${meta.file} ----\n${code}`,
    [code, meta.file],
  );

  const copyAll = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(fullSnippet);
      trial.recordUse();
      toast.success("Recipe + registration snippet copied");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="service-worker-recipes" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Service Worker Recipes" left={trial.left} />

      <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-50/60 p-4 text-sm dark:bg-amber-950/20">
        <p className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
          <Server className="h-4 w-4" /> One honest requirement
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Service workers only register over <strong className="text-foreground">HTTPS or localhost</strong>, and
          the file must be a real same-origin URL (a Blob URL will not work). So this page cannot
          register a demo worker for you. Instead you get complete, working recipes: download the{" "}
          <code className="font-mono">sw.js</code>, drop it at your site root, and register it with
          the snippet below.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {RECIPES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRecipe(r.id)}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
              recipe === r.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Request flow</h2>
            <ol className="space-y-2.5">
              {FLOWS[recipe].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-extrabold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-snug text-foreground/90">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Trade-offs</h2>
            <div className="space-y-3 text-xs">
              <div>
                <p className="mb-1 font-bold text-green-600">Wins</p>
                <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {PROS[recipe].pros.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-bold text-amber-600">Costs</p>
                <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {PROS[recipe].cons.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
              <p className="rounded-xl bg-muted/40 p-3 text-foreground/90">
                <strong>Best for:</strong> {PROS[recipe].best}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-mono text-sm font-bold">{meta.file}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  disabled={!trial.canUse}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  disabled={!trial.canUse}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> Download sw.js
                </button>
              </div>
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{code}</pre>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free uses left.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Registration snippet</h2>
              <button
                type="button"
                onClick={copyAll}
                disabled={!trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" /> Copy recipe + snippet
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{REGISTER_SNIPPET}</pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Serve the recipe as <code className="font-mono">/sw.js</code> at your site root so its
              scope covers the whole site. Debug in DevTools under Application and Service Workers.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
