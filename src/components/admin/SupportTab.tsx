import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, Loader2, MailOpen, Send } from "lucide-react";
import { toast } from "sonner";
import {
  listTickets,
  getTicket,
  replyTicket,
  setTicketStatus,
  type TicketRow,
  type TicketReplyRow,
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

function Pill({ status }: { status: string }) {
  const cls =
    status === "open"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : status === "in_progress"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        cls,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

type Filter = "all" | "open" | "in_progress" | "closed";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "closed", label: "Closed" },
];

/** Support inbox: ticket list, thread view, admin replies, status changes. */
export function SupportTab() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: TicketRow; replies: TicketReplyRow[] } | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const fetchAll = useServerFn(listTickets);
  const fetchOne = useServerFn(getTicket);
  const replyFn = useServerFn(replyTicket);
  const statusFn = useServerFn(setTicketStatus);

  const load = async () => {
    setLoading(true);
    try {
      const { tickets } = await fetchAll({ data: undefined });
      setTickets(tickets);
    } catch {
      toast.error("Could not load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetchOne({ data: { id } });
      setDetail(res);
    } catch {
      toast.error("Could not open ticket");
    } finally {
      setDetailLoading(false);
    }
  };

  const send = async () => {
    if (!selectedId || !draft.trim()) {
      toast.error("Write a reply first");
      return;
    }
    setSending(true);
    try {
      const { ok } = await replyFn({ data: { ticketId: selectedId, body: draft.trim() } });
      if (ok) {
        setDraft("");
        const res = await fetchOne({ data: { id: selectedId } });
        setDetail(res);
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedId && t.status === "open" ? { ...t, status: "in_progress" } : t,
          ),
        );
        toast.success("Reply sent");
      } else toast.error("Could not send reply");
    } catch {
      toast.error("Could not send reply");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selectedId) return;
    try {
      const { ok } = await statusFn({ data: { id: selectedId, status } });
      if (ok) {
        setDetail((d) => (d ? { ...d, ticket: { ...d.ticket, status } } : d));
        setTickets((prev) => prev.map((t) => (t.id === selectedId ? { ...t, status } : t)));
        toast.success(`Ticket marked as ${status.replace(/_/g, " ")}`);
      } else toast.error("Could not update status");
    } catch {
      toast.error("Could not update status");
    }
  };

  const visible = useMemo(
    () => (filter === "all" ? tickets : tickets.filter((t) => t.status === filter)),
    [tickets, filter],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading tickets…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.id === "all" ? tickets.length : tickets.filter((t) => t.status === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "focus-ring rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                filter === f.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {f.label} · {count}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {visible.length === 0 ? (
            <p className="flex items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-4 w-4" /> No tickets in this view.
            </p>
          ) : (
            <ul className="max-h-[560px] divide-y divide-border overflow-y-auto">
              {visible.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void select(t.id)}
                    className={cn(
                      "focus-ring block w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedId === t.id && "bg-primary-soft",
                    )}
                  >
                    <p className="truncate text-sm font-semibold">{t.subject}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.email}</p>
                    <p className="mt-1.5 flex items-center gap-2">
                      <Pill status={t.status} />
                      <span className="text-xs text-muted-foreground">
                        {fmtDateTime(t.created_at)}
                      </span>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!selectedId ? (
            <p className="flex items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <MailOpen className="h-4 w-4" /> Pick a ticket to read and reply.
            </p>
          ) : detailLoading || !detail ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading conversation…
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold">{detail.ticket.subject}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {detail.ticket.email} · opened {fmtDateTime(detail.ticket.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["open", "in_progress", "closed"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={detail.ticket.status === s}
                      onClick={() => void changeStatus(s)}
                      className={cn(
                        "focus-ring rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors disabled:opacity-40",
                        detail.ticket.status === s
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
                      )}
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid max-h-[380px] gap-3 overflow-y-auto">
                {detail.replies.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No replies yet. The first message from the user is the ticket itself.
                  </p>
                ) : (
                  detail.replies.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded-xl border p-3.5",
                        r.author === "admin"
                          ? "border-primary/30 bg-primary-soft"
                          : "border-border bg-muted/40",
                      )}
                    >
                      <p className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className={cn(
                            "font-bold",
                            r.author === "admin" ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {r.author === "admin" ? "You (admin)" : "User"}
                        </span>
                        <span className="text-muted-foreground">{fmtDateTime(r.created_at)}</span>
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 grid gap-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Reply</span>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    placeholder="Write a helpful reply…"
                    className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
                  />
                </label>
                <div>
                  <button
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={() => void send()}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send reply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
