import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Info, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { listTakedowns, setTakedownStatus, type TakedownRow } from "@/lib/admin.tabs.functions";
import { DataTable } from "@/components/dashboard/DataTable";
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
    status === "approved"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : status === "rejected"
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        cls,
      )}
    >
      {status}
    </span>
  );
}

/** Copyright takedown requests: approve or reject reporter claims. */
export function TakedownsTab() {
  const [rows, setRows] = useState<TakedownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchAll = useServerFn(listTakedowns);
  const setStatusFn = useServerFn(setTakedownStatus);

  const load = async () => {
    setLoading(true);
    try {
      const { takedowns } = await fetchAll({ data: undefined });
      setRows(takedowns);
    } catch {
      toast.error("Could not load takedown requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (row: TakedownRow, status: "approved" | "rejected") => {
    const verb = status === "approved" ? "Approve" : "Reject";
    if (!window.confirm(`${verb} the takedown request for "${row.icon_set}"?`)) return;
    setActing(row.id);
    try {
      const { ok } = await setStatusFn({ data: { id: row.id, status } });
      if (ok) {
        setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, status } : x)));
        toast.success(`Request ${status}`);
      } else toast.error("Could not update request");
    } catch {
      toast.error("Could not update request");
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading takedown requests…
      </div>
    );
  }

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {rows.length} total · {pending} pending review.
      </p>

      <div className="mt-4">
        <DataTable<TakedownRow>
          minWidth={820}
          emptyText="No takedown requests. Reports from the community will appear here."
          columns={[
            { key: "reporter", header: "Reporter", render: (r) => r.reporter_email },
            {
              key: "set",
              header: "Icon set",
              render: (r) => <span className="font-mono text-xs">{r.icon_set}</span>,
            },
            {
              key: "reason",
              header: "Reason",
              render: (r) => (
                <span title={r.reason} className="block max-w-56 truncate">
                  {r.reason}
                </span>
              ),
            },
            { key: "status", header: "Status", render: (r) => <Pill status={r.status} /> },
            { key: "date", header: "Date", render: (r) => fmtDateTime(r.created_at) },
            {
              key: "actions",
              header: "Decision",
              render: (r) =>
                r.status === "pending" ? (
                  <span className="inline-flex gap-1.5">
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => void decide(r, "approved")}
                      className="focus-ring inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      {acting === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => void decide(r, "rejected")}
                      className="focus-ring inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                    >
                      {acting === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      Reject
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Decided</span>
                ),
            },
          ]}
          rows={rows}
        />
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Approving records the decision; hiding the set is handled separately.
      </p>
    </div>
  );
}
