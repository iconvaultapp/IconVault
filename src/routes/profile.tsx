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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";
import { SectionHeading, Stack, CTABand } from "@/components/kit";
import {
  getUserTestimonials,
  saveUserTestimonial,
  deleteUserTestimonial,
  TESTIMONIAL_MAX_LENGTH,
  type UserTestimonial,
} from "@/lib/user-testimonials";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavourites } from "@/hooks/useFavourites";
import { useCollections } from "@/hooks/useCollections";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { usePlan, YEARLY_PRICE } from "@/hooks/usePlan";
import { getIconSvgUrl, parseIconId } from "@/lib/iconify";
import { TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";

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
    links: [{ rel: "canonical", href: "/profile" }],
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

/** Let the user publish a short review that appears in the homepage testimonials. */
function TestimonialSection({ displayName }: { displayName: string }) {
  const [name, setName] = useState(displayName);
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [trap, setTrap] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<UserTestimonial[]>([]);

  useEffect(() => {
    setReviews(getUserTestimonials());
  }, []);

  useEffect(() => {
    setName((prev) => prev || displayName);
  }, [displayName]);

  const submit = (e: React.FormEvent) => {
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
    const entry = saveUserTestimonial({ name: name.trim() || displayName, quote, rating });
    setReviews((prev) => [entry, ...prev]);
    setQuote("");
    setSaving(false);
    toast.success("Your review is live - it now appears on the homepage");
  };

  const remove = (createdAt: string) => {
    deleteUserTestimonial(createdAt);
    setReviews((prev) => prev.filter((r) => r.createdAt !== createdAt));
    toast.success("Review removed");
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Community"
        title="Your review"
        description="Share a short review - it appears in the homepage testimonials on this device."
      />
      <Reveal>
        <div className="surface-card mt-8 p-6">
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

          {reviews.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <p className="text-sm font-medium">
                Your published {reviews.length === 1 ? "review" : "reviews"}
              </p>
              <ul className="mt-4 grid gap-3">
                {reviews.map((r) => (
                  <li
                    key={r.createdAt}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex gap-0.5 text-accent">
                        {Array.from({ length: 5 }).map((_, n) => (
                          <Star
                            key={n}
                            className={`h-3 w-3 ${n < r.rating ? "fill-accent" : "opacity-30"}`}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed">"{r.quote}"</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.name} · IconVault User
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(r.createdAt)}
                      aria-label="Delete review"
                      className="focus-ring shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

function Page() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { favourites } = useFavourites();
  const { collections } = useCollections();
  const { recent } = useRecentlyViewed();
  const { plan, isPro, loading: planLoading } = usePlan();
  const [displayName, setDisplayName] = useState("");
  const [trap, setTrap] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trialSummary, setTrialSummary] = useState<TrialSummary | null>(null);

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
      <PageShell eyebrow="Account" title="Profile">
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading your account…
        </div>
      </PageShell>
    );
  }

  const apiKey = `iv_live_${user.id.replace(/-/g, "").slice(0, 24)}`;
  const stats = [
    { icon: Heart, label: "Favourites", value: favourites.length, to: "/collections" as const },
    { icon: FolderOpen, label: "Collections", value: collections.length, to: "/collections" as const },
    { icon: Clock, label: "Recently viewed", value: recent.length, to: "/history" as const },
  ];

  return (
    <PageShell
      wide
      eyebrow="Account"
      title="Your profile"
      description="Everything tied to your account: identity, saved work, plan and keys."
      actions={
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ShieldCheck className="h-4 w-4" /> Admin panel
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => navigate({ to: "/" }));
            }}
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      }
    >
      <Stack>
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 45}>
              <Link to={stat.to} className="surface-card lift-hover block h-full p-5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <stat.icon className="h-4.5 w-4.5" />
                </span>
                <p className="mt-4 font-display text-3xl font-semibold tabular-nums">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Plan" title="Subscription" />
            <Reveal>
              <div className="surface-card mt-8 flex h-full flex-col justify-between gap-4 p-6">
                {planLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Checking your plan…
                  </div>
                ) : isPro ? (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
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
                    <p className="text-sm text-muted-foreground">
                      Billing is handled by Dodo.{" "}
                      <Link to="/pro" className="text-primary underline-offset-4 hover:underline">
                        See the Pro page
                      </Link>{" "}
                      for plan details and support options.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
                        <Crown className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <p className="font-display text-base font-semibold">Free plan</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          Unlimited search and downloads · 3 collections · 1,000 API calls a
                          month · 5 free uses per tool
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/pro"
                      className="focus-ring inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5"
                    >
                      Go Pro · ${YEARLY_PRICE}/year <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                )}
              </div>
            </Reveal>
          </div>

          <div>
            <SectionHeading eyebrow="Free trials" title="Tool usage" />
            <Reveal delay={45}>
              <div className="surface-card mt-8 flex h-full flex-col justify-between gap-4 p-6">
                {isPro ? (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                        <Sparkles className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <p className="font-display text-base font-semibold">Unlimited tool uses</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          Your Pro Yearly plan removes all trial limits.
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/tools"
                      className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      Browse all tools <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                        <Gauge className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <p className="font-display text-base font-semibold">
                          {trialSummary && trialSummary.tried > 0
                            ? `${trialSummary.tried} ${trialSummary.tried === 1 ? "tool" : "tools"} tried on this device`
                            : "No trials used yet"}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {trialSummary && trialSummary.tried > 0 ? (
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
                    <p className="text-sm text-muted-foreground">
                      Trials reset never -{" "}
                      <Link to="/pro" className="text-primary underline-offset-4 hover:underline">
                        go Pro for unlimited uses
                      </Link>
                      .
                    </p>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="Quick picks"
            title={favourites.length > 0 ? "Your favourite icons" : "Popular tools"}
            description={
              favourites.length > 0
                ? "Your most-loved icons, one click away. Manage them all in collections."
                : "You have not hearted any icons yet - start with a few of the most-used tools."
            }
          />
          <Reveal>
            <div className="mt-8">
              {favourites.length > 0 ? (
                <div className="surface-card flex flex-wrap items-center gap-3 p-5">
                  {favourites.slice(0, 8).map((iconId) => {
                    const { prefix, name: iconName } = parseIconId(iconId);
                    return (
                      <Link
                        key={iconId}
                        to="/collections"
                        title={iconId}
                        className="focus-ring grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <img
                          src={getIconSvgUrl(prefix, iconName, {
                            width: 24,
                            height: 24,
                            color: "currentColor",
                          })}
                          alt={iconName}
                          loading="lazy"
                          className="h-6 w-6"
                        />
                      </Link>
                    );
                  })}
                  {favourites.length > 8 && (
                    <Link
                      to="/collections"
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      +{favourites.length - 8} more <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {POPULAR_TOOLS.map((tool) => (
                    <Link
                      key={tool.path}
                      to={tool.path}
                      className="surface-card lift-hover block p-4"
                    >
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
          </Reveal>
        </div>

        <div>
          <SectionHeading eyebrow="Identity" title="Account details" />
          <Reveal>
            <form onSubmit={save} className="surface-card mt-8 grid gap-5 p-6">
              <HoneypotField onFill={setTrap} />
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <User className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold">
                    {displayName || "Unnamed"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="grid gap-2">
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

              <div className="flex flex-wrap items-center justify-between gap-3">
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
          </Reveal>
        </div>

        <TestimonialSection displayName={displayName} />

        <div>
          <SectionHeading
            eyebrow="Developers"
            title="API key"
            description="Use this key with the REST API, the CLI and the embed widget. Treat it like a password - rotate it from the API page if it leaks."
          />
          <Reveal>
            <div className="surface-card mt-8 flex flex-wrap items-center gap-3 p-5">
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
          </Reveal>
        </div>

        <CTABand
          title="Working with other people?"
          body="Team workspaces share collections, custom uploads and one approved icon family across everyone."
          primary={{ label: "See team workspaces", to: "/team" }}
          secondary={{ label: "Usage stats", to: "/usage-stats" }}
        />
      </Stack>
    </PageShell>
  );
}
