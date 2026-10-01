import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, ShieldCheck, User2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ensureOwnerAccount } from "@/lib/admin.functions";
import { resolveLoginEmail } from "@/lib/owner";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Owner sign-in | IconVault admin" },
      {
        name: "description",
        content:
          "Private sign-in for the IconVault site owner and administrators. Separate from the public account login.",
      },
      { property: "og:title", content: "Owner sign-in | IconVault admin" },
      {
        property: "og:description",
        content: "Private sign-in for the IconVault site owner and administrators.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const bootstrapOwner = useServerFn(ensureOwnerAccount);

  // Already signed in as an admin? Go straight through to the panel.
  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) void navigate({ to: "/admin", replace: true });
      });
    return () => {
      active = false;
    };
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const email = resolveLoginEmail(identifier);
    try {
      let { error } = await supabase.auth.signInWithPassword({ email, password });

      // First-ever owner sign-in: provision the owner account, then retry once.
      if (error) {
        const prepared = await bootstrapOwner({ data: undefined }).catch(() => null);
        if (prepared?.ok) {
          ({ error } = await supabase.auth.signInWithPassword({ email, password }));
        }
      }
      if (error) throw new Error("Those admin credentials weren't recognised.");

      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      const { data: adminRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid ?? "")
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRow) {
        await supabase.auth.signOut();
        throw new Error("This account doesn't have admin access.");
      }

      toast.success("Welcome back, owner.");
      void navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-xl border border-border bg-background py-2.5 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary/50";

  return (
    <div className="hero-glow flex min-h-screen flex-col items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <div className="surface-card p-7 sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="eyebrow mt-5">Restricted</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Admin control room
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This is the private owner entrance. Customer accounts sign in on the normal account
            page - those credentials will not work here.
          </p>

          <form onSubmit={submit} className="mt-7 grid gap-3.5">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Admin username
              <div className="relative">
                <User2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  spellCheck={false}
                  required
                  className={field}
                  placeholder="Owner username"
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Password
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className={field}
                  placeholder="••••••••••"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="focus-ring mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enter admin panel
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Not an administrator?{" "}
          <Link to="/auth" className="text-primary hover:underline">
            Go to the normal sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
