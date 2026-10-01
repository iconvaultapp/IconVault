import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Package, Sparkles, Users, Megaphone } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, Stack, CTABand } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications & release alerts | IconVault" },
      {
        name: "description",
        content:
          "Track new icon sets, upstream releases and collection activity. Choose exactly which updates reach you and where.",
      },
      { property: "og:title", content: "Notifications & release alerts" },
      {
        property: "og:description",
        content: "Track new icon sets, upstream releases and collection activity.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/notifications" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/notifications" }],
  }),
  component: Page,
});

const PREF_KEY = "iconvault_notification_prefs";

const prefs = [
  {
    id: "sets",
    icon: Package,
    title: "New icon sets",
    body: "When a set is added to the vault or an existing one ships a major release.",
  },
  {
    id: "saved",
    icon: Sparkles,
    title: "Updates to sets you use",
    body: "Only for sets you've favourited icons from - redraws, renames and removals.",
  },
  {
    id: "team",
    icon: Users,
    title: "Collection activity",
    body: "When someone edits a collection you're a member of.",
  },
  {
    id: "product",
    icon: Megaphone,
    title: "Product updates",
    body: "New tools and features. Roughly once a month, never a drip campaign.",
  },
] as const;

const feed = [
  {
    id: 1,
    icon: Package,
    title: "Lucide 0.487 published",
    body: "142 new glyphs, including a full set of finance and banking icons.",
    at: "2 days ago",
    tone: "new" as const,
  },
  {
    id: 2,
    icon: Sparkles,
    title: "AI search is out of beta",
    body: "Describe an icon in plain language and get results across every set.",
    at: "5 days ago",
    tone: "product" as const,
  },
  {
    id: 3,
    icon: Package,
    title: "Phosphor 2.1 redraw",
    body: "17 icons in the duotone weight were redrawn for optical consistency at 16px.",
    at: "1 week ago",
    tone: "changed" as const,
  },
  {
    id: 4,
    icon: Megaphone,
    title: "SVG optimizer now runs offline",
    body: "The optimizer moved into the browser - nothing you paste leaves the device.",
    at: "2 weeks ago",
    tone: "product" as const,
  },
];

const toneStyles = {
  new: "bg-primary-soft text-primary",
  product: "bg-accent/10 text-accent",
  changed: "bg-surface-2 text-muted-foreground",
};

function Page() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    sets: true,
    saved: true,
    team: true,
    product: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved) setEnabled((prev) => ({ ...prev, ...(JSON.parse(saved) as Record<string, boolean>) }));
    } catch {
      /* ignore malformed prefs */
    }
  }, []);

  const toggle = (id: string) => {
    setEnabled((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <PageShell
      eyebrow="Your account"
      title="Notifications"
      description="Icon sets change under you - glyphs get redrawn, renamed, occasionally removed. These alerts exist so you find out before a build does."
    >
      <Stack>
        <div>
          <SectionHeading eyebrow="Recent" title="What's happened lately" />
          <div className="mt-8 grid gap-3">
            {feed.map((item, i) => (
              <Reveal key={item.id} delay={i * 45}>
                <article className="surface-card lift-hover flex gap-4 p-5">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                      toneStyles[item.tone],
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-display text-base font-semibold">{item.title}</h3>
                      <span className="text-xs text-muted-foreground">{item.at}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Looking further back? The full{" "}
            <Link to="/changelog" className="text-primary underline-offset-4 hover:underline">
              changelog
            </Link>{" "}
            has every release.
          </p>
        </div>

        <div>
          <SectionHeading
            eyebrow="Preferences"
            title="Choose what reaches you"
            description="Saved on this device instantly. Sign in to sync the same choices to email."
          />
          <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {prefs.map((pref) => (
              <div key={pref.id} className="flex items-center gap-4 px-5 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
                  <pref.icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold">{pref.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{pref.body}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!enabled[pref.id]}
                  aria-label={pref.title}
                  onClick={() => toggle(pref.id)}
                  className={cn(
                    "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    enabled[pref.id] ? "bg-primary" : "bg-surface-2 border border-border",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
                      enabled[pref.id] ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <CTABand
          title="Wire alerts into your own tools"
          body="Poll the API for new and updated sets, and push the changes wherever your team already watches for releases."
          primary={{ label: "API access", to: "/api-access" }}
          secondary={{ label: "Account settings", to: "/profile" }}
        />
      </Stack>

      <span className="sr-only">
        <Bell aria-hidden="true" />
      </span>
    </PageShell>
  );
}
