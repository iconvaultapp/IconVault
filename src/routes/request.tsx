import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Loader2, Inbox, CheckCircle2, CircleDashed } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, Stack, FaqList } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request an icon | IconVault" },
      {
        name: "description",
        content:
          "Searched everything and it doesn't exist? Tell us what you need. We track requests, point you at near matches and push popular ones upstream.",
      },
      { property: "og:title", content: "Request an icon" },
      {
        property: "og:description",
        content: "Tell us the icon you couldn't find and we'll track it down or push it upstream.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/request" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/request" }],
  }),
  component: Page,
});

const categories = [
  "Interface",
  "Commerce",
  "Communication",
  "Media",
  "Devices",
  "Brands & logos",
  "Maps & travel",
  "Health",
  "Other",
];

interface RequestRow {
  id: string;
  icon_name: string;
  category: string | null;
  status: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  open: "bg-surface-2 text-muted-foreground",
  planned: "bg-primary-soft text-primary",
  shipped: "bg-emerald-500/10 text-emerald-600",
};

function Page() {
  const { user } = useAuth();
  const [iconName, setIconName] = useState("");
  const [category, setCategory] = useState<string>(categories[0] as string);
  const [description, setDescription] = useState("");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [trap, setTrap] = useState("");
  const [mine, setMine] = useState<RequestRow[]>([]);

  const loadMine = () => {
    if (!user) {
      setMine([]);
      return;
    }
    void supabase
      .from("icon_requests")
      .select("id, icon_name, category, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setMine((data as RequestRow[]) ?? []));
  };

  useEffect(loadMine, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iconName.trim()) return;
    if (isBotSubmission(trap)) {
      // Bot filled the honeypot: silently discard, pretend success.
      toast.success("Request received - we'll look for a match.");
      setIconName("");
      setDescription("");
      setUseCase("");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("icon_requests").insert({
      icon_name: iconName.trim(),
      category,
      description: description.trim() || null,
      use_case: useCase.trim() || null,
      user_id: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't send that request. Try again in a moment.");
      return;
    }
    toast.success("Request received - we'll look for a match.");
    setIconName("");
    setDescription("");
    setUseCase("");
    loadMine();
  };

  const field =
    "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50";

  return (
    <PageShell
      eyebrow="Tools"
      title="Request an icon"
      description="421,020 glyphs and still nothing fits? That's useful signal. Tell us what you were looking for and what it's for - the context is what lets us find a near match or argue for a new draw upstream."
    >
      <Stack>
        <Reveal>
          <form onSubmit={submit} className="surface-card grid gap-5 p-6 sm:p-8">
            <HoneypotField onFill={setTrap} />
            <div className="grid gap-2">
              <label htmlFor="icon-name" className="text-sm font-medium">
                What icon do you need?
              </label>
              <input
                id="icon-name"
                required
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                placeholder="e.g. contactless payment terminal"
                className={field}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={field}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Describe it <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Outline style, what it should depict, any set you'd like it to match."
                className={cn(field, "resize-y")}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="use-case" className="text-sm font-medium">
                Where will you use it? <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="use-case"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="e.g. checkout step in a POS app"
                className={field}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send request
              </button>
              {!user && (
                <p className="text-xs text-muted-foreground">
                  Sign in to track the status of your requests.
                </p>
              )}
            </div>
          </form>
        </Reveal>

        {user && (
          <div>
            <SectionHeading eyebrow="Your requests" title="What you've asked for" />
            <div className="mt-8">
              {mine.length > 0 ? (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {mine.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                      {r.status === "shipped" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">{r.icon_name}</span>
                      {r.category && (
                        <span className="text-xs text-muted-foreground">{r.category}</span>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
                          statusStyles[r.status] ?? statusStyles['open'],
                        )}
                      >
                        {r.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="surface-card p-10 text-center">
                  <Inbox className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 font-display text-lg font-semibold">No requests yet</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Anything you send lands here with its status.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <SectionHeading eyebrow="Questions" title="How requests work" />
          <div className="mt-8">
            <FaqList
              items={[
                {
                  q: "How long does it take?",
                  a: "We triage weekly. Most requests get a near-match suggestion within a few days; a genuinely new glyph depends on the upstream set's release cycle.",
                },
                {
                  q: "Do you draw icons yourselves?",
                  a: "For popular requests, yes - we contribute them back to an open set under its own licence rather than locking them behind IconVault.",
                },
                {
                  q: "Can I request a brand logo?",
                  a: "We can point you at existing brand sets, but we won't redraw trademarked marks. Check the brand's own press kit first.",
                },
                {
                  q: "Do Pro accounts get priority?",
                  a: "Pro and Team requests are triaged first, and Team plans can upload their own custom icons instead of waiting.",
                },
              ]}
            />
          </div>
        </div>
      </Stack>
    </PageShell>
  );
}
