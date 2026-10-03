import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Info, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { getReferrals, type ReferralRow } from "@/lib/admin.tabs.functions";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { DonutChart } from "@/components/dashboard/charts";
import { cn } from "@/lib/utils";

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

function Pill({ status }: { status: string }) {
  const cls =
    status === "completed"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
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

/** Referral program overview: who invited whom, and conversion status. */
export function ReferralsTab() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useServerFn(getReferrals);

  const load = async () => {
    setLoading(true);
    try {
      const { referrals } = await fetchAll({ data: undefined });
      setReferrals(referrals);
    } catch {
      toast.error("Could not load referrals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading referrals…
      </div>
    );
  }

  const pending = referrals.filter((r) => r.status === "pending").length;
  const completed = referrals.filter((r) => r.status !== "pending").length;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total referrals" value={referrals.length} icon={Users} />
        <StatCard label="Pending" value={pending} icon={Clock} />
        {completed > 0 && <StatCard label="Completed" value={completed} icon={CheckCircle2} />}
      </div>

      {referrals.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-bold">Referrals by status</h3>
          <div className="max-w-xs">
            <DonutChart
              ariaLabel="Referrals by status"
              segments={[
                { label: "Pending", value: pending, color: "var(--chart-4)" },
                { label: "Completed", value: completed, color: "var(--chart-1)" },
              ]}
            />
          </div>
        </div>
      )}

      <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        All referrals
      </h3>
      <DataTable<ReferralRow>
        minWidth={680}
        emptyText="No referrals yet. Shared links will show up here once users start inviting."
        columns={[
          { key: "referrer", header: "Referrer", render: (r) => r.referrer_email },
          { key: "referred", header: "Referred", render: (r) => r.referred_email },
          { key: "status", header: "Status", render: (r) => <Pill status={r.status} /> },
          { key: "date", header: "Date", render: (r) => fmtDate(r.created_at) },
        ]}
        rows={referrals}
      />

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Users share links like iconvault.site/?ref=&lt;their-user-id&gt;. Visits are captured
        automatically.
      </p>
    </div>
  );
}
