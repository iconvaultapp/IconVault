import { createLazyFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";
import RouteError from "@/components/RouteError";
import { TEMPLATES } from "@/lib/templates-data";
import { PremiumGate, ProPickBadge, ZipDownloadButton } from "@/components/V55Download";

export const Route = createLazyFileRoute("/templates/$slug")({
  component: Page,
  errorComponent: RouteError,
});

function Page() {
  const { slug } = Route.useParams();
  const t = TEMPLATES.find((x) => x.slug === slug);

  if (!t) {
    return (
      <PageShell eyebrow="Templates" title="Template not found" description="This template does not exist in the gallery.">
        <p className="text-sm text-muted-foreground">
          <Link to="/templates" className="font-medium text-primary hover:underline">
            Browse all templates
          </Link>
        </p>
      </PageShell>
    );
  }

  const isHugo = t.type.startsWith("hugo-theme");
  const isAdminLte = t.slug === "adminlte-dashboard";

  return (
    <PageShell
      eyebrow="Template"
      title={t.title}
      description={`${t.source} · ${t.license} licensed · ${t.category} · ${t.files.length} file${t.files.length === 1 ? "" : "s"}`}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {t.premium && <ProPickBadge />}
          <span className="text-sm text-muted-foreground">{t.source}</span>
          <Link to="/templates" className="text-sm font-medium text-primary hover:underline">
            ← All templates
          </Link>
        </div>

        {t.note && (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{t.note}</p>
        )}

        {isHugo ? (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Hugo theme download</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              PaperMod is a Hugo theme, not a static page, so there is no live preview here. Download
              the theme folder below, drop it into your Hugo site&apos;s <code>themes/</code> folder,
              and follow the theme&apos;s own setup docs to render it with Hugo.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <iframe
              title={`${t.title} preview`}
              src={`/templates/${t.slug}/${t.entry}`}
              loading="lazy"
              style={{ width: "100%", height: 640, border: 0 }}
            />
            <p className="border-t border-border p-3 text-xs text-muted-foreground">
              Live preview of the served template files. External CDN assets (fonts, Bootstrap, icons)
              load from their original providers, as in the source template.
              {isAdminLte && (
                <>
                  {" "}
                  This is the curated 2-page subset: use the preview&apos;s own navigation to switch
                  between the dashboard and the users page.
                </>
              )}
            </p>
          </section>
        )}

        <section className="flex flex-wrap items-center gap-3">
          <PremiumGate premium={t.premium} label={t.title}>
            <ZipDownloadButton slug={t.slug} files={t.files} basePath="/templates" />
          </PremiumGate>
          {!isHugo && (
            <a
              href={`/templates/${t.slug}/${t.entry}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Open full preview
            </a>
          )}
          {isAdminLte && (
            <a
              href="/templates/adminlte-dashboard/users.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Open users page
            </a>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Files included ({t.files.length})</h2>
          <ul className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {t.files.map((f) => (
              <li key={f}>
                <a href={`/templates/${t.slug}/${f}`} target="_blank" rel="noreferrer" className="hover:underline">
                  {f}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            License: {t.license} — see the LICENSE file in the download for the full text and
            attribution requirements. Original source: {t.source}.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
