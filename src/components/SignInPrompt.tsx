import { useNavigate } from "@tanstack/react-router";
import { X, Sparkles, Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useSignInPrompt } from "@/hooks/useSignInPrompt";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const perks = [
  "Copy and download unlimited icons",
  "Save favourites and collections",
  "Sync history across devices",
];

export const SignInPrompt = () => {
  const { open, close, message } = useSignInPrompt();
  const navigate = useNavigate();

  if (!open) return null;

  const goToAuth = (mode: "signin" | "signup") => {
    close();
    void navigate({ to: "/auth", search: { mode } });
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
      return;
    }
    // On success the browser navigates away to Google, so nothing else to do here.
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={close}
      />
      <div className="animate-pop relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
        <button
          onClick={close}
          aria-label="Close"
          className="focus-ring absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-6 p-8 sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-ring">
            <Sparkles className="h-7 w-7" strokeWidth={2} />
          </div>

          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {message ?? "A free IconVault account unlocks copying, downloading, and syncing your favourites."}
            </p>
          </div>

          <ul className="mx-auto grid max-w-xs gap-2 text-sm text-muted-foreground">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <div className="grid gap-3">
            <button
              onClick={() => goToAuth("signup")}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:scale-[1.02]"
            >
              <Mail className="h-4 w-4" />
              Create free account
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => goToAuth("signin")}
              className={cn(
                "focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
              )}
            >
              Already have an account? Sign in
            </button>

            <div className="relative py-1">
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span className="relative mx-auto block w-max bg-surface px-3 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <button
              onClick={() => void google()}
              className="focus-ring inline-flex items-center justify-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:border-primary/40"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.4 14.3a7.1 7.1 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            No spam, no card required. Read our{" "}
            <a href="/pro" className="text-primary hover:underline">
              plan terms
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPrompt;
