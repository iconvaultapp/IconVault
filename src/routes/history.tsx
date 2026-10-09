import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Download, Search, Trash2, X } from "lucide-react";
import PageShell from "@/components/PageShell";
import IconifyGrid from "@/components/IconifyGrid";
import IconifyDetail from "@/components/IconifyDetail";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, Stack } from "@/components/kit";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { downloadCsv, stamp } from "@/lib/csv";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Your search & icon history | IconVault" },
      {
        name: "description",
        content:
          "Every icon you opened and every search you ran, kept on this device. Jump back to a result you almost used without retracing the search.",
      },
      { property: "og:title", content: "Your search & icon history" },
      {
        property: "og:description",
        content: "Revisit the icons you opened and the searches you ran, stored on your device.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/history" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/history" }],
  }),
  component: Page,
});

const relative = (ts: number) => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

function Page() {
  const { recent, addRecent, clearRecent } = useRecentlyViewed();
  const { history, remove, clear } = useSearchHistory();
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <PageShell
      wide
      eyebrow="Your account"
      title="History"
      description="Saved on this device, and synced to your account when you're signed in so it follows you. Clear it any time and it's genuinely gone."
    >
      <Stack>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Recently viewed"
              title="Icons you opened"
              description="The last 20 icons you inspected, newest first."
            />
            {recent.length > 0 && (
              <button
                type="button"
                onClick={clearRecent}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear icons
              </button>
            )}
          </div>
          <div className="mt-8">
            {recent.length > 0 ? (
              <IconifyGrid icons={recent} onIconClick={setActiveIcon} />
            ) : (
              <div className="surface-card p-10 text-center">
                <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-semibold">No icons yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Open an icon in the vault and it shows up here for the next time you need it.
                </p>
                <Link
                  to="/"
                  className="focus-ring mt-6 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Browse icons
                </Link>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Searches"
              title="What you looked for"
              description="Tap a query to run it again in the vault."
            />
            {history.length > 0 && (
              <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `iconvault-search-history-${stamp()}.csv`,
                    ["Query", "Results", "Searched at"],
                    history.map((e) => [e.query, e.results ?? "", new Date(e.at).toISOString()]),
                  )
                }
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
              <button
                type="button"
                onClick={clear}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear searches
              </button>
              </div>
            )}
          </div>

          <div className="mt-8">
            {history.length > 0 ? (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {history.map((entry, i) => (
                  <Reveal key={entry.query} as="li" delay={Math.min(i, 8) * 30}>
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => void navigate({ to: "/app", search: { q: entry.query } })}
                        className="focus-ring min-w-0 flex-1 truncate text-left text-sm transition-colors hover:text-primary"
                      >
                        {entry.query}
                      </button>
                      {entry.results !== undefined && (
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {entry.results} results
                        </span>
                      )}
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        {relative(entry.at)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${entry.query} from history`}
                        onClick={() => remove(entry.query)}
                        className="focus-ring shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Reveal>
                ))}
              </ul>
            ) : (
              <div className="surface-card p-10 text-center">
                <Search className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-semibold">No searches recorded</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Searches you run in the vault and in AI search land here.
                </p>
              </div>
            )}
          </div>
        </div>
      </Stack>

      {activeIcon && (
        <IconifyDetail iconId={activeIcon} onClose={() => setActiveIcon(null)} onAddToRecent={addRecent} />
      )}
    </PageShell>
  );
}
