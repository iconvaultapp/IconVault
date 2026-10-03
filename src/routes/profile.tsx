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
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, type DashboardNavSection } from "@/components/dashboard/DashboardShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";
import { useServerFn } from "@tanstack/react-start";
import { submitTestimonial } from "@/lib/testimonial.functions";
import { TESTIMONIAL_MAX_LENGTH } from "@/lib/user-testimonials";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavourites } from "@/hooks/useFavourites";
import { useCollections } from "@/hooks/useCollections";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { usePlan, YEARLY_PRICE } from "@/hooks/usePlan";
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
  | "subscription"
  | "apikey"
  | "review"
  | "settings";

const SECTION_META: Record<SectionId, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Your IconVault at a glance." },
  favourites: { title: "Favourite Icons", subtitle: "Every icon you hearted, in one place." },
  collections: { title: "Collections", subtitle: "Your saved icon sets." },
  history: { title: "History", subtitle: "Icons you recently viewed on this device." },
  subscription: { title: "Subscription", subtitle: "Your plan and billing." },
  apikey: { title: "API Key", subtitle: "Keys for the REST API, CLI and embed widget." },
  review: { title: "My Review", subtitle: "Share a review for the homepage." },
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
  const [displayName, setDisplayName] = useState("");
  const [trap, setTrap] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trialSummary, setTrialSummary] = useState<TrialSummary | null>(null);
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [section, setSection] = useState<SectionId>("overview");

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
      ],
    },
    {
      title: "Account",
      items: [
        { id: "subscription", label: "Subscription", icon: Crown },
        { id: "apikey", label: "API Key", icon: Key },
        { id: "review", label: "My Review", icon: MessageSquareQuote },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <DashboardShell
      sidebarSections={navSections}
      activeId={section}
      onNavigate={(id) => setSection(id as SectionId)}
      title={meta.title}
      subtitle={meta.subtitle}
      actions={
        isAdmin ? (
          <Link
            to="/admin"
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Admin panel
          </Link>
        ) : undefined
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                      Pro Yearly · ${YEARLY_PRICE}/year
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
                  Go Pro · ${YEARLY_PRICE}/year <ArrowRight className="h-4 w-4" />
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
                  to="/app"
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
                      Pro Yearly · ${YEARLY_PRICE}/year
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
                    Go Pro · ${YEARLY_PRICE}/year <ArrowRight className="h-4 w-4" />
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
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
