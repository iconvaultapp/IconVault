import { useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";
import RouteError from "@/components/RouteError";
import { TEMPLATES } from "@/lib/templates-data";
import { PremiumGate, ProPickBadge, ZipDownloadButton } from "@/components/V55Download";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/hooks/useAuth";
import { requestAuth } from "@/lib/download-guard";

export const Route = createLazyFileRoute("/templates_/$slug")({
  component: Page,
  errorComponent: RouteError,
});

function Page() {
  const { slug } = Route.useParams();
  const t = TEMPLATES.find((x) => x.slug === slug);
  const { isPro } = usePlan();
  const { user } = useAuth();
  const [showAllFiles, setShowAllFiles] = useState(false);

  if (!t) {
    return (
      <PageShell fluid eyebrow="Templates" title="Template not found" description="This template does not exist in the gallery.">
        <p className="text-sm text-muted-foreground">
          <Link to="/templates" className="font-medium text-primary hover:underline">
            Browse all templates
          </Link>
        </p>
      </PageShell>
    );
  }

  const isAdminLte = t.slug === "adminlte-dashboard";
  // Long file lists (startbootstrap-agency has 26) collapse to the first 12 + a toggle,
  // so the detail page is not a wall of filenames after the preview.
  const visibleFiles = showAllFiles || t.files.length <= 12 ? t.files : t.files.slice(0, 12);
  // Preview policy (audit G4, recorded explicitly): the live iframe preview
  // stays free for every template — viewing is free, per the v55 rule. Only
  // TAKING files is gated for Pro picks: the zip, the file links below, and
  // the full-preview links. Static files are public by hosting design, so a
  // single-file premium template can technically be saved via view-source;
  // the gate removes every one-click path to it.

  return (
    <PageShell
      fluid
      eyebrow="Template"
      title={t.title}
      description={`${t.source} · ${t.license} licensed · ${t.category} · ${t.files.length} file${t.files.length === 1 ? "" : "s"}`}
    >
      <div className="w-full space-y-6">
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

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <iframe
              title={`${t.title} preview`}
              src={`/template-files/${t.slug}/${t.entry}`}
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

        <section className="flex flex-wrap items-center gap-3">
          <PremiumGate premium={t.premium} label={t.title}>
            <ZipDownloadButton slug={t.slug} files={t.files} basePath="/template-files" />
          </PremiumGate>
          <PremiumGate premium={t.premium} label={t.title}>
            <a
              href={`/template-files/${t.slug}/${t.entry}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Open full preview
            </a>
          </PremiumGate>
          {isAdminLte && (
            <PremiumGate premium={t.premium} label={t.title}>
              <a
                href="/template-files/adminlte-dashboard/users.html"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Open users page
              </a>
            </PremiumGate>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Files included ({t.files.length})</h2>
          <ul className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {visibleFiles.map((f) => (
              <li key={f}>
                {!t.premium || isPro ? (
                  user ? (
                    <a href={`/template-files/${t.slug}/${f}`} target="_blank" rel="noreferrer" className="hover:underline">
                      {f}
                    </a>
                  ) : (
                    // v68: free-template file links were plain hrefs — a
                    // signed-out visitor could open every file without
                    // signing in, bypassing the download gate. Anonymous
                    // visitors get the sign-in prompt instead; the href
                    // itself only renders once signed in.
                    <button
                      type="button"
                      onClick={() => requestAuth("Sign in to view files — it's free.")}
                      className="hover:underline"
                    >
                      {f}
                    </button>
                  )
                ) : (
                  <span>{f}</span>
                )}
              </li>
            ))}
          </ul>
          {t.files.length > 12 && (
            <button
              type="button"
              onClick={() => setShowAllFiles((v) => !v)}
              className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              {showAllFiles ? "Show fewer files" : `Show all ${t.files.length} files`}
            </button>
          )}
          {t.premium && !isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              File links unlock with Pro — this is a curated Pro pick, so individual files open only after upgrading.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            License: {t.license} — see the LICENSE file in the download for the full text and
            attribution requirements. Original source: {t.source}.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
