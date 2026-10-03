import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Banknote, CreditCard, Loader2, RefreshCw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  listPayments,
  listSubscriptions,
  createRefund,
  type AdminPaymentRow,
  type AdminSubscriptionRow,
} from "@/lib/admin.tabs.functions";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { cn } from "@/lib/utils";

function fmtMoney(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
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

function shortId(id: string): string {
  return id.length > 10 ? id.slice(0, 8) + "…" : id;
}

function Pill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s.includes("active") || s === "succeeded" || s === "paid"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : s.includes("trial") ||
          s.includes("pending") ||
          s.includes("process") ||
          s === "past_due" ||
          s === "on_hold" ||
          s === "paused"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : s === "failed"
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          : "bg-muted text-muted-foreground";
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

/** Payments and subscriptions from Dodo: revenue stats, refund control. */
export function PaymentsTab() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dodoError, setDodoError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);

  const fetchPayments = useServerFn(listPayments);
  const fetchSubs = useServerFn(listSubscriptions);
  const refundFn = useServerFn(createRefund);

  const load = async () => {
    setLoading(true);
    setDodoError(null);
    try {
      const [p, s] = await Promise.all([
        fetchPayments({ data: undefined }),
        fetchSubs({ data: undefined }),
      ]);
      if (!p.ok) {
        setDodoError(p.error);
      } else if (!s.ok) {
        setDodoError(s.error);
      } else {
        setPayments(p.payments);
        setSubscriptions(s.subscriptions);
      }
    } catch {
      setDodoError("Request failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refund = async (p: AdminPaymentRow) => {
    if (!window.confirm(`Refund ${fmtMoney(p.amount)} to ${p.email}? This cannot be undone.`))
      return;
    setRefunding(p.id);
    try {
      const res = await refundFn({ data: { payment_id: p.id } });
      if (res.ok) {
        toast.success("Refund issued");
        await load();
      } else {
        toast.error(`Refund failed: ${res.error}`);
      }
    } catch {
      toast.error("Refund failed");
    } finally {
      setRefunding(null);
    }
  };

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const mrr = activeSubs.length * (12 / 12);
  const failedCount = payments.filter(
    (p) => p.status === "failed" || p.status === "cancelled",
  ).length;
  const revenue = payments
    .filter((p) => p.status === "succeeded" || p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading payments…
      </div>
    );
  }

  return (
    <div>
      {dodoError && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Dodo Payments not reachable: {dodoError}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={fmtMoney(mrr)} icon={Banknote} />
        <StatCard label="Active subscriptions" value={activeSubs.length} icon={RefreshCw} />
        <StatCard label="Failed payments" value={failedCount} icon={AlertTriangle} />
        <StatCard label="Total revenue" value={fmtMoney(revenue)} icon={CreditCard} />
      </div>

      <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Subscriptions
      </h3>
      <DataTable<AdminSubscriptionRow>
        minWidth={720}
        emptyText="No subscriptions found."
        columns={[
          {
            key: "id",
            header: "ID",
            render: (s) => (
              <span title={s.id} className="font-mono text-xs text-muted-foreground">
                {shortId(s.id)}
              </span>
            ),
          },
          { key: "email", header: "Email", render: (s) => s.email || "-" },
          { key: "status", header: "Status", render: (s) => <Pill status={s.status} /> },
          {
            key: "amount",
            header: "Amount",
            render: (s) => <span className="tabular-nums">{fmtMoney(s.amount)}/yr</span>,
          },
          { key: "period", header: "Period end", render: (s) => fmtDate(s.current_period_end) },
        ]}
        rows={subscriptions}
      />

      <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Payments
      </h3>
      <DataTable<AdminPaymentRow>
        minWidth={760}
        emptyText="No payments found."
        columns={[
          {
            key: "id",
            header: "ID",
            render: (p) => (
              <span title={p.id} className="font-mono text-xs text-muted-foreground">
                {shortId(p.id)}
              </span>
            ),
          },
          { key: "email", header: "Email", render: (p) => p.email || "-" },
          {
            key: "amount",
            header: "Amount",
            render: (p) => (
              <span className="tabular-nums">
                {fmtMoney(p.amount)}{" "}
                <span className="text-xs text-muted-foreground">{p.currency}</span>
              </span>
            ),
          },
          { key: "status", header: "Status", render: (p) => <Pill status={p.status} /> },
          { key: "date", header: "Date", render: (p) => fmtDate(p.created_at) },
          {
            key: "action",
            header: "Action",
            render: (p) =>
              p.status === "succeeded" || p.status === "paid" ? (
                <button
                  type="button"
                  disabled={refunding === p.id}
                  onClick={() => void refund(p)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
                >
                  {refunding === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5" />
                  )}
                  Refund
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              ),
          },
        ]}
        rows={payments}
      />
    </div>
  );
}
