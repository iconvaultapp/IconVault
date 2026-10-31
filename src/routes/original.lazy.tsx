import { createLazyFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";
import { ORIGINAL_COLLECTIONS, ORIGINAL_TOTAL } from "@/lib/original-icons-data";

export const Route = createLazyFileRoute("/original")({
  component: Page,
});

function Page() {
  return (
    <PageShell
      eyebrow="Original collections"
      title="Drawn by IconVault"
      description={`${ORIGINAL_TOTAL} original icons, hand-drawn for this release — not copied, scraped or traced from any existing set. Free to browse; downloads need a free account, like everything else on the site.`}
    >
      <div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-3">
        {ORIGINAL_COLLECTIONS.map((c) => (
          <Link
            key={c.slug}
            to="/original/$collection"
            params={{ collection: c.slug }}
            className="rounded-2xl border border-border bg-card p-5 hover:border-primary"
          >
            <div className="flex flex-wrap gap-2">
              {c.icons.slice(0, 6).map((icon) => (
                <img
                  key={icon.slug}
                  src={`/original-icons/${c.slug}/${icon.file}`}
                  alt={icon.title}
                  width={32}
                  height={32}
                  loading="lazy"
                  style={{ width: 32, height: 32 }}
                />
              ))}
            </div>
            <h2 className="mt-4 text-lg font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-2 text-sm font-medium">{c.icons.length} icons →</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
