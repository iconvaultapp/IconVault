import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listCoupons,
  createCoupon,
  toggleCoupon,
  deleteCoupon,
  type CouponRow,
} from "@/lib/admin.tabs.functions";
import { DataTable } from "@/components/dashboard/DataTable";
import { cn } from "@/lib/utils";

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

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

const inputCls =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50";

/** Discount coupon management: create, enable/disable, delete. */
export function CouponsTab() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAll = useServerFn(listCoupons);
  const createFn = useServerFn(createCoupon);
  const toggleFn = useServerFn(toggleCoupon);
  const deleteFn = useServerFn(deleteCoupon);

  const load = async () => {
    setLoading(true);
    try {
      const { coupons } = await fetchAll({ data: undefined });
      setCoupons(coupons);
    } catch {
      toast.error("Could not load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    const pctNum = Math.round(Number(pct));
    if (!code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (!Number.isFinite(pctNum) || pctNum < 1 || pctNum > 100) {
      toast.error("Discount must be between 1 and 100");
      return;
    }
    setCreating(true);
    try {
      await createFn({
        data: {
          code: code.trim().toUpperCase(),
          discount_percent: pctNum,
          max_uses: maxUses.trim() ? Number(maxUses) : null,
          expires_at: expires ? new Date(expires).toISOString() : null,
        },
      });
      toast.success(`Coupon ${code.trim().toUpperCase()} created`);
      setCode("");
      setPct("10");
      setMaxUses("");
      setExpires("");
      await load();
    } catch {
      toast.error("Could not create coupon (code may already exist)");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (c: CouponRow) => {
    try {
      const { ok } = await toggleFn({ data: { id: c.id, active: !c.is_active } });
      if (ok) {
        setCoupons((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)),
        );
        toast.success(c.is_active ? "Coupon disabled" : "Coupon enabled");
      } else toast.error("Could not update coupon");
    } catch {
      toast.error("Could not update coupon");
    }
  };

  const remove = async (c: CouponRow) => {
    if (!window.confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    try {
      const { ok } = await deleteFn({ data: { id: c.id } });
      if (ok) {
        setCoupons((prev) => prev.filter((x) => x.id !== c.id));
        toast.success("Coupon deleted");
      } else toast.error("Could not delete coupon");
    } catch {
      toast.error("Could not delete coupon");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading coupons…
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Ticket className="h-4 w-4 text-primary" /> Create coupon
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              maxLength={32}
              className={cn(inputCls, "font-mono uppercase")}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Discount %</span>
            <input
              type="number"
              min={1}
              max={100}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Max uses (optional)</span>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Expires (optional)</span>
            <input
              type="datetime-local"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className={inputCls}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={creating}
              onClick={() => void create()}
              className="focus-ring inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60 sm:w-auto"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create
            </button>
          </div>
        </div>
      </div>

      <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        All coupons ({coupons.length})
      </h3>
      <DataTable<CouponRow>
        minWidth={760}
        emptyText="No coupons yet. Create one above to offer a discount."
        columns={[
          {
            key: "code",
            header: "Code",
            render: (c) => <span className="font-mono text-xs font-bold">{c.code}</span>,
          },
          {
            key: "pct",
            header: "Discount",
            render: (c) => <span className="tabular-nums">{c.discount_percent}%</span>,
          },
          {
            key: "max",
            header: "Max uses",
            render: (c) => (c.max_uses == null ? "Unlimited" : c.max_uses),
          },
          { key: "used", header: "Used", render: (c) => c.used_count },
          { key: "expires", header: "Expires", render: (c) => fmtDate(c.expires_at) },
          {
            key: "active",
            header: "Active",
            render: (c) => (
              <Toggle
                on={c.is_active}
                onChange={() => void toggle(c)}
                label={`Toggle coupon ${c.code}`}
              />
            ),
          },
          {
            key: "action",
            header: "Delete",
            render: (c) => (
              <button
                type="button"
                onClick={() => void remove(c)}
                aria-label={`Delete coupon ${c.code}`}
                className="focus-ring rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ),
          },
        ]}
        rows={coupons}
      />
    </div>
  );
}
