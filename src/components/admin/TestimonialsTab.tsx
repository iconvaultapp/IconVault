import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Pencil, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  listTestimonialsAdmin,
  setTestimonialApproval,
  updateTestimonial,
  deleteTestimonial,
  type TestimonialRow,
} from "@/lib/testimonial.functions";
import { cn } from "@/lib/utils";

/** Admin moderation for homepage testimonials: approve, edit, delete. */
export function TestimonialsTab() {
  const [items, setItems] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TestimonialRow | null>(null);
  const [draft, setDraft] = useState({ name: "", role: "", text: "", rating: 5 });
  const [saving, setSaving] = useState(false);

  const fetchAll = useServerFn(listTestimonialsAdmin);
  const approveFn = useServerFn(setTestimonialApproval);
  const updateFn = useServerFn(updateTestimonial);
  const deleteFn = useServerFn(deleteTestimonial);

  const load = async () => {
    setLoading(true);
    try {
      const { testimonials } = await fetchAll({ data: undefined });
      setItems(testimonials);
    } catch {
      toast.error("Could not load testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleApproval = async (t: TestimonialRow) => {
    try {
      const { ok } = await approveFn({ data: { id: t.id, approved: !t.is_approved } });
      if (ok) {
        setItems((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, is_approved: !t.is_approved } : x)),
        );
        toast.success(t.is_approved ? "Testimonial hidden" : "Testimonial approved");
      } else toast.error("Could not update");
    } catch {
      toast.error("Could not update");
    }
  };

  const remove = async (t: TestimonialRow) => {
    if (!window.confirm(`Delete the testimonial from "${t.name}"?`)) return;
    try {
      const { ok } = await deleteFn({ data: { id: t.id } });
      if (ok) {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
        toast.success("Testimonial deleted");
      } else toast.error("Could not delete");
    } catch {
      toast.error("Could not delete");
    }
  };

  const startEdit = (t: TestimonialRow) => {
    setEditing(t);
    setDraft({ name: t.name, role: t.role, text: t.text, rating: t.rating });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!draft.name.trim() || !draft.text.trim()) {
      toast.error("Name and text are required");
      return;
    }
    setSaving(true);
    try {
      const { ok } = await updateFn({ data: { id: editing.id, ...draft } });
      if (ok) {
        setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...draft } : x)));
        setEditing(null);
        toast.success("Testimonial updated");
      } else toast.error("Could not save");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const pending = items.filter((t) => !t.is_approved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading testimonials…
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {items.length} total · {pending} pending approval. Only approved testimonials appear in the
        homepage carousel.
      </p>

      {items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No testimonials yet. Reviews submitted from user profiles will appear here for approval.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {items.map((t) => (
            <li key={t.id} className="rounded-2xl border border-border bg-surface p-5">
              {editing?.id === t.id ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">Name</span>
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        maxLength={80}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">Role</span>
                      <input
                        value={draft.role}
                        onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                        maxLength={80}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">Rating</span>
                      <select
                        value={draft.rating}
                        onChange={(e) => setDraft((d) => ({ ...d, rating: Number(e.target.value) }))}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} star{n === 1 ? "" : "s"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">Review text</span>
                    <textarea
                      value={draft.text}
                      onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value.slice(0, 2000) }))}
                      rows={3}
                      className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveEdit()}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex gap-0.5 text-accent" aria-label={`${t.rating} of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, n) => (
                          <Star
                            key={n}
                            className={cn("h-3.5 w-3.5", n < t.rating ? "fill-accent" : "opacity-30")}
                          />
                        ))}
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold",
                          t.is_approved
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                        )}
                      >
                        {t.is_approved ? "Approved" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">"{t.text}"</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t.name} · {t.role} · {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleApproval(t)}
                      className={cn(
                        "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors",
                        t.is_approved
                          ? "border-border text-muted-foreground hover:border-amber-400/60 hover:text-amber-600"
                          : "border-primary/40 bg-primary-soft text-primary hover:bg-primary/20",
                      )}
                    >
                      {t.is_approved ? (
                        <>
                          <X className="h-3.5 w-3.5" /> Unapprove
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      aria-label="Edit testimonial"
                      className="focus-ring rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(t)}
                      aria-label="Delete testimonial"
                      className="focus-ring rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
