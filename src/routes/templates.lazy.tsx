import { useMemo, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATES_PREMIUM, TEMPLATES_TOTAL } from "@/lib/templates-data";
import { PremiumGate, ProPickBadge, ZipDownloadButton } from "@/components/V55Download";

export const Route = createLazyFileRoute("/templates")({
  component: Page,
});

function Page() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (q && !(t.title + " " + t.slug + " " + t.source + " " + t.category).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  return (
    <PageShell
      eyebrow="Templates"
      title="Free website templates"
      description={`${TEMPLATES_TOTAL} free MIT-licensed website templates. Preview each one, then download the files. Everything here is open-source — "Pro pick" just means a curated favourite whose download needs Pro; it is not exclusive content.`}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {TEMPLATES_TOTAL} templates · {TEMPLATES_TOTAL - TEMPLATES_PREMIUM} free downloads, {TEMPLATES_PREMIUM} curated Pro picks
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <article key={t.slug} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold">
                  <Link to="/templates/$slug" params={{ slug: t.slug }} className="hover:underline">
                    {t.title}
                  </Link>
                </h2>
                {t.premium && <ProPickBadge />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.source} · {t.license} · {t.category}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.type === "hugo-theme"
                  ? "Hugo theme download — not a static preview."
                  : `${t.files.length} file${t.files.length === 1 ? "" : "s"} · live preview on the detail page.`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  to="/templates/$slug"
                  params={{ slug: t.slug }}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  {t.type === "hugo-theme" ? "View download" : "Preview"}
                </Link>
                <PremiumGate premium={t.premium} label={t.title}>
                  <ZipDownloadButton slug={t.slug} files={t.files} basePath="/templates" label="Download .zip" />
                </PremiumGate>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No templates match that search.
          </p>
        )}

        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">About these templates</h2>
          <p className="mt-2">
            All templates are MIT licensed and credited to their original authors above. The
            StartBootstrap agency template&apos;s contact form uses StartBootstrap&apos;s SB Forms
            service (form submissions go to the original author&apos;s service, not IconVault).
            AdminLTE is a curated 2-page subset — its omitted demo-page links were de-linked in the
            served copy so they do not 404. PaperMod is a Hugo theme, so it is a download, not a
            preview. JAKS.dev templates had the author&apos;s Google Analytics snippet removed and
            their canonical links to the original site dropped in the served copy.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
