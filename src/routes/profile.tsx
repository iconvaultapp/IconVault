import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  LogOut,
  User,
  Heart,
  FolderOpen,
  Clock,
  Key,
  Crown,
  Copy,
  CheckCheck,
  ShieldCheck,
  Sparkles,
  Gauge,
  ArrowRight,
  QrCode,
  Eraser,
  Scaling,
  Minimize2,
  Star,
  MessageSquareQuote,
  LayoutDashboard,
  Settings,
  Zap,
  Trash2,
  Download,
  Bell,
  BellRing,
  LifeBuoy,
  Gift,
  Receipt,
  FileDown,
  UserX,
  ChevronDown,
  ExternalLink,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, type DashboardNavSection } from "@/components/dashboard/DashboardShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";
import { useServerFn } from "@tanstack/react-start";
import { submitTestimonial } from "@/lib/testimonial.functions";
import {
  getBillingHistory,
  getSubscriptionStatus,
  cancelSubscription,
  getCustomerPortalUrl,
  getDownloadHistory,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  exportUserData,
  deleteMyAccount,
  createTicket,
  getMyTickets,
  getMyReferralCode,
  getMyReferrals,
  type BillingPayment,
  type DownloadRow,
  type NotificationRow,
  type TicketRow,
  type SubscriptionInfo,
} from "@/lib/user-account.functions";
import { TESTIMONIAL_MAX_LENGTH } from "@/lib/user-testimonials";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavourites } from "@/hooks/useFavourites";
import { useCollections } from "@/hooks/useCollections";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { usePlan, YEARLY_PRICE, LIFETIME_PRICE } from "@/hooks/usePlan";
import { getIconSvgUrl, parseIconId } from "@/lib/iconify";
import { TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile & account settings | IconVault" },
      {
        name: "description",
        content:
          "Manage your display name, review saved icons and collections, check your plan and copy your API key.",
      },
      { property: "og:title", content: "Your profile & account settings" },
      {
        property: "og:description",
        content: "Manage your account, saved icons, plan and API key.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/profile" }],
  }),
  component: Page,
});

const TRIAL_KEY_PREFIX = "iv_tool_trial_";

interface TrialSummary {
  tried: number;
  usedUp: number;
  withUsesLeft: number;
}

/** Honest, device-local summary of tool trials: no heavy catalog import, just a localStorage scan. */
function readTrialSummary(): TrialSummary | null {
  if (typeof window === "undefined") return null;
  try {
    let usedUp = 0;
    let withUsesLeft = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(TRIAL_KEY_PREFIX)) continue;
      const n = parseInt(localStorage.getItem(key) ?? "0", 10);
      const used = Number.isFinite(n) && n > 0 ? n : 0;
      if (used >= TOOL_TRIAL_LIMIT) usedUp += 1;
      else if (used > 0) withUsesLeft += 1;
    }
    return { tried: usedUp + withUsesLeft, usedUp, withUsesLeft };
  } catch {
    return null;
  }
}

const POPULAR_TOOLS = [
  {
    name: "Image Compressor",
    tagline: "Shrink PNG, JPG and WebP by up to 80%",
    path: "/tools/image-compressor" as const,
    icon: Minimize2,
  },
  {
    name: "Background Remover",
    tagline: "Erase solid backgrounds from photos",
    path: "/tools/background-remover" as const,
    icon: Eraser,
  },
  {
    name: "QR Code Generator",
    tagline: "QR codes for URLs, Wi-Fi and cards",
    path: "/tools/qr-generator" as const,
    icon: QrCode,
  },
  {
    name: "Image Resizer",
    tagline: "Resize images to exact pixels",
    path: "/tools/image-resizer" as const,
    icon: Scaling,
  },
] as const;

type SectionId =
  | "overview"
  | "favourites"
  | "collections"
  | "history"
  | "downloads"
  | "subscription"
  | "apikey"
  | "review"
  | "notifications"
  | "support"
  | "referrals"
  | "settings";

