import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  Users,
  Lightbulb,
  Mail,
  Loader2,
  RefreshCw,
  Download,
  Settings,
  Activity,
  TrendingUp,
  TrendingDown,
  Trash2,
  Crown,
  Lock,
  Key,
  UserRound,
  MessageSquareQuote,
  LayoutDashboard,
  DollarSign,
  Zap,
  Check,
  X,
  CreditCard,
  TicketPercent,
  LifeBuoy,
  Wrench,
  Newspaper,
  ShieldAlert,
  Share2,
  Megaphone,
  Bug,
  Percent,
} from "lucide-react";
import { DashboardShell, type DashboardNavSection } from "@/components/dashboard/DashboardShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart, LineChart, DonutChart } from "@/components/dashboard/charts";
import { DataTable } from "@/components/dashboard/DataTable";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { CountUp } from "@/components/CountUp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  listAccounts,
  setAccountRole,
  deleteAccount,
  getRoleStatus,
  claimFirstAdmin,
  getOperatingStats,
  listApiKeys,
  setApiKeyRevoked,
  banUser,
  unbanUser,
  setPlan,
  getConversionStats,
  type RecentUserRow,
  type PlanBreakdownRow,
  type AdminApiKeyRow,
  type ConversionStats,
} from "@/lib/admin.functions";
import { downloadCsv, stamp } from "@/lib/csv";
import { UsersTab } from "@/components/admin/UsersTab";
import { TestimonialsTab } from "@/components/admin/TestimonialsTab";
import { PaymentsTab } from "@/components/admin/PaymentsTab";
import { CouponsTab } from "@/components/admin/CouponsTab";
import { SupportTab } from "@/components/admin/SupportTab";
import { ToolsTab } from "@/components/admin/ToolsTab";
import { ChangelogTab } from "@/components/admin/ChangelogTab";
import { TakedownsTab } from "@/components/admin/TakedownsTab";
import { ReferralsTab } from "@/components/admin/ReferralsTab";
import { CampaignsTab } from "@/components/admin/CampaignsTab";
import { ErrorLogsTab } from "@/components/admin/ErrorLogsTab";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel | IconVault" },
      {
        name: "description",
        content:
          "Internal IconVault admin panel: review icon requests, monitor account activity and manage administrator access.",
      },
      { property: "og:title", content: "Admin panel | IconVault" },
      { property: "og:description", content: "Internal IconVault administration dashboard." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

interface Counts {
  profiles: number;
  collections: number;
  favourites: number;
  searches: number;
  requests: number;
  waitlist: number;
}

interface IconRequest {
  id: string;
  icon_name: string | null;
  description: string | null;
  use_case: string | null;
  category: string | null;
  status: string | null;
  created_at: string;
}

interface AccountRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  roles: string[];
  is_owner: boolean;
  plan: string;
  is_banned: boolean;
}

interface SiteSettings {
  site_name: string;
  announcement: string;
  maintenance_mode: boolean;
  signups_enabled: boolean;
  waitlist_open: boolean;
  // Keeps the shape assignable to the database's jsonb column type.
  [key: string]: string | boolean;
}

interface LogRow {
  id: string;
  actor_id: string;
  action: string;
  target: string | null;
  created_at: string;
}

const STATUSES = ["pending", "in_progress", "completed", "rejected"] as const;

type SectionId =
  | "overview"
  | "analytics"
  | "users"
  | "testimonials"
  | "requests"
  | "waitlist"
  | "accounts"
  | "apikeys"
  | "settings"
  | "activity"
  | "payments"
  | "coupons"
  | "support"
  | "tools"
  | "changelog"
  | "takedowns"
  | "referrals"
  | "campaigns"
  | "errorlogs";

