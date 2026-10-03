import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listErrorLogs, clearErrorLogs, type ErrorLogRow } from "@/lib/admin.tabs.functions";
import { DataTable } from "@/components/dashboard/DataTable";

function fmtDateTime(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "-";
  }
}

/** Client error log: recent failures, auto-refreshing, owner-clearable. */
export function ErrorLogsTab() {
  const [logs, setLogs] = useState<ErrorLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchAll = useServerFn(listErrorLogs);
  const clearFn = useServerFn(clearErrorLogs);
  const fetchRef = useRef(fetchAll);
  fetchRef.current = fetchAll;

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { logs } = await fetchRef.current({ data: undefined });
      setLogs(logs);
    } catch {
      if (!silent) toast.error("Could not load error logs");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(true), 30_000);
    return () => clearInterval(id);
  }, []);

  const clear = async () => {
    if (!window.confirm("Delete ALL error logs? This cannot be undone.")) return;
    setClearing(true);
    try {
      const { ok } = await clearFn({ data: undefined });
      if (ok) {
        setLogs([]);
        toast.success("Error logs cleared");
      } else toast.error("Could not clear logs");
    } catch {
      toast.error("Could not clear logs (owner only)");
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading error logs…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {logs.length} recent {logs.length === 1 ? "error" : "errors"} · auto-refreshes every 30s.
        </p>
        <button
          type="button"
          disabled={clearing || logs.length === 0}
          onClick={() => void clear()}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
        >
          {clearing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Clear all (owner only)
        </button>
      </div>

      <div className="mt-4">
        <DataTable<ErrorLogRow>
          minWidth={820}
          emptyText="No errors logged. A quiet log is a happy log."
          columns={[
            {
              key: "time",
              header: "Time",
              className: "whitespace-nowrap",
              render: (l) => <span className="tabular-nums">{fmtDateTime(l.created_at)}</span>,
            },
            {
              key: "message",
              header: "Message",
              render: (l) => (
                <span title={l.message} className="block max-w-md truncate font-mono text-xs">
                  {l.message}
                </span>
              ),
            },
            {
              key: "url",
              header: "URL",
              render: (l) =>
                l.url ? (
                  <span
                    title={l.url}
                    className="block max-w-48 truncate text-xs text-muted-foreground"
                  >
                    {l.url}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                ),
            },
            {
              key: "user",
              header: "User",
              render: (l) => (
                <span title={l.user_id ?? ""} className="font-mono text-xs text-muted-foreground">
                  {l.user_id ? l.user_id.slice(0, 8) + "…" : "-"}
                </span>
              ),
            },
          ]}
          rows={logs}
        />
      </div>
    </div>
  );
}