const SECTION_META: Record<SectionId, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Your IconVault at a glance." },
  favourites: { title: "Favourite Icons", subtitle: "Every icon you hearted, in one place." },
  collections: { title: "Collections", subtitle: "Your saved icon sets." },
  history: { title: "History", subtitle: "Icons you recently viewed on this device." },
  downloads: { title: "Downloads", subtitle: "Files you downloaded from IconVault tools." },
  subscription: { title: "Subscription", subtitle: "Your plan and billing." },
  apikey: { title: "API Key", subtitle: "Keys for the REST API, CLI and embed widget." },
  review: { title: "My Review", subtitle: "Share a review for the homepage." },
  notifications: { title: "Notifications", subtitle: "Updates from IconVault." },
  support: { title: "Support", subtitle: "Get help or check your tickets." },
  referrals: { title: "Referrals", subtitle: "Invite friends and track signups." },
  settings: { title: "Settings", subtitle: "Identity and account controls." },
};

interface UserApiKey {
  id: string;
  name: string;
  key_prefix: string;
  monthly_quota: number;
  used_this_month: number;
}

/** Let the user publish a short review. Stored in Supabase as unapproved;
 *  it appears in the homepage testimonials carousel once an admin approves it. */
function TestimonialSection({ displayName }: { displayName: string }) {
  const [name, setName] = useState(displayName);
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [trap, setTrap] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<{ name: string; quote: string; rating: number }[]>([]);
  const submitFn = useServerFn(submitTestimonial);

  useEffect(() => {
    setName((prev) => prev || displayName);
  }, [displayName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotSubmission(trap)) {
      toast.success("Thanks for your review");
      return;
    }
    if (quote.trim().length < 10) {
      toast.error("Please write a slightly longer review (at least 10 characters)");
      return;
    }
    setSaving(true);
    try {
      const result = await submitFn({
        data: { name: name.trim() || displayName, text: quote.trim(), rating },
      });
      if (result.ok) {
        setSubmitted((prev) => [{ name: name.trim() || displayName, quote: quote.trim(), rating }, ...prev]);
        setQuote("");
        toast.success("Review submitted - it goes live after a quick approval");
      } else {
        toast.error("Could not save your review. Please try again.");
      }
    } catch {
      toast.error("Could not save your review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <form onSubmit={submit} className="grid gap-5">
        <HoneypotField onFill={setTrap} />
        <div className="grid gap-2">
          <span className="text-sm font-medium">Your rating</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus-ring rounded-md p-0.5 text-accent transition-transform hover:scale-110"
              >
                <Star
                  className={`h-6 w-6 ${(hoverRating || rating) >= n ? "fill-accent" : "opacity-30"}`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="review-name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="review-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Your name"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="review-text" className="text-sm font-medium">
              Your review
            </label>
            <span className="text-xs text-muted-foreground">
              {quote.length}/{TESTIMONIAL_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="review-text"
            value={quote}
            onChange={(e) => setQuote(e.target.value.slice(0, TESTIMONIAL_MAX_LENGTH))}
            rows={3}
            placeholder="What do you love about IconVault?"
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
          />
        </div>

        <button
          type="submit"
          disabled={saving || quote.trim().length < 10}
          className="focus-ring inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquareQuote className="h-4 w-4" />
          )}
          Publish review
        </button>
      </form>

      {submitted.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-sm font-medium">
            Your submitted {submitted.length === 1 ? "review" : "reviews"}
          </p>
          <ul className="mt-4 grid gap-3">
            {submitted.map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-0.5 text-accent">
                      {Array.from({ length: 5 }).map((_, n) => (
                        <Star
                          key={n}
                          className={`h-3 w-3 ${n < r.rating ? "fill-accent" : "opacity-30"}`}
                        />
                      ))}
                    </div>
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                      Pending approval
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">"{r.quote}"</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.name} · IconVault User
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IconTile({ iconId, to }: { iconId: string; to?: string }) {
  const { prefix, name: iconName } = parseIconId(iconId);
  const inner = (
    <img
      src={getIconSvgUrl(prefix, iconName, { width: 24, height: 24, color: "currentColor" })}
      alt={iconName}
      loading="lazy"
      className="h-6 w-6"
    />
  );
  const cls =
    "focus-ring grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:border-primary/40 hover:text-primary";
  return to ? (
    <Link key={iconId} to={to} title={iconId} className={cls}>
      {inner}
    </Link>
  ) : (
    <span key={iconId} title={iconId} className={cls}>
      {inner}
    </span>
  );
}

function Page() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { favourites } = useFavourites();
  const { collections } = useCollections();
  const { recent, clearRecent } = useRecentlyViewed();
  const { plan, isPro, loading: planLoading } = usePlan();
  // Display label for the user's current paid plan. Yearly/Monthly are
  // grandfathered (no longer sold); new sales are Lifetime $12 one-time.
  const planLabel =
    plan === "lifetime"
      ? `Lifetime · $${LIFETIME_PRICE} one-time`
      : plan === "yearly"
        ? `Pro Yearly · $${YEARLY_PRICE}/year`
        : plan === "monthly"
          ? "Pro Monthly"
          : "Pro";
  const [displayName, setDisplayName] = useState("");
  const [trap, setTrap] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trialSummary, setTrialSummary] = useState<TrialSummary | null>(null);
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [section, setSection] = useState<SectionId>("overview");

  // ---- New user features ----
  const billingFn = useServerFn(getBillingHistory);
  const subStatusFn = useServerFn(getSubscriptionStatus);
  const cancelSubFn = useServerFn(cancelSubscription);
  const portalFn = useServerFn(getCustomerPortalUrl);
  const downloadsFn = useServerFn(getDownloadHistory);
  const notificationsFn = useServerFn(getNotifications);
  const markReadFn = useServerFn(markNotificationRead);
  const markAllReadFn = useServerFn(markAllNotificationsRead);
  const exportFn = useServerFn(exportUserData);
  const deleteAccountFn = useServerFn(deleteMyAccount);
  const createTicketFn = useServerFn(createTicket);
  const myTicketsFn = useServerFn(getMyTickets);
  const refCodeFn = useServerFn(getMyReferralCode);
  const myRefsFn = useServerFn(getMyReferrals);

  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [billing, setBilling] = useState<BillingPayment[]>([]);
  const [billingOk, setBillingOk] = useState(true);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [refCode, setRefCode] = useState("");
  const [referrals, setReferrals] = useState<{ referred_email: string | null; status: string; created_at: string }[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [refCopied, setRefCopied] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refreshNotifications = async () => {
    try {
      setNotifications(await notificationsFn({ data: undefined }));
    } catch {
      /* notifications are optional */
    }
  };

  useEffect(() => {
    if (!user) return;
    void downloadsFn({ data: { limit: 50 } }).then(setDownloads).catch(() => {});
    void refreshNotifications();
    void billingFn({ data: undefined }).then((r) => {
      setBilling(r.payments);
      setBillingOk(r.ok);
    }).catch(() => setBillingOk(false));
    void subStatusFn({ data: undefined }).then(setSubInfo).catch(() => {});
    void myTicketsFn({ data: undefined }).then(setTickets).catch(() => {});
    void refCodeFn({ data: undefined }).then((r) => setRefCode(r.code)).catch(() => {});
    void myRefsFn({ data: undefined }).then(setReferrals).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? (user.email?.split("@")[0] ?? ""));
      });
  }, [user]);

  // Device-local trial counters are only meaningful for free accounts.
  useEffect(() => {
    if (user && !isPro) setTrialSummary(readTrialSummary());
  }, [user, isPro]);

  // The user's own API keys (RLS lets users read their own rows).
  useEffect(() => {
    if (!user) {
      setApiKeys([]);
      return;
    }
    void supabase
      .from("api_keys")
      .select("id, name, key_prefix, monthly_quota, used_this_month")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setApiKeys((data as UserApiKey[] | null) ?? []));
  }, [user]);

  // Only admins see the admin entry point; the panel itself re-verifies access.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isBotSubmission(trap)) {
      // Bot filled the honeypot: silently discard, pretend success.
      toast.success("Profile updated");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);
    setSaving(false);
    toast[error ? "error" : "success"](error ? "Couldn't save that" : "Profile updated");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading your account…
      </div>
    );
  }

  const apiKey = `iv_live_${user.id.replace(/-/g, "").slice(0, 24)}`;
  const apiCallsUsed = apiKeys.reduce((s, k) => s + (k.used_this_month ?? 0), 0);
  const meta = SECTION_META[section];

  const navSections: DashboardNavSection[] = [
    {
      title: "Main",
      items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }],
    },
    {
      title: "Library",
      items: [
        {
          id: "favourites",
          label: "Favourite Icons",
          icon: Heart,
          badge: favourites.length > 0 ? favourites.length : undefined,
        },
        {
          id: "collections",
          label: "Collections",
          icon: FolderOpen,
          badge: collections.length > 0 ? collections.length : undefined,
        },
        { id: "history", label: "History", icon: Clock },
        {
          id: "downloads",
          label: "Downloads",
          icon: Download,
          badge: downloads.length > 0 ? downloads.length : undefined,
        },
      ],
    },
    {
      title: "Account",
      items: [
        { id: "subscription", label: "Subscription", icon: Crown },
        { id: "apikey", label: "API Key", icon: Key },
        { id: "review", label: "My Review", icon: MessageSquareQuote },
        {
          id: "notifications",
          label: "Notifications",
          icon: Bell,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        { id: "support", label: "Support", icon: LifeBuoy },
        { id: "referrals", label: "Referrals", icon: Gift },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  const notificationBell = (
    <button
      type="button"
      onClick={() => setSection("notifications")}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      className="focus-ring relative rounded-full border border-border bg-surface p-2.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
    >
      {unreadCount > 0 ? <BellRing className="h-4.5 w-4.5" /> : <Bell className="h-4.5 w-4.5" />}
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <DashboardShell
      sidebarSections={navSections}
      activeId={section}
      onNavigate={(id) => setSection(id as SectionId)}
      title={meta.title}
      subtitle={meta.subtitle}
      actions={
        <div className="flex items-center gap-2">
          {notificationBell}
          {isAdmin ? (
            <Link
              to="/admin"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin panel
            </Link>
          ) : undefined}
        </div>
      }
      userMenu={{
        name: displayName || user.email?.split("@")[0] || "Account",
        email: user.email ?? undefined,
        onSignOut: () => {
          void signOut().then(() => navigate({ to: "/" }));
        },
      }}
    >
      {section === "overview" && (
        <div className="grid gap-4">
          <WelcomeBanner
            title={`Welcome back, ${displayName || user.email?.split("@")[0] || "friend"}`}
            subtitle="Your icons, collections and tools, all in one place."
            meta={
              isPro ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Crown className="h-3.5 w-3.5" />
                  Pro member
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Free plan
                </span>
              )
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Saved icons" value={favourites.length} icon={Heart} />
            <StatCard label="Collections" value={collections.length} icon={FolderOpen} />
            <StatCard
              label="Tools tried"
              value={trialSummary ? trialSummary.tried : 0}
              icon={Gauge}
              iconClassName="bg-accent-soft text-accent"
            />
            <StatCard
              label="API calls used"
              value={apiCallsUsed.toLocaleString()}
              deltaLabel={apiKeys.length > 0 ? "this month" : "no key yet"}
              icon={Zap}
              iconClassName="bg-chart-3/15 text-chart-3"
            />
            <StatCard
              label="Downloads"
              value={downloads.length}
              deltaLabel={downloads.length > 0 ? "tracked" : "none yet"}
              icon={Download}
              iconClassName="bg-chart-2/15 text-chart-2"
              action={
                downloads.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSection("downloads")}
                    className="focus-ring text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View
                  </button>
                ) : undefined
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold">Recent history</h2>
                <button
                  type="button"
                  onClick={() => setSection("history")}
                  className="focus-ring text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View all
                </button>
              </div>
              {recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing viewed yet on this device.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {recent.slice(0, 10).map((iconId) => (
                    <IconTile key={iconId} iconId={iconId} />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold">Plan</h2>
                <button
                  type="button"
                  onClick={() => setSection("subscription")}
                  className="focus-ring text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Manage
                </button>
              </div>
              {planLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Checking your plan…
                </div>
              ) : isPro ? (
                <div className="flex items-center gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Crown className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold">
                      {planLabel}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Unlimited tool uses, exports and API access.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
                    <Crown className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold">Free plan</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Unlimited search and downloads · 3 collections · 1,000 API calls a month
                    </p>
                  </div>
                </div>
              )}
              {!planLoading && !isPro && (
                <Link
                  to="/pro"
                  className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  Get Lifetime · ${LIFETIME_PRICE} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold">
                {favourites.length > 0 ? "Your favourite icons" : "Popular tools"}
              </h2>
              {favourites.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSection("favourites")}
                  className="focus-ring text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View all
                </button>
              )}
            </div>
            {favourites.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {favourites.slice(0, 12).map((iconId) => (
                  <IconTile key={iconId} iconId={iconId} to="/collections" />
                ))}
                {favourites.length > 12 && (
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-border text-xs font-medium text-muted-foreground">
                    +{favourites.length - 12}
                  </span>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {POPULAR_TOOLS.map((tool) => (
                  <Link key={tool.path} to={tool.path} className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                      <tool.icon className="h-4.5 w-4.5" />
                    </span>
                    <p className="mt-3 font-display text-sm font-semibold">{tool.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{tool.tagline}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === "favourites" && (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            {favourites.length === 0 ? (
              <div className="py-10 text-center">
                <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-display text-base font-semibold">No favourites yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Heart any icon while browsing and it will show up here for quick access.
                </p>
                <Link
                  to="/"
                  className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  Browse icons <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  {favourites.length} saved {favourites.length === 1 ? "icon" : "icons"}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {favourites.map((iconId) => (
                    <IconTile key={iconId} iconId={iconId} to="/collections" />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {section === "collections" && (
        <div className="grid gap-4">
          {collections.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
              <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-display text-base font-semibold">No collections yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Group icons into collections to download them together or share them.
              </p>
              <Link
                to="/collections"
                className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Open collections <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {collections.map((c) => (
                <Link
                  key={c.id}
                  to="/collections"
                  className="focus-ring rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      <FolderOpen className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.icon_ids.length} {c.icon_ids.length === 1 ? "icon" : "icons"}
                      </p>
                    </div>
                  </div>
                  {c.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  )}
                  {c.icon_ids.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.icon_ids.slice(0, 6).map((iconId) => (
                        <IconTile key={iconId} iconId={iconId} />
                      ))}
                      {c.icon_ids.length > 6 && (
                        <span className="grid h-12 w-12 place-items-center rounded-xl border border-border text-xs font-medium text-muted-foreground">
                          +{c.icon_ids.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {section === "history" && (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {recent.length} {recent.length === 1 ? "icon" : "icons"} viewed on this device
              </p>
              {recent.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearRecent();
                    toast.success("History cleared");
                  }}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nothing here yet. Icons you open will appear in this list.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {recent.map((iconId) => (
                  <IconTile key={iconId} iconId={iconId} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === "downloads" && (
        <div className="grid gap-4">
          <DataTable<DownloadRow>
            columns={[
              {
                key: "file",
                header: "File",
                render: (r) => (
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Download className="h-4 w-4" />
                    </span>
                    <span className="truncate font-mono text-[13px]">{r.item_label}</span>
                  </span>
                ),
              },
              {
                key: "tool",
                header: "Tool",
                render: (r) => (
                  <span className="text-muted-foreground">{r.tool_id ?? "—"}</span>
                ),
              },
              {
                key: "date",
                header: "Downloaded",
                className: "whitespace-nowrap",
                render: (r) => (
                  <span className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
            ]}
            rows={downloads}
            emptyText="No downloads tracked yet. Files you download from IconVault tools will appear here."
          />
          <p className="text-xs text-muted-foreground">
            Only downloads made while signed in are tracked.
          </p>
        </div>
      )}

      {section === "subscription" && (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {planLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Checking your plan…
              </div>
            ) : isPro ? (
              <div className="grid gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Crown className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold">
                      {planLabel}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Unlimited tool uses, exports and API access.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Billing is handled by Dodo.{" "}
                  <Link to="/pro" className="text-primary underline-offset-4 hover:underline">
                    See the Pro page
                  </Link>{" "}
                  for plan details and support options.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const r = await portalFn({ data: undefined });
                        if (r.ok && r.url) {
                          window.open(r.url, "_blank", "noopener");
                        } else {
                          toast.error("Could not open the billing portal. Please contact support.");
                        }
                      } catch {
                        toast.error("Could not open the billing portal. Please contact support.");
                      }
                    }}
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" /> Manage billing
                  </button>
                  {!subInfo?.cancelAtNextBillingDate ? (
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Cancel your Pro subscription? It stays active until the end of the billing period.",
                          )
                        )
                          return;
                        setCancelling(true);
                        try {
                          const r = await cancelSubFn({ data: undefined });
                          if (r.ok) {
                            toast.success("Subscription will cancel at the end of the billing period");
                            const s = await subStatusFn({ data: undefined });
                            setSubInfo(s);
                          } else {
                            toast.error("Could not cancel. Please contact support.");
                          }
                        } catch {
                          toast.error("Could not cancel. Please contact support.");
                        } finally {
                          setCancelling(false);
                        }
                      }}
                      className="focus-ring inline-flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                    >
                      {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                      Cancel subscription
                    </button>
                  ) : (
                    <p className="inline-flex items-center rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
                      Cancels at the end of the billing period
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-muted-foreground">
                    <Crown className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold">Free plan</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Unlimited search and downloads · 3 collections · 1,000 API calls a month · 5
                      free uses per tool
                    </p>
                  </div>
                </div>
                <div>
                  <Link
                    to="/pro"
                    className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                  >
                    Get Lifetime · ${LIFETIME_PRICE} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                {isPro ? <Sparkles className="h-5 w-5" /> : <Gauge className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-display text-base font-semibold">
                  {isPro
                    ? "Unlimited tool uses"
                    : trialSummary && trialSummary.tried > 0
                      ? `${trialSummary.tried} ${trialSummary.tried === 1 ? "tool" : "tools"} tried on this device`
                      : "No trials used yet"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {isPro ? (
                    "Your Pro Yearly plan removes all trial limits."
                  ) : trialSummary && trialSummary.tried > 0 ? (
                    <>
                      {trialSummary.usedUp} used up
                      {trialSummary.withUsesLeft > 0 &&
                        ` · ${trialSummary.withUsesLeft} with free uses left`}
                    </>
                  ) : (
                    `Every tool gives you ${TOOL_TRIAL_LIMIT} free uses on this device - no account needed.`
                  )}
                </p>
              </div>
            </div>
            {!isPro && (
              <p className="mt-4 text-sm text-muted-foreground">
                Trials never reset -{" "}
                <Link to="/pro" className="text-primary underline-offset-4 hover:underline">
                  go Pro for unlimited uses
                </Link>
                .
              </p>
            )}
            {isPro && (
              <Link
                to="/tools"
                className="focus-ring mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
              >
                Browse all tools <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Receipt className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-semibold">Billing history</h2>
                <p className="text-xs text-muted-foreground">Payments processed by Dodo.</p>
              </div>
            </div>
            {!billingOk ? (
              <p className="py-4 text-sm text-muted-foreground">
                Billing history is unavailable right now. Please try again later.
              </p>
            ) : billing.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No payments yet. Your invoices will appear here after your first Pro payment.
              </p>
            ) : (
              <DataTable<BillingPayment & { id: string }>
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    className: "whitespace-nowrap",
                    render: (r) => (
                      <span className="text-muted-foreground">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    className: "whitespace-nowrap tabular-nums",
                    render: (r) => (
                      <span className="font-medium">
                        {r.currency} {r.amount.toFixed(2)}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (r) => (
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          r.status === "succeeded"
                            ? "bg-primary-soft text-primary"
                            : r.status === "failed"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {r.status}
                      </span>
                    ),
                  },
                  {
                    key: "id",
                    header: "Payment",
                    render: (r) => (
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.id.slice(0, 18)}
                      </span>
                    ),
                  },
                ]}
                rows={billing.map((b) => ({ ...b, id: b.id || Math.random().toString(36) }))}
                emptyText="No payments yet."
                minWidth={480}
              />
            )}
          </div>
        </div>
      )}

      {section === "apikey" && (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Key className="h-4 w-4 shrink-0 text-primary" />
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-muted-foreground">
                {apiKey}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(apiKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <Link
                to="/api-access"
                className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/40 hover:text-primary"
              >
                API docs
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Use this key with the REST API, the CLI and the embed widget. Treat it like a
              password - rotate it from the API page if it leaks.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Usage this month</h2>
            {apiKeys.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No API keys on your account yet. Create one from the{" "}
                <Link to="/api-access" className="text-primary underline-offset-4 hover:underline">
                  API access page
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {apiKeys.map((k) => {
                  const pct =
                    k.monthly_quota > 0
                      ? Math.min(100, Math.round((k.used_this_month / k.monthly_quota) * 100))
                      : 0;
                  return (
                    <li key={k.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{k.name}</p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {k.key_prefix}…
                          </p>
                        </div>
                        <p className="shrink-0 text-sm tabular-nums">
                          {k.used_this_month.toLocaleString()}
                          <span className="text-muted-foreground">
                            {" "}
                            / {k.monthly_quota.toLocaleString()}
                          </span>
                        </p>
                      </div>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct >= 90 ? "bg-destructive" : "bg-primary",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {section === "review" && <TestimonialSection displayName={displayName} />}

      {section === "notifications" && (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await markAllReadFn({ data: undefined }).catch(() => {});
                    await refreshNotifications();
                    toast.success("All notifications marked as read");
                  }}
                  className="focus-ring text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-display text-base font-semibold">No notifications yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Plan changes, new features and important updates will show up here.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!n.read) {
                          await markReadFn({ data: { id: n.id } }).catch(() => {});
                          setNotifications((prev) =>
                            prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                          );
                        }
                        if (n.link) window.open(n.link, "_blank", "noopener");
                      }}
                      className={cn(
                        "focus-ring flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                        n.read
                          ? "border-border bg-background"
                          : "border-primary/30 bg-primary-soft/40 hover:border-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                          n.read ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary",
                        )}
                      >
                        {n.read ? <Bell className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{n.title}</span>
                          {!n.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                          )}
                        </span>
                        {n.body && (
                          <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-1.5 block text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {section === "support" && (
        <div className="grid gap-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!ticketSubject.trim() || !ticketMessage.trim()) {
                toast.error("Please add a subject and a message");
                return;
              }
              setSendingTicket(true);
              try {
                const r = await createTicketFn({
                  data: { subject: ticketSubject.trim(), message: ticketMessage.trim() },
                });
                if (r.ok) {
                  toast.success("Ticket sent - we usually reply within a day");
                  setTicketSubject("");
                  setTicketMessage("");
                  setTickets(await myTicketsFn({ data: undefined }));
                } else {
                  toast.error("Could not send your ticket. Please try again.");
                }
              } catch {
                toast.error("Could not send your ticket. Please try again.");
              } finally {
                setSendingTicket(false);
              }
            }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="font-display text-base font-semibold">Contact support</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Billing issues, bug reports or feature requests - we read everything.
            </p>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="ticket-subject" className="text-sm font-medium">
                  Subject
                </label>
                <input
                  id="ticket-subject"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Pro payment failed twice"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="ticket-message" className="text-sm font-medium">
                  Message
                </label>
                <textarea
                  id="ticket-message"
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value.slice(0, 4000))}
                  rows={4}
                  placeholder="Describe the issue in a few lines…"
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
                />
              </div>
              <button
                type="submit"
                disabled={sendingTicket}
                className="focus-ring inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {sendingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send ticket
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-base font-semibold">My tickets</h2>
            {tickets.length === 0 ? (
              <p className="mt-3 py-4 text-sm text-muted-foreground">
                No tickets yet. Anything broken or confusing - send one above.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {tickets.map((t) => {
                  const open = openTicketId === t.id;
                  return (
                    <li key={t.id} className="rounded-xl border border-border bg-background">
                      <button
                        type="button"
                        onClick={() => setOpenTicketId(open ? null : t.id)}
                        aria-expanded={open}
                        className="focus-ring flex w-full items-center gap-3 p-4 text-left"
                      >
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            t.status === "open"
                              ? "bg-primary-soft text-primary"
                              : t.status === "closed"
                                ? "bg-muted text-muted-foreground"
                                : "bg-accent/10 text-accent",
                          )}
                        >
                          {t.status}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {t.subject}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <ChevronDown
                          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                        />
                      </button>
                      {open && (
                        <div className="border-t border-border px-4 py-4">
                          <p className="text-sm leading-relaxed">{t.message}</p>
                          {t.replies.length > 0 && (
                            <div className="mt-4 grid gap-3">
                              {t.replies.map((r, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "rounded-xl p-3.5 text-sm",
                                    r.from_admin
                                      ? "border border-primary/20 bg-primary-soft/50"
                                      : "bg-muted/60",
                                  )}
                                >
                                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                                    {r.from_admin ? "IconVault support" : "You"}
                                  </p>
                                  <p className="leading-relaxed">{r.body}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {section === "referrals" && (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Gift className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold">Your referral code</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Share it - when friends join with your link, they show up below.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <code className="rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-base font-semibold tracking-widest">
                {refCode || "…"}
              </code>
              <button
                type="button"
                onClick={() => {
                  const link = `https://iconvault.site/?ref=${refCode}`;
                  void navigator.clipboard.writeText(link);
                  setRefCopied(true);
                  setTimeout(() => setRefCopied(false), 1600);
                  toast.success("Referral link copied");
                }}
                disabled={!refCode}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {refCopied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {refCopied ? "Copied" : "Copy invite link"}
              </button>
            </div>
          </div>

          <DataTable<{ id: string; referred_email: string | null; status: string; created_at: string }>
            columns={[
              {
                key: "email",
                header: "Referred",
                render: (r) => (
                  <span className="text-sm">{r.referred_email ?? "Signed up"}</span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                    {r.status}
                  </span>
                ),
              },
              {
                key: "date",
                header: "Date",
                className: "whitespace-nowrap",
                render: (r) => (
                  <span className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
            ]}
            rows={referrals.map((r, i) => ({ ...r, id: `${r.created_at}-${i}` }))}
            emptyText="No referrals yet. Share your link to get started."
            minWidth={480}
          />
        </div>
      )}

      {section === "settings" && (
        <div className="grid gap-4">
          <form
            onSubmit={save}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <HoneypotField onFill={setTrap} />
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft font-display text-lg font-semibold text-primary">
                {(displayName || user.email || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold">
                  {displayName || "Unnamed"}
                </p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-2">
              <label htmlFor="display-name" className="text-sm font-medium">
                Display name
              </label>
              <input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={saving}
                className="focus-ring inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
              <Link
                to="/privacy"
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                Privacy policy
              </Link>
            </div>
          </form>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-base font-semibold">Your data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download everything IconVault stores about you as a JSON file.
            </p>
            <button
              type="button"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  const data = await exportFn({ data: undefined });
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "iconvault-data-export.json";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 4000);
                  toast.success("Data exported");
                } catch {
                  toast.error("Could not export your data. Please try again.");
                } finally {
                  setExporting(false);
                }
              }}
              className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Export my data
            </button>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
            <h2 className="font-display text-base font-semibold text-destructive">Danger zone</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Signing out ends your session on this device.
            </p>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate({ to: "/" }));
              }}
              className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>

            <div className="mt-6 border-t border-border pt-6">
              <p className="flex items-center gap-2 text-sm font-medium">
                <UserX className="h-4 w-4 text-destructive" /> Delete my account
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently deletes your profile, favourites, collections, API keys and history.
                This cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Trash2 className="h-4 w-4" /> Delete account…
                </button>
              ) : (
                <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <p className="text-sm font-medium">
                    Are you absolutely sure? Type DELETE below is not needed - just confirm twice.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          const r = await deleteAccountFn({ data: { confirm: true } });
                          if (r.ok) {
                            toast.success("Account deleted");
                            await signOut();
                            navigate({ to: "/" });
                          } else {
                            toast.error("Could not delete your account. Please contact support.");
                          }
                        } catch {
                          toast.error("Could not delete your account. Please contact support.");
                        } finally {
                          setDeleting(false);
                          setShowDeleteConfirm(false);
                        }
                      }}
                      className="focus-ring inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Yes, delete everything
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="focus-ring rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
                    >
                      Keep my account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