const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "The headline numbers, updated every refresh." },
  analytics: { title: "Analytics", subtitle: "Traffic and growth for the last 30 days." },
  users: { title: "Users", subtitle: "Every registered user, searchable and exportable." },
  testimonials: { title: "Testimonials", subtitle: "Moderate the reviews on the homepage." },
  requests: { title: "Icon Requests", subtitle: "Triage what people are asking for." },
  waitlist: { title: "Waitlist", subtitle: "People waiting for Pro to open up." },
  accounts: { title: "Accounts & Roles", subtitle: "Access levels for every account." },
  apikeys: { title: "API Keys", subtitle: "Every issued key, usage and revocation." },
  settings: { title: "Settings", subtitle: "Owner-only controls for the public site." },
  activity: { title: "Activity Log", subtitle: "Every change made from this panel." },
  payments: { title: "Payments", subtitle: "Subscriptions, payments and refunds via Dodo." },
  coupons: { title: "Coupons", subtitle: "Discount codes for Pro." },
  support: { title: "Support", subtitle: "Ticket inbox and replies." },
  tools: { title: "Tools", subtitle: "Enable/disable tools and free limits." },
  changelog: { title: "Changelog", subtitle: "Write release notes for the public page." },
  takedowns: { title: "Takedowns", subtitle: "DMCA and licence takedown requests." },
  referrals: { title: "Referrals", subtitle: "Who invited whom." },
  campaigns: { title: "Campaigns", subtitle: "Newsletter drafts and email counts." },
  errorlogs: { title: "Error Logs", subtitle: "Client errors reported from the site." },
};

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "IconVault",
  announcement: "",
  maintenance_mode: false,
  signups_enabled: true,
  waitlist_open: true,
};

const YEARLY_PRICE = 12;

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

