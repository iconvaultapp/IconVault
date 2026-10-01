import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  Users,
  FolderOpen,
  Heart,
  Search,
  Lightbulb,
  Mail,
  Loader2,
  RefreshCw,
  Download,
  Settings,
  Activity,
  BarChart3,
  Trash2,
  Crown,
  Lock,
  TrendingUp,
  Wrench,
  LayoutGrid,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import PageShell from "@/components/PageShell";
import { Stack, SectionHeading } from "@/components/kit";
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
  type RecentUserRow,
  type PlanBreakdownRow,
} from "@/lib/admin.functions";
import { LIVE_TOOLS } from "@/lib/tool-catalog";
import { downloadCsv, stamp } from "@/lib/csv";
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

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "requests", label: "Requests", icon: Lightbulb },
  { id: "waitlist", label: "Waitlist", icon: Mail },
  { id: "accounts", label: "Accounts", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "activity", label: "Activity", icon: Activity },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "IconVault",
  announcement: "",
  maintenance_mode: false,
  signups_enabled: true,
  waitlist_open: true,
};

const pill =
  "focus-ring inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary";

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");

  const [counts, setCounts] = useState<Counts | null>(null);
  const [requests, setRequests] = useState<IconRequest[]>([]);
  const [waitlist, setWaitlist] = useState<{ email: string; created_at: string }[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [events, setEvents] = useState<{ event_type: string; page: string | null }[]>([]);
  const [pageViews, setPageViews] = useState<
    { created_at: string; event_type: string; page: string | null }[]
  >([]);
  const [signupRows, setSignupRows] = useState<{ created_at: string }[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdownRow[]>([]);
  const [freeCount, setFreeCount] = useState(0);
  const [recentUsers, setRecentUsers] = useState<RecentUserRow[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchAccounts = useServerFn(listAccounts);
  const changeRole = useServerFn(setAccountRole);
  const removeAccount = useServerFn(deleteAccount);
  const roleStatus = useServerFn(getRoleStatus);
  const claimAdminFn = useServerFn(claimFirstAdmin);
  const fetchOperatingStats = useServerFn(getOperatingStats);

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
    setBusy(false);
  }, [fetchAccounts, fetchOperatingStats]);

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

  const proViewPct = useMemo(
    () =>
      analytics.totalViews > 0
        ? Math.round((analytics.proViews / analytics.totalViews) * 1000) / 10
        : 0,
    [analytics],
  );

  if (authLoading || checking) {
    return (
      <PageShell eyebrow="Admin" title="Admin panel" description="Checking your access…">
        <div className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Verifying permissions…
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell
        eyebrow="Admin"
        title="Admin panel"
        description="This area uses a separate owner sign-in, kept apart from customer accounts."
      >
        <Link
          to="/admin-login"
          className="focus-ring inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Go to admin sign-in
        </Link>
      </PageShell>
    );
  }


  if (!isAdmin) {
    return (
      <PageShell
        eyebrow="Admin"
        title="Restricted area"
        description="This account doesn't have administrator access."
      >
        <div className="surface-card max-w-xl p-6">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            If you are the site owner and no admin has been assigned yet, you can claim the main
            admin role once. After that, only existing admins can grant access.
          </p>
          <button
            type="button"
            onClick={() => void claimAdmin()}
            className="focus-ring mt-5 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Claim admin access
          </button>
        </div>
      </PageShell>
    );
  }

  const stats = [
    { icon: Users, label: "Accounts", value: counts?.profiles ?? 0 },
    { icon: FolderOpen, label: "Collections", value: counts?.collections ?? 0 },
    { icon: Heart, label: "Favourites", value: counts?.favourites ?? 0 },
    { icon: Search, label: "Searches", value: counts?.searches ?? 0 },
    { icon: Lightbulb, label: "Icon requests", value: counts?.requests ?? 0 },
    { icon: Mail, label: "Waitlist", value: counts?.waitlist ?? 0 },
  ];

  const ownerStats = [
    { icon: Wrench, label: "Live tools", value: LIVE_TOOLS.length },
    { icon: LayoutGrid, label: "Icon sets", value: counts?.collections ?? 0 },
    { icon: Users, label: "Registered users", value: counts?.profiles ?? 0 },
    { icon: Crown, label: "Yearly subscribers", value: yearlyCount },
  ];

  const ReadOnlyNote = () =>
    isOwner ? null : (
      <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Read-only - only the site owner can make changes here.
      </p>
    );

  return (
    <PageShell
      wide
      eyebrow="Admin"
      title="Admin panel"
      description="Site-wide activity, icon request moderation, accounts and settings in one place."
    >
      <Stack>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
              isOwner
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {isOwner ? <Crown className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {isOwner ? "Site owner - full control" : "Administrator - read-only"}
          </span>
          <button type="button" onClick={() => void loadData()} className={pill}>
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} /> Refresh
          </button>
        </div>

        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-1.5 px-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                  tab === t.id
                    ? "border-primary/40 bg-primary-soft text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "overview" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="surface-card p-5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <s.icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-4 font-display text-3xl font-semibold tabular-nums">
                    <CountUp value={s.value} />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div>
              <SectionHeading
                eyebrow="Business"
                title="Site at a glance"
                description="The headline numbers an owner checks every day: product size, audience and paying plans."
              />
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ownerStats.map((s) => (
                  <div key={s.label} className="surface-card p-5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                      <s.icon className="h-4.5 w-4.5" />
                    </span>
                    <p className="mt-4 font-display text-3xl font-semibold tabular-nums">
                      <CountUp value={s.value} />
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="surface-card p-5">
                  <p className="eyebrow">Plan breakdown</p>
                  {freeCount === 0 && planBreakdown.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-border">
                      <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="text-muted-foreground">Free</span>
                        <span className="tabular-nums">{freeCount}</span>
                      </li>
                      {planBreakdown.map((p) => (
                        <li
                          key={p.plan}
                          className="flex items-center justify-between gap-3 py-2.5 text-sm"
                        >
                          <span className="inline-flex items-center gap-2 capitalize text-muted-foreground">
                            <Crown className="h-3.5 w-3.5 text-primary" />
                            {p.plan}
                          </span>
                          <span className="tabular-nums">{p.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Free = registered accounts with no paid plan row.
                  </p>
                </div>

                <div className="surface-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow">Newest accounts</p>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          `iconvault-recent-users-${stamp()}.csv`,
                          ["Email", "Plan", "Joined"],
                          recentUsers.map((u) => [u.email, u.plan, u.created_at]),
                        )
                      }
                      className={pill}
                    >
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                  </div>
                  {recentUsers.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-border">
                      {recentUsers.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center justify-between gap-3 py-2.5 text-sm"
                        >
                          <span className="min-w-0 truncate">{u.email ?? u.id}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] capitalize text-muted-foreground">
                              {u.plan}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString()}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div>
              <SectionHeading
                eyebrow="Analytics"
                title="What people are doing"
                description="A rolling read on the most recent 500 recorded events."
              />
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                {[
                  { title: "Top events", rows: eventSummary.types },
                  { title: "Top pages", rows: eventSummary.pages },
                ].map((block) => (
                  <div key={block.title} className="surface-card p-5">
                    <p className="eyebrow">{block.title}</p>
                    {block.rows.length === 0 ? (
                      <p className="mt-4 text-sm text-muted-foreground">Nothing recorded yet.</p>
                    ) : (
                      <ul className="mt-4 divide-y divide-border">
                        {block.rows.map(([label, count]) => (
                          <li
                            key={label}
                            className="flex items-center justify-between gap-3 py-2.5 text-sm"
                          >
                            <span className="truncate font-mono text-xs text-muted-foreground">
                              {label}
                            </span>
                            <span className="tabular-nums">{count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `iconvault-admin-overview-${stamp()}.csv`,
                      ["Metric", "Value"],
                      stats.map((s) => [s.label, s.value]),
                    )
                  }
                  className={pill}
                >
                  <Download className="h-3.5 w-3.5" /> Export overview CSV
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "analytics" && (
          <div>
            <SectionHeading
              eyebrow="Analytics"
              title="Traffic and growth"
              description="Page views and signups for the last 30 days. Only visits where the cookie banner was accepted are recorded."
            />
            {!analytics.hasData ? (
              <p className="surface-card mt-8 p-8 text-center text-sm text-muted-foreground">
                No data yet.
              </p>
            ) : (
              <>
                <div className="mt-8 grid gap-4 lg:grid-cols-2">
                  <div className="surface-card p-5">
                    <p className="eyebrow">Page views, last 30 days</p>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={analytics.days}
                          margin={{ top: 5, right: 8, bottom: 0, left: -12 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            interval={6}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                          <Area
                            type="monotone"
                            dataKey="views"
                            name="Views"
                            stroke="#0F766E"
                            strokeWidth={2}
                            fill="#0F766E"
                            fillOpacity={0.16}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="surface-card p-5">
                    <p className="eyebrow">Signups, last 30 days</p>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analytics.days}
                          margin={{ top: 5, right: 8, bottom: 0, left: -12 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            interval={6}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                          <Line
                            type="monotone"
                            dataKey="signups"
                            name="Signups"
                            stroke="#0F766E"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Counted from new profiles: the site does not write a signup event to the
                      analytics table.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="surface-card p-5">
                    <p className="eyebrow">Top pages, last 30 days</p>
                    {analytics.topPages.length === 0 ? (
                      <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
                    ) : (
                      <div className="mt-4 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={analytics.topPages}
                            layout="vertical"
                            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                              stroke="hsl(var(--border))"
                            />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={150}
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v: string) =>
                                v.length > 24 ? `${v.slice(0, 23)}…` : v
                              }
                            />
                            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                            <Bar
                              dataKey="views"
                              name="Views"
                              fill="#0F766E"
                              radius={[0, 6, 6, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="surface-card p-5">
                    <p className="eyebrow">Top tools, last 30 days</p>
                    {analytics.topTools.length === 0 ? (
                      <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
                    ) : (
                      <div className="mt-4 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={analytics.topTools}
                            layout="vertical"
                            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                              stroke="hsl(var(--border))"
                            />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={150}
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v: string) =>
                                v.length > 24 ? `${v.slice(0, 23)}…` : v
                              }
                            />
                            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                            <Bar
                              dataKey="views"
                              name="Views"
                              fill="#0F766E"
                              radius={[0, 6, 6, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Derived from page views on paths starting with /tools/.
                    </p>
                  </div>
                </div>

                <div className="surface-card mt-4 p-5">
                  <p className="eyebrow">Trial conversion proxy</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Free trial usage is stored only in each visitor's browser, so real
                    trial-to-paid conversion cannot be measured server-side. As a proxy, over
                    the last 30 days{" "}
                    <span className="font-medium text-foreground">
                      <CountUp value={analytics.proViews} />
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      <CountUp value={analytics.totalViews} />
                    </span>{" "}
                    page views ({proViewPct}%) landed on the /pro pricing page.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "requests" && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Moderation"
                title="Icon requests"
                description="Triage what people are asking for and move each request through the queue."
              />
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
                className={pill}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
            <ReadOnlyNote />
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
              {requests.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No requests yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {requests.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.icon_name ?? "Untitled"}</p>
                        {r.description && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {r.description}
                          </p>
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

        {tab === "waitlist" && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Growth"
                title="Pro waitlist"
                description="The most recent people who asked to be told when Pro opens up."
              />
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `iconvault-waitlist-${stamp()}.csv`,
                    ["Email", "Joined"],
                    waitlist.map((w) => [w.email, w.created_at]),
                  )
                }
                className={pill}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
              {waitlist.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Nobody yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {waitlist.map((w) => (
                    <li
                      key={w.email}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
                    >
                      <span className="truncate">{w.email}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {new Date(w.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "accounts" && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="People"
                title="Accounts & roles"
                description="Every registered account, when they last signed in, and what they can do."
              />
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
                className={pill}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
            <ReadOnlyNote />
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
              {accounts.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No accounts loaded.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {accounts.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-medium">
                          {a.display_name ?? a.email ?? "Account"}
                          {a.is_owner && <Crown className="h-3.5 w-3.5 text-primary" />}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {a.email ?? a.id} ·{" "}
                          {a.last_sign_in_at
                            ? `last seen ${new Date(a.last_sign_in_at).toLocaleDateString()}`
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

        {tab === "settings" && (
          <div>
            <SectionHeading
              eyebrow="Configuration"
              title="Site settings"
              description="Owner-only controls for the public site."
            />
            <ReadOnlyNote />
            <div className="surface-card mt-8 max-w-2xl p-6">
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

        {tab === "activity" && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Audit"
                title="Admin activity"
                description="Every change made from this panel, newest first."
              />
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `iconvault-admin-activity-${stamp()}.csv`,
                    ["Action", "Target", "Actor", "When"],
                    logs.map((l) => [l.action, l.target, l.actor_id, l.created_at]),
                  )
                }
                className={pill}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
              {logs.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No admin activity recorded yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {logs.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                      <span className="font-mono text-xs text-primary">{l.action}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                        {l.target ?? ""}
                      </span>
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
      </Stack>
    </PageShell>
  );
}
