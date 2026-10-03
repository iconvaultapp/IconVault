import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, FileText, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  listChangelogAdmin,
  saveChangelog,
  deleteChangelog,
  type ChangelogRow,
} from "@/lib/admin.tabs.functions";
import { cn } from "@/lib/utils";

function fmtDateTime(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

const inputCls =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50";

/** Changelog editor: draft or publish release notes shown on the site. */
export function ChangelogTab() {
  const [entries, setEntries] = useState<ChangelogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ChangelogRow | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAll = useServerFn(listChangelogAdmin);
  const saveFn = useServerFn(saveChangelog);
  const deleteFn = useServerFn(deleteChangelog);

  const load = async () => {
    setLoading(true);
    try {
      const { entries } = await fetchAll({ data: undefined });
      setEntries(entries);
    } catch {
      toast.error("Could not load changelog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setPublished(false);
  };

  const startEdit = (e: ChangelogRow) => {
    setEditing(e);
    setTitle(e.title);
    setBody(e.body);
    setPublished(e.published);
  };

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      const { ok } = await saveFn({
        data: {
          ...(editing?.id ? { id: editing.id } : {}),
          title: title.trim(),
          body: body.trim(),
          published,
        },
      });
      if (ok) {
        toast.success(editing ? "Changelog entry updated" : "Changelog entry created");
        startNew();
        await load();
      } else toast.error("Could not save entry");
    } catch {
      toast.error("Could not save entry");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e: ChangelogRow) => {
    if (!window.confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    try {
      const { ok } = await deleteFn({ data: { id: e.id } });
      if (ok) {
        setEntries((prev) => prev.filter((x) => x.id !== e.id));
        if (editing?.id === e.id) startNew();
        toast.success("Entry deleted");
      } else toast.error("Could not delete entry");
    } catch {
      toast.error("Could not delete entry");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading changelog…
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <FileText className="h-4 w-4 text-primary" />
          {editing ? "Edit entry" : "New entry"}
        </h3>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What changed"
              maxLength={200}
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Describe the change for users…"
              className={cn(inputCls, "resize-y")}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded accent-teal-600"
            />
            <span className="font-medium">Published (visible on the site)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {editing ? "Save changes" : "Create entry"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={startNew}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        All entries ({entries.length})
      </h3>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No changelog entries yet. Publish your first update above.
        </p>
      ) : (
        <ul className="grid gap-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold">{e.title}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      e.published
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {e.published ? "Published" : "Draft"}
                  </span>
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {fmtDateTime(e.updated_at)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(e)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {editing?.id === e.id ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                  {editing?.id === e.id ? "Cancel" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(e)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={startNew}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> New entry
        </button>
      </div>
    </div>
  );
}