function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [section, setSection] = useState<SectionId>("overview");

  const [counts, setCounts] = useState<Counts | null>(null);
  const [requests, setRequests] = useState<IconRequest[]>([]);
  const [waitlist, setWaitlist] = useState<{ email: string; created_at: string }[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [apiKeys, setApiKeys] = useState<AdminApiKeyRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [events, setEvents] = useState<{ event_type: string; page: string | null }[]>([]);
  const [pageViews, setPageViews] = useState<
    { created_at: string; event_type: string; page: string | null }[]
  >([]);
  const [signupRows, setSignupRows] = useState<{ created_at: string }[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdownRow[]>([]);
  const [freeCount, setFreeCount] = useState(0);
  const [recentUsers, setRecentUsers] = useState<RecentUserRow[]>([]);
  const [conversion, setConversion] = useState<ConversionStats | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchAccounts = useServerFn(listAccounts);
  const changeRole = useServerFn(setAccountRole);
  const removeAccount = useServerFn(deleteAccount);
  const roleStatus = useServerFn(getRoleStatus);
  const claimAdminFn = useServerFn(claimFirstAdmin);
  const fetchOperatingStats = useServerFn(getOperatingStats);
  const fetchApiKeys = useServerFn(listApiKeys);
  const revokeKeyFn = useServerFn(setApiKeyRevoked);
  const banUserFn = useServerFn(banUser);
  const unbanUserFn = useServerFn(unbanUser);
  const setPlanFn = useServerFn(setPlan);
  const fetchConversionStats = useServerFn(getConversionStats);

  const checkRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsOwner(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const status = await roleStatus({ data: undefined });
      setIsAdmin(status.isAdmin);
      setIsOwner(status.isOwner);
    } catch {
      setIsAdmin(false);
      setIsOwner(false);
    }
    setChecking(false);
  }, [user, roleStatus]);

  useEffect(() => {
    if (authLoading) return;
    void checkRole();
  }, [authLoading, checkRole]);

  const loadData = useCallback(async () => {
    setBusy(true);
    const head = { count: "exact" as const, head: true };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [
      profiles,
      collections,
      favourites,
      searches,
      reqCount,
      waitCount,
      reqRows,
      waitRows,
      logRows,
      eventRows,
      pageViewRows,
      profileRows,
      settingsRow,
    ] = await Promise.all([
      supabase.from("profiles").select("*", head),
      supabase.from("icon_collections").select("*", head),
      supabase.from("favourites").select("*", head),
      supabase.from("search_history").select("*", head),
      supabase.from("icon_requests").select("*", head),
      supabase.from("waitlist").select("*", head),
      supabase
        .from("icon_requests")
        .select("id, icon_name, description, use_case, category, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("waitlist")
        .select("email, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("admin_activity_log")
        .select("id, actor_id, action, target, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("analytics_events")
        .select("event_type, page")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("analytics_events")
        .select("created_at, event_type, page")
        .gte("created_at", thirtyDaysAgo)
        .eq("event_type", "page_view")
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase.from("site_settings").select("value").eq("key", "general").maybeSingle(),
    ]);

    setCounts({
      profiles: profiles.count ?? 0,
      collections: collections.count ?? 0,
      favourites: favourites.count ?? 0,
      searches: searches.count ?? 0,
      requests: reqCount.count ?? 0,
      waitlist: waitCount.count ?? 0,
    });
    setRequests((reqRows.data as IconRequest[] | null) ?? []);
    setWaitlist((waitRows.data as { email: string; created_at: string }[] | null) ?? []);
    setLogs((logRows.data as LogRow[] | null) ?? []);
    setEvents((eventRows.data as { event_type: string; page: string | null }[] | null) ?? []);
    setPageViews(
      (pageViewRows.data as { created_at: string; event_type: string; page: string | null }[] | null) ??
        [],
    );
    setSignupRows((profileRows.data as { created_at: string }[] | null) ?? []);
    if (settingsRow.data?.value) {
      setSettings({ ...DEFAULT_SETTINGS, ...(settingsRow.data.value as SiteSettings) });
    }

    try {
      const res = await fetchAccounts({ data: undefined });
      setAccounts(res.accounts);
    } catch {
      /* non-admins never reach here; ignore transient failures */
    }
    try {
      const res = await fetchOperatingStats({ data: undefined });
      setPlanBreakdown(res.planBreakdown);
      setFreeCount(res.freeCount);
      setRecentUsers(res.recentUsers);
    } catch {
      /* operating stats are best-effort */
    }
    try {
      const res = await fetchApiKeys({ data: undefined });
      setApiKeys(res.keys);
    } catch {
      /* api keys are best-effort */
    }
    try {
      const res = await fetchConversionStats({ data: undefined });
      setConversion(res);
    } catch {
      /* conversion stats are best-effort */
    }
    setBusy(false);
  }, [fetchAccounts, fetchOperatingStats, fetchApiKeys, fetchConversionStats]);

  useEffect(() => {
    if (isAdmin) void loadData();
  }, [isAdmin, loadData]);

  const claimAdmin = async () => {
    let claimed = false;
    try {
      claimed = (await claimAdminFn({ data: undefined })).claimed;
    } catch {
      toast.error("Couldn't claim admin access");
      return;
    }
    if (claimed) {
      toast.success("You are now the main admin");
      await checkRole();
    } else {
      toast.error("An admin already exists for this site");
    }
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("icon_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error("Only the site owner can moderate requests");
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    void supabase.from("admin_activity_log").insert({
      actor_id: user?.id ?? "",
      action: "request.status",
      target: id,
      details: { status },
    });
    toast.success(`Request marked ${status.replace("_", " ")}`);
  };

  const deleteRequest = async (id: string) => {
    const { error } = await supabase.from("icon_requests").delete().eq("id", id);
    if (error) {
      toast.error("Only the site owner can delete requests");
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== id));
    toast.success("Request deleted");
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ value: settings })
      .eq("key", "general");
    setSavingSettings(false);
    if (error) {
      toast.error("Only the site owner can change settings");
      return;
    }
    void supabase.from("admin_activity_log").insert({
      actor_id: user?.id ?? "",
      action: "settings.update",
      target: "general",
      details: settings,
    });
    toast.success("Settings saved");
  };

  const toggleRole = async (row: AccountRow, role: "admin" | "moderator") => {
    const grant = !row.roles.includes(role);
    try {
      await changeRole({ data: { userId: row.id, role, grant } });
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === row.id
            ? {
                ...a,
                roles: grant ? [...a.roles, role] : a.roles.filter((r) => r !== role),
              }
            : a,
        ),
      );
      toast.success(`${grant ? "Granted" : "Revoked"} ${role}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Only the owner can manage roles");
    }
  };

  const removeUser = async (row: AccountRow) => {
    if (!window.confirm(`Delete ${row.email ?? "this account"}? This cannot be undone.`)) return;
    try {
      await removeAccount({ data: { userId: row.id } });
      setAccounts((prev) => prev.filter((a) => a.id !== row.id));
      toast.success("Account deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Only the owner can delete accounts");
    }
  };

  const toggleKeyRevoked = async (row: AdminApiKeyRow) => {
    const next = !row.revoked;
    if (
      next &&
      !window.confirm(`Revoke the key "${row.name}"? Existing integrations will stop working.`)
    )
      return;
    try {
      await revokeKeyFn({ data: { keyId: row.id, revoked: next } });
      setApiKeys((prev) => prev.map((k) => (k.id === row.id ? { ...k, revoked: next } : k)));
      toast.success(next ? "Key revoked" : "Key re-enabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Only the owner can manage keys");
    }
  };

  const refreshAccounts = async () => {
    try {
      const res = await fetchAccounts({ data: undefined });
      setAccounts(res.accounts);
    } catch {
      /* refresh is best-effort; the error toast already fired */
    }
  };

  const handleBan = async (userId: string, reason: string | null) => {
    try {
      await banUserFn({
        data: { userId, ...(reason != null ? { reason } : {}) },
      });
      toast.success("User banned");
      await refreshAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Only the owner can ban users");
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await unbanUserFn({ data: { userId } });
      toast.success("User unbanned");
      await refreshAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Only the owner can unban users");
    }
  };

  const handlePlanChange = async (userId: string, plan: "free" | "pro") => {
    try {
      await setPlanFn({ data: { userId, plan } });
      toast.success(`Plan set to ${plan}`);
      await refreshAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Only the owner can change plans");
    }
  };

  const eventSummary = useMemo(() => {
    const byType = new Map<string, number>();
    const byPage = new Map<string, number>();
    events.forEach((e) => {
      byType.set(e.event_type, (byType.get(e.event_type) ?? 0) + 1);
      if (e.page) byPage.set(e.page, (byPage.get(e.page) ?? 0) + 1);
    });
    const top = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { types: top(byType), pages: top(byPage) };
  }, [events]);

  /** 30-day analytics aggregates: daily series, top pages, top tools. */
  const analytics = useMemo(() => {
    const days: { date: string; label: string; views: number; signups: number }[] = [];
    const index = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      index.set(key, days.length);
      days.push({
        date: key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        views: 0,
        signups: 0,
      });
    }
    pageViews.forEach((p) => {
      const pos = index.get(p.created_at.slice(0, 10));
      if (pos !== undefined) days[pos]!.views += 1;
    });
    signupRows.forEach((s) => {
      const pos = index.get(s.created_at.slice(0, 10));
      if (pos !== undefined) days[pos]!.signups += 1;
    });

    const pageCounts = new Map<string, number>();
    const toolCounts = new Map<string, number>();
    let proViews = 0;
    pageViews.forEach((p) => {
      if (!p.page) return;
      pageCounts.set(p.page, (pageCounts.get(p.page) ?? 0) + 1);
      if (p.page === "/pro") proViews += 1;
      if (p.page.startsWith("/tools/")) {
        const slug = p.page.slice("/tools/".length).split(/[?#]/)[0] || "(index)";
        toolCounts.set(slug, (toolCounts.get(slug) ?? 0) + 1);
      }
    });
    const topTen = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, views]) => ({ name, views }));

    return {
      days,
      topPages: topTen(pageCounts),
      topTools: topTen(toolCounts),
      totalViews: pageViews.length,
      proViews,
      hasData: pageViews.length > 0 || signupRows.length > 0,
    };
  }, [pageViews, signupRows]);

  const yearlyCount = useMemo(
    () => planBreakdown.find((p) => p.plan === "yearly")?.count ?? 0,
    [planBreakdown],
  );

  const yearlyRevenue = yearlyCount * YEARLY_PRICE;
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );
  const apiCallsMonth = useMemo(
    () => apiKeys.reduce((s, k) => s + (k.used_this_month ?? 0), 0),
    [apiKeys],
  );

  /** Signups per day for the last 14 days (bar chart). */
  const signupSeries = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const value = signupRows.filter((s) => s.created_at.slice(0, 10) === key).length;
      out.push({ label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), value });
    }
    return out;
  }, [signupRows]);

  const planDonut = useMemo(
    () => [
      { label: "Free", value: freeCount },
      ...planBreakdown.map((p) => ({ label: p.plan, value: p.count })),
    ],
    [freeCount, planBreakdown],
  );

  const navSections: DashboardNavSection[] = useMemo(
    () => [
      {
        title: "Main",
        items: [
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "analytics", label: "Analytics", icon: TrendingUp },
        ],
      },
      {
        title: "Manage",
        items: [
          { id: "users", label: "Users", icon: UserRound },
          {
            id: "testimonials",
            label: "Testimonials",
            icon: MessageSquareQuote,
          },
          {
            id: "requests",
            label: "Icon Requests",
            icon: Lightbulb,
            badge: pendingRequests > 0 ? pendingRequests : undefined,
          },
          { id: "waitlist", label: "Waitlist", icon: Mail, badge: counts?.waitlist || undefined },
          { id: "accounts", label: "Accounts", icon: Users },
          { id: "payments", label: "Payments", icon: CreditCard },
          { id: "coupons", label: "Coupons", icon: TicketPercent },
          { id: "support", label: "Support", icon: LifeBuoy },
          { id: "tools", label: "Tools", icon: Wrench },
        ],
      },
      {
        title: "Content",
        items: [
          { id: "changelog", label: "Changelog", icon: Newspaper },
          { id: "takedowns", label: "Takedowns", icon: ShieldAlert },
        ],
      },
      {
        title: "Marketing",
        items: [
          { id: "referrals", label: "Referrals", icon: Share2 },
          { id: "campaigns", label: "Campaigns", icon: Megaphone },
        ],
      },
      {
        title: "System",
        items: [
          { id: "apikeys", label: "API Keys", icon: Key, badge: apiKeys.length || undefined },
          { id: "errorlogs", label: "Error Logs", icon: Bug },
          { id: "settings", label: "Settings", icon: Settings },
          { id: "activity", label: "Activity Log", icon: Activity },
        ],
      },
    ],
    [pendingRequests, counts?.waitlist, apiKeys.length],
  );

  const activeMeta = SECTION_TITLES[section];
  const displayName = user?.email?.split("@")[0] ?? "Admin";

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Verifying permissions…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Admin panel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area uses a separate owner sign-in, kept apart from customer accounts.
          </p>
          <Link
            to="/admin-login"
            className="focus-ring mt-6 inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Go to admin sign-in
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account doesn't have administrator access. If you are the site owner and no admin
            has been assigned yet, you can claim the main admin role once.
          </p>
          <button
            type="button"
            onClick={() => void claimAdmin()}
            className="focus-ring mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Claim admin access
          </button>
        </div>
      </div>
    );
  }

  const ReadOnlyNote = () =>
    isOwner ? null : (
      <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Read-only: only the site owner can make changes here.
      </p>
    );

  const pillBtn =
    "focus-ring inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary";

  return (
    <DashboardShell
      sidebarSections={navSections}
      activeId={section}
      onNavigate={(id) => setSection(id as SectionId)}
      title={activeMeta.title}
      subtitle={activeMeta.subtitle}
      actions={
        <>
          <span
            className={cn(
              "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:inline-flex",
              isOwner
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {isOwner ? <Crown className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {isOwner ? "Site owner" : "Administrator"}
          </span>
          <button type="button" onClick={() => void loadData()} className={pillBtn} aria-label="Refresh data">
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </>
      }
      userMenu={{
        name: displayName,
        email: user.email ?? undefined,
        profileTo: "/profile",
        onSignOut: () => {
          void supabase.auth.signOut().then(() => navigate({ to: "/" }));
        },
      }}
    >
      {section === "overview" && (
        <div className="grid gap-4">
          <WelcomeBanner
            title={`Welcome back, ${displayName}`}
            subtitle="Here is what is happening across IconVault today. Track growth, revenue and engagement at a glance."
            meta={
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  All systems live
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </span>
              </>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StatCard
              label="Total users"
              value={<CountUp value={counts?.profiles ?? 0} />}
              icon={Users}
              sparkline={signupSeries.map((d) => d.value)}
              deltaLabel="signups, last 14 days"
            />
            <StatCard
              label="Pro members"
              value={<CountUp value={yearlyCount} />}
              icon={Crown}
              iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            />
            <StatCard
              label="Conversion rate"
              value={`${conversion?.conversion_pct ?? 0}%`}
              deltaLabel="pro members of all users"
              icon={Percent}
              iconClassName="bg-chart-2/15 text-chart-2"
            />
            <StatCard
              label="Churn"
              value={`${conversion?.churn_pct ?? 0}%`}
              deltaLabel="cancelled of all subscriptions"
              icon={TrendingDown}
              iconClassName="bg-destructive/10 text-destructive"
            />
            <StatCard
              label="API calls this month"
              value={<CountUp value={apiCallsMonth} />}
              icon={Zap}
              iconClassName="bg-chart-3/15 text-chart-3"
            />
            <StatCard
              label="Pending requests"
              value={<CountUp value={pendingRequests} />}
              icon={Lightbulb}
              iconClassName="bg-accent-soft text-accent"
            />
            <StatCard
              label="Yearly revenue"
              value={`$${yearlyRevenue.toLocaleString()}`}
              deltaLabel="per year"
              icon={DollarSign}
              iconClassName="bg-success/15 text-success"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Signups, last 14 days
              </p>
              <div className="mt-4">
                {signupRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No signups yet.</p>
                ) : (
                  <BarChart data={signupSeries} ariaLabel="Signups per day for the last 14 days" />
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Plan breakdown
              </p>
              <div className="mt-4">
                {freeCount === 0 && planBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <DonutChart segments={planDonut} ariaLabel="User plan breakdown" />
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Free means registered accounts with no paid plan row.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold">Newest accounts</h2>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `iconvault-recent-users-${stamp()}.csv`,
                      ["Email", "Plan", "Joined"],
                      recentUsers.map((u) => [u.email, u.plan, u.created_at]),
                    )
                  }
                  className={pillBtn}
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
              <DataTable<RecentUserRow>
                columns={[
                  {
                    key: "email",
                    header: "Email",
                    render: (u) => (
                      <span className="block max-w-[180px] truncate">{u.email ?? u.id}</span>
                    ),
                  },
                  {
                    key: "plan",
                    header: "Plan",
                    render: (u) => (
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold capitalize text-muted-foreground">
                        {u.plan}
                      </span>
                    ),
                  },
                  {
                    key: "joined",
                    header: "Joined",
                    className: "whitespace-nowrap",
                    render: (u) => (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {fmtDate(u.created_at)}
                      </span>
                    ),
                  },
                ]}
                rows={recentUsers.slice(0, 8)}
                emptyText="No accounts yet."
                minWidth={420}
              />
            </div>
            <div>
              <h2 className="mb-3 font-display text-base font-semibold">Recent activity</h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {logs.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    No admin activity recorded yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {logs.slice(0, 8).map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          <Activity className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs text-foreground">{l.action}</p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {l.target ?? ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {new Date(l.created_at).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {section === "analytics" && (
        <div className="grid gap-4">
          {!analytics.hasData ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
              No data yet. Only visits where the cookie banner was accepted are recorded.
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Page views, last 30 days
                  </p>
                  <div className="mt-4">
                    <LineChart
                      data={analytics.days.map((d) => d.views)}
                      labels={analytics.days.map((d) => d.label)}
                      ariaLabel="Page views per day for the last 30 days"
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Signups, last 30 days
                  </p>
                  <div className="mt-4">
                    <LineChart
                      data={analytics.days.map((d) => d.signups)}
                      labels={analytics.days.map((d) => d.label)}
                      ariaLabel="Signups per day for the last 30 days"
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Counted from new profiles: the site does not write a signup event to the
                    analytics table.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top pages, last 30 days
                  </p>
                  <div className="mt-4">
                    {analytics.topPages.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
                    ) : (
                      <BarChart
                        data={analytics.topPages.map((p) => ({ label: p.name, value: p.views }))}
                        ariaLabel="Top pages by views"
                      />
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top tools, last 30 days
                  </p>
                  <div className="mt-4">
                    {analytics.topTools.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
                    ) : (
                      <BarChart
                        data={analytics.topTools.map((t) => ({ label: t.name, value: t.views }))}
                        ariaLabel="Top tools by views"
                      />
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Derived from page views on paths starting with /tools/.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top events
                  </p>
                  {eventSummary.types.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nothing recorded yet.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-border">
                      {eventSummary.types.map(([label, count]) => (
                        <li key={label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                          <span className="truncate font-mono text-xs text-muted-foreground">{label}</span>
                          <span className="tabular-nums">{count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Trial conversion proxy
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Free trial usage lives only in each visitor's browser, so real trial-to-paid
                    conversion cannot be measured server-side. As a proxy,{" "}
                    <span className="font-medium text-foreground">
                      <CountUp value={analytics.proViews} />
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      <CountUp value={analytics.totalViews} />
                    </span>{" "}
                    page views landed on the /pro pricing page.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {section === "users" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <UsersTab
            users={accounts}
            {...(isOwner
              ? { onBan: handleBan, onUnban: handleUnban, onPlanChange: handlePlanChange }
              : {})}
          />
        </div>
      )}

      {section === "testimonials" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <TestimonialsTab />
        </div>
      )}

      {section === "requests" && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReadOnlyNote />
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `iconvault-icon-requests-${stamp()}.csv`,
                  ["Icon name", "Description", "Use case", "Category", "Status", "Created"],
                  requests.map((r) => [
                    r.icon_name,
                    r.description,
                    r.use_case,
                    r.category,
                    r.status,
                    r.created_at,
                  ]),
                )
              }
              className={pillBtn}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {requests.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {r.icon_name ?? "Untitled"}
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[10px]",
                            r.status === "pending"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : r.status === "completed"
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {(r.status ?? "pending").replace("_", " ")}
                        </span>
                      </p>
                      {r.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={!isOwner}
                          onClick={() => void setStatus(r.id, s)}
                          className={cn(
                            "focus-ring rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors disabled:opacity-50",
                            r.status === s
                              ? "border-primary/40 bg-primary-soft text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {s.replace("_", " ")}
                        </button>
                      ))}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => void deleteRequest(r.id)}
                          aria-label="Delete request"
                          className="focus-ring rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {section === "waitlist" && (
        <div className="grid gap-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `iconvault-waitlist-${stamp()}.csv`,
                  ["Email", "Joined"],
                  waitlist.map((w) => [w.email, w.created_at]),
                )
              }
              className={pillBtn}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <DataTable<{ id: string; email: string; created_at: string }>
            columns={[
              {
                key: "email",
                header: "Email",
                render: (w) => <span className="truncate">{w.email}</span>,
              },
              {
                key: "joined",
                header: "Joined",
                className: "whitespace-nowrap",
                render: (w) => (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {fmtDate(w.created_at)}
                  </span>
                ),
              },
            ]}
            rows={waitlist.map((w) => ({ id: w.email, ...w }))}
            emptyText="Nobody on the waitlist yet."
          />
        </div>
      )}

      {section === "accounts" && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReadOnlyNote />
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `iconvault-accounts-${stamp()}.csv`,
                  ["Email", "Name", "Roles", "Created", "Last sign in"],
                  accounts.map((a) => [
                    a.email,
                    a.display_name,
                    a.roles.join(" "),
                    a.created_at,
                    a.last_sign_in_at,
                  ]),
                )
              }
              className={pillBtn}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {accounts.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No accounts loaded.</p>
            ) : (
              <ul className="divide-y divide-border">
                {accounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary">
                      {(a.display_name ?? a.email ?? "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {a.display_name ?? a.email ?? "Account"}
                        {a.is_owner && <Crown className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {a.email ?? a.id} ·{" "}
                        {a.last_sign_in_at
                          ? `last seen ${fmtDate(a.last_sign_in_at)}`
                          : "never signed in"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(["admin", "moderator"] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          disabled={!isOwner || a.is_owner}
                          onClick={() => void toggleRole(a, role)}
                          className={cn(
                            "focus-ring rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors disabled:opacity-50",
                            a.roles.includes(role)
                              ? "border-primary/40 bg-primary-soft text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {role}
                        </button>
                      ))}
                      {isOwner && !a.is_owner && (
                        <button
                          type="button"
                          onClick={() => void removeUser(a)}
                          aria-label="Delete account"
                          className="focus-ring rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {section === "apikeys" && (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total keys" value={<CountUp value={apiKeys.length} />} icon={Key} />
            <StatCard
              label="Calls this month"
              value={<CountUp value={apiCallsMonth} />}
              icon={Zap}
              iconClassName="bg-chart-3/15 text-chart-3"
            />
            <StatCard
              label="Revoked"
              value={<CountUp value={apiKeys.filter((k) => k.revoked).length} />}
              icon={Lock}
              iconClassName="bg-destructive/10 text-destructive"
            />
          </div>
          <ReadOnlyNote />
          <DataTable<AdminApiKeyRow>
            columns={[
              {
                key: "name",
                header: "Key",
                render: (k) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium">{k.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {k.key_prefix}… · {k.user_email ?? k.user_id.slice(0, 8)}
                    </p>
                  </div>
                ),
              },
              {
                key: "usage",
                header: "Usage",
                render: (k) => {
                  const pct = k.monthly_quota > 0 ? Math.min(100, Math.round((k.used_this_month / k.monthly_quota) * 100)) : 0;
                  return (
                    <div className="min-w-[140px]">
                      <p className="text-xs tabular-nums">
                        {k.used_this_month.toLocaleString()} / {k.monthly_quota.toLocaleString()}
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", pct >= 90 ? "bg-destructive" : "bg-primary")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "status",
                header: "Status",
                render: (k) => (
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                      k.revoked
                        ? "bg-destructive/10 text-destructive"
                        : "bg-success/15 text-success",
                    )}
                  >
                    {k.revoked ? "Revoked" : "Active"}
                  </span>
                ),
              },
              {
                key: "created",
                header: "Created",
                className: "whitespace-nowrap",
                render: (k) => (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {fmtDate(k.created_at)}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                className: "whitespace-nowrap text-right",
                render: (k) => (
                  <button
                    type="button"
                    disabled={!isOwner}
                    onClick={() => void toggleKeyRevoked(k)}
                    className={cn(
                      "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                      k.revoked
                        ? "border-success/40 text-success hover:bg-success/10"
                        : "border-destructive/40 text-destructive hover:bg-destructive/10",
                    )}
                  >
                    {k.revoked ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Re-enable
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" /> Revoke
                      </>
                    )}
                  </button>
                ),
              },
            ]}
            rows={apiKeys}
            emptyText="No API keys issued yet."
            minWidth={720}
          />
        </div>
      )}

      {section === "settings" && (
        <div className="grid gap-4">
          <ReadOnlyNote />
          <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
            <label className="block text-sm font-medium" htmlFor="site-name">
              Site name
            </label>
            <input
              id="site-name"
              value={settings.site_name}
              disabled={!isOwner}
              onChange={(e) => setSettings((s) => ({ ...s, site_name: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 disabled:opacity-60"
            />

            <label className="mt-6 block text-sm font-medium" htmlFor="announcement">
              Announcement banner text
            </label>
            <textarea
              id="announcement"
              rows={3}
              value={settings.announcement}
              disabled={!isOwner}
              onChange={(e) => setSettings((s) => ({ ...s, announcement: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 disabled:opacity-60"
            />

            <div className="mt-6 grid gap-3">
              {(
                [
                  ["maintenance_mode", "Maintenance mode"],
                  ["signups_enabled", "Allow new sign-ups"],
                  ["waitlist_open", "Pro waitlist open"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
                >
                  {label}
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    disabled={!isOwner}
                    onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                </label>
              ))}
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={savingSettings}
                className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
              </button>
            )}
          </div>
        </div>
      )}

      {section === "activity" && (
        <div className="grid gap-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `iconvault-admin-activity-${stamp()}.csv`,
                  ["Action", "Target", "Actor", "When"],
                  logs.map((l) => [l.action, l.target, l.actor_id, l.created_at]),
                )
              }
              className={pillBtn}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {logs.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No admin activity recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {logs.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Activity className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-foreground">{l.action}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {l.target ?? ""} · actor {l.actor_id.slice(0, 8)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {new Date(l.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {section === "payments" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <PaymentsTab />
        </div>
      )}

      {section === "coupons" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <CouponsTab />
        </div>
      )}

      {section === "support" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <SupportTab />
        </div>
      )}

      {section === "tools" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ToolsTab />
        </div>
      )}

      {section === "changelog" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ChangelogTab />
        </div>
      )}

      {section === "takedowns" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <TakedownsTab />
        </div>
      )}

      {section === "referrals" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ReferralsTab />
        </div>
      )}

      {section === "campaigns" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <CampaignsTab />
        </div>
      )}

      {section === "errorlogs" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ErrorLogsTab />
        </div>
      )}
    </DashboardShell>
  );
}
