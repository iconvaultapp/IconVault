import { useMemo, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Download, Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import RouteError from "@/components/RouteError";
import { ORIGINAL_COLLECTIONS } from "@/lib/original-icons-data";
import { downloadUrlWithGate } from "@/lib/download-guard";

export const Route = createLazyFileRoute("/original/$collection")({
  component: Page,
  errorComponent: RouteError,
});

function Page() {
  const { collection } = Route.useParams();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");
  const coll = ORIGINAL_COLLECTIONS.find((c) => c.slug === collection);

  const filtered = useMemo(() => {
    if (!coll) return [];
    const q = query.trim().toLowerCase();
    if (!q) return coll.icons;
    return coll.icons.filter((i) => `${i.title} ${i.keywords}`.toLowerCase().includes(q));
  }, [coll, query]);

  if (!coll) {
    return (
      <PageShell eyebrow="Original collections" title="Collection not found" description="This collection does not exist.">
        <p className="text-sm text-muted-foreground">
          <Link to="/original" className="font-medium text-primary hover:underline">
            Browse all original collections
          </Link>
        </p>
      </PageShell>
    );
  }

  const copySvg = async (icon: { slug: string; file: string }) => {
    try {
      const res = await fetch(`/original-icons/${coll.slug}/${icon.file}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(icon.slug);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <PageShell
      eyebrow="Original collection"
      title={coll.title}
      description={`${coll.description} ${coll.icons.length} icons. Free to browse; downloads need a free account.`}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <Link to="/original" className="text-sm font-medium text-primary hover:underline">
          ← All original collections
        </Link>
        <label className="relative block max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this collection…"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {filtered.map((icon) => (
            <article key={icon.slug} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center">
              <img
                src={`/original-icons/${coll.slug}/${icon.file}`}
                alt={icon.title}
                width={56}
                height={56}
                loading="lazy"
                style={{ width: 56, height: 56 }}
              />
              <span className="text-xs font-medium leading-tight">{icon.title}</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => downloadUrlWithGate(`/original-icons/${coll.slug}/${icon.file}`, icon.file)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                  aria-label={`Download ${icon.title}`}
                >
                  <Download className="h-3.5 w-3.5" /> SVG
                </button>
                <button
                  type="button"
                  onClick={() => void copySvg(icon)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  aria-label={`Copy ${icon.title} SVG code`}
                >
                  {copied === icon.slug ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === icon.slug ? "Copied" : "Copy"}
                </button>
              </span>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No icons match that search.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          All {coll.icons.length} icons in this collection are original IconVault artwork (clean
          geometric stroke style). Copying SVG code is free for everyone; file downloads need a free
          account.
        </p>
      </div>
    </PageShell>
  );
}
