import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const FREE_BULK_DOWNLOAD_LIMIT = 7;
export const YEARLY_PRICE = 19;
export const LIFETIME_PRICE = 39;

// "monthly" is kept as a readable value only: the $2/month plan is no longer
// sold (removed 2026-10-06), but existing monthly subscribers keep Pro until
// their subscription lapses (the webhook downgrades them to free on
// cancel/expire). Nothing in the UI offers monthly anymore.
type Plan = "free" | "pro" | "monthly" | "yearly" | "lifetime";

interface PlanContextType {
  plan: Plan;
  /** True for active paid subscribers (monthly, yearly, or lifetime). */
  isPro: boolean;
  loading: boolean;
  bulkUsed: number;
  bulkLimit: number;
  bulkRemaining: number;
  canBulkDownload: boolean;
  recordBulkDownload: (meta: { iconCount: number; format: string }) => Promise<void>;
  refresh: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType>({
  plan: "free",
  isPro: false,
  loading: true,
  bulkUsed: 0,
  bulkLimit: FREE_BULK_DOWNLOAD_LIMIT,
  bulkRemaining: FREE_BULK_DOWNLOAD_LIMIT,
  canBulkDownload: true,
  recordBulkDownload: async () => {},
  refresh: async () => {},
});

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [bulkUsed, setBulkUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPlan("free");
      setBulkUsed(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: planRow }, { count }] = await Promise.all([
      supabase.from("user_plans").select("plan").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("download_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("kind", "bulk"),
    ]);
    const rawPlan = planRow?.plan;
    setPlan(
      rawPlan === "pro" || rawPlan === "monthly" || rawPlan === "yearly" || rawPlan === "lifetime"
        ? rawPlan
        : "free",
    );
    setBulkUsed(count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordBulkDownload = useCallback(
    async ({ iconCount, format }: { iconCount: number; format: string }) => {
      if (!user) return;
      setBulkUsed((n) => n + 1);
      await supabase.from("download_events").insert({
        user_id: user.id,
        kind: "bulk",
        icon_count: iconCount,
        format,
      });
    },
    [user],
  );

  const value = useMemo<PlanContextType>(() => {
    const unlimited = plan !== "free";
    const remaining = Math.max(0, FREE_BULK_DOWNLOAD_LIMIT - bulkUsed);
    return {
      plan,
      isPro: unlimited,
      loading,
      bulkUsed,
      bulkLimit: FREE_BULK_DOWNLOAD_LIMIT,
      bulkRemaining: unlimited ? Infinity : remaining,
      canBulkDownload: unlimited || remaining > 0,
      recordBulkDownload,
      refresh,
    };
  }, [plan, loading, bulkUsed, recordBulkDownload, refresh]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export const usePlan = () => useContext(PlanContext);
