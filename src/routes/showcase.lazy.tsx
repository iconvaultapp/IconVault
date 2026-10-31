import { useEffect, useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createLazyFileRoute("/showcase")({
  component: Page,
});

interface ShowcaseEntry {
  id: string;
  project_name: string;
  creator_name: string;
  creator_site: string;
  description: string;
  icons_used: string;
  created_at: string;
}

function Page() {
  const [entries, setEntries] = useState<ShowcaseEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    project_name: "",
    creator_name: "",
    creator_site: "",
    description: "",
    icons_used: "",
    contact_email: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (supabase as any)
      .from("showcase_projects")
      .select("id, project_name, creator_name, creator_site, description, icons_used, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }: { data: ShowcaseEntry[] | null; error: unknown }) => {
        if (!cancelled) {
          // A missing table (migration not run yet) is an honest empty state,
          // not a fabricated gallery — the form below explains the status.
          if (!error && data) setEntries(data as ShowcaseEntry[]);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/showcase/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setSubmitted(true);
      toast.success("Thanks — your project is pending review and will appear here once approved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const field = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";

  return (
    <PageShell
      eyebrow="Community showcase"
      title="Built with IconVault"
      description="Real projects built with IconVault icons, shared by their creators. Nothing here is invented — every entry below was submitted by its creator and approved. Free to browse."
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Showcase ({entries.length})</h2>
          {!loaded && <p className="text-sm text-muted-foreground">Loading…</p>}
          {loaded && entries.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-lg font-semibold">Be the first to showcase</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                No approved projects yet — this gallery starts empty on purpose. We do not invent
                projects, names or links. Submit yours below and it will appear here once approved.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold">{entry.project_name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  by{" "}
                  <a href={entry.creator_site} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                    {entry.creator_name}
                  </a>
                </p>
                <p className="mt-2 text-sm">{entry.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">Icons used: {entry.icons_used}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Submit your project</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The link back to your site is the incentive — share your entry and it links to you.
            Submissions stay hidden until approved. Rate-limited to prevent spam.
          </p>
          {submitted ? (
            <p className="mt-4 rounded-xl bg-muted p-4 text-sm">
              Thank you — your submission is pending review. It will appear in the gallery above once
              approved.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input required maxLength={120} value={form.project_name} onChange={set("project_name")} placeholder="Project name *" className={field} />
              <input required maxLength={120} value={form.creator_name} onChange={set("creator_name")} placeholder="Your name *" className={field} />
              <input required maxLength={500} value={form.creator_site} onChange={set("creator_site")} placeholder="Your site URL (https://…) *" className={field} />
              <input maxLength={200} value={form.contact_email} onChange={set("contact_email")} placeholder="Contact email (optional, never shown)" className={field} />
              <textarea required maxLength={500} value={form.description} onChange={set("description")} placeholder="Short description *" rows={3} className={`${field} sm:col-span-2`} />
              <input required maxLength={300} value={form.icons_used} onChange={set("icons_used")} placeholder="Which icons / sets did you use? *" className={`${field} sm:col-span-2`} />
              <button type="submit" disabled={submitting} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:col-span-2 sm:justify-self-start">
                {submitting ? "Submitting…" : "Submit project"}
              </button>
            </form>
          )}
        </section>
      </div>
    </PageShell>
  );
}
