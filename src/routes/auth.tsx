import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, Lock, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";
import { resolveLoginEmail } from "@/lib/owner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signin" | "signup" } => {
    const mode = search['mode'] === "signup" || search['mode'] === "signin" ? search['mode'] : undefined;
    return mode ? { mode } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in or create an account | IconVault" },
      {
        name: "description",
        content:
          "Sync favourites, collections and API keys across every device. Free forever, no card, and your data stays yours.",
      },
      { property: "og:title", content: "Sign in or create an account - IconVault" },
      {
        property: "og:description",
        content: "Sync favourites, collections and API keys across every device.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/auth" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: Page,
});

const perks = [
  "Favourites and collections synced everywhere",
  "Custom icon uploads in your own workspace",
  "API keys, CLI login and the Figma plugin",
  "Release alerts for the sets you actually use",
];

function Page() {
  const { mode: searchMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(searchMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [trap, setTrap] = useState("");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchMode) setMode(searchMode);
  }, [searchMode]);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/profile" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotSubmission(trap)) {
      // Bot filled the honeypot: pretend success without touching auth.
      if (mode === "signup") {
        toast.success("Account created - check your inbox to confirm.");
      } else {
        toast.success("Welcome back.");
        void navigate({ to: "/profile" });
      }
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created - check your inbox to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: resolveLoginEmail(email),
          password,
        });
        if (error) throw error;
        toast.success("Welcome back.");
        void navigate({ to: "/profile" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
    }
    // On success the browser navigates away to Google, so nothing else to do here.
  };

  const field =
    "w-full rounded-xl border border-border bg-background py-2.5 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary/50";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <Reveal className="order-2 lg:order-1">
            <div>
              <p className="eyebrow">Account</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                {mode === "signin" ? "Welcome back to the vault" : "Create your IconVault account"}
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Searching is free and always will be. An account is what makes the results stick -
                across devices, editors and your team.
              </p>
              <ul className="mt-8 grid gap-3">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={80} className="order-1 lg:order-2">
            <div className="surface-card p-6 sm:p-8">
              <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-surface-2 p-1">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "focus-ring rounded-full py-2 text-sm font-medium transition-colors",
                      mode === m ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground",
                    )}
                  >
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void google()}
                className="focus-ring mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.4 14.3a7.1 7.1 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
                </svg>
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  or email
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={submit} className="grid gap-4">
                <HoneypotField onFill={setTrap} />
                {mode === "signup" && (
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                      aria-label="Display name"
                      className={field}
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={mode === "signup" ? "email" : "text"}
                    required
                    autoComplete={mode === "signup" ? "email" : "username"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === "signup" ? "you@company.com" : "Email or username"}
                    aria-label={mode === "signup" ? "Email address" : "Email or username"}
                    className={field}
                  />
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    aria-label="Password"
                    className={field}
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
                By continuing you agree to our{" "}
                <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                . Every icon keeps its original open-source licence.
              </p>
            </div>
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
