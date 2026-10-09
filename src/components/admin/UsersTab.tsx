import { useMemo, useState } from "react";
import { Ban, ChevronLeft, ChevronRight, Download, Search, Undo2 } from "lucide-react";
import { downloadCsv, stamp } from "@/lib/csv";
import { cn } from "@/lib/utils";

export interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  plan: string;
  is_owner: boolean;
  is_banned: boolean;
}

interface UsersTabProps {
  users: AdminUserRow[];
  /** Ban a user. Reason comes from a window.prompt, null when the admin cancels. */
  onBan?: (userId: string, reason: string | null) => void | Promise<void>;
  onUnban?: (userId: string) => void | Promise<void>;
  onPlanChange?: (userId: string, plan: "free" | "pro") => void | Promise<void>;
}

const PAGE_SIZE = 25;

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

/**
 * Dedicated user management: searchable, paginated user list with
 * bulk-select checkboxes and CSV download (selected, or all when none
 * are selected).
 */
export function UsersTab({ users, onBan, onUnban, onPlanChange }: UsersTabProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const showActions = Boolean(onBan || onUnban || onPlanChange);

  const ban = (u: AdminUserRow) => {
    const reason = window.prompt(
      `Ban ${u.email ?? "this user"}? They will be signed out and blocked from signing in. Enter a reason (optional):`,
    );
    if (reason === null) return; // prompt cancelled
    void onBan?.(u.id, reason);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.display_name ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const toggleAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((r) => next.delete(r.id));
      else pageRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    const rows = selected.size > 0 ? users.filter((u) => selected.has(u.id)) : filtered;
    downloadCsv(
      `iconvault-users-${stamp()}.csv`,
      ["Email", "Name", "Plan", "Created", "Last sign in"],
      rows.map((u) => [
        u.email ?? "",
        u.display_name ?? "",
        u.plan,
        u.created_at,
        u.last_sign_in_at ?? "",
      ]),
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search email or name…"
            aria-label="Search users"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/50"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {selected.size > 0
            ? `${selected.size} selected`
            : `${filtered.length} user${filtered.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={exportCsv}
          className="focus-ring ml-auto inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Download className="h-3.5 w-3.5" />
          {selected.size > 0 ? `Download ${selected.size} selected` : "Download all (CSV)"}
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAllPage}
                  aria-label="Select all users on this page"
                  className="h-4 w-4 accent-[#0F766E]"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Last sign in</th>
              {showActions && <th className="px-4 py-3 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 7 : 6} className="px-4 py-10 text-center text-muted-foreground">
                  {query ? "No users match your search." : "No users yet."}
                </td>
              </tr>
            ) : (
              pageRows.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleOne(u.id)}
                      aria-label={`Select ${u.email ?? u.id}`}
                      className="h-4 w-4 accent-[#0F766E]"
                    />
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 font-mono text-[13px]">
                    {u.email ?? "-"}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3">{u.display_name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                          u.plan === "free"
                            ? "bg-muted text-muted-foreground"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                        )}
                      >
                        {u.plan}
                      </span>
                      {u.is_banned && (
                        <span className="inline-flex rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
                          Banned
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "Never"}
                  </td>
                  {showActions && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-2">
                        {onPlanChange && (
                          <select
                            value={u.plan === "pro" ? "pro" : "free"}
                            onChange={(e) =>
                              void onPlanChange(u.id, e.target.value as "free" | "pro")
                            }
                            aria-label={`Plan for ${u.email ?? u.id}`}
                            className="focus-ring rounded-full border border-border bg-background px-2.5 py-1.5 text-xs font-medium outline-none transition-colors hover:border-primary/40"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                          </select>
                        )}
                        {u.is_banned
                          ? onUnban && (
                              <button
                                type="button"
                                onClick={() => void onUnban(u.id)}
                                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-success/40 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10"
                              >
                                <Undo2 className="h-3.5 w-3.5" /> Unban
                              </button>
                            )
                          : onBan && (
                              <button
                                type="button"
                                onClick={() => ban(u)}
                                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                              >
                                <Ban className="h-3.5 w-3.5" /> Ban
                              </button>
                            )}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Page {safePage + 1} of {pageCount}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
            className="focus-ring rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            aria-label="Next page"
            className="focus-ring rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
