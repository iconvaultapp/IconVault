import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Copy, Check, Ban, Loader2, AlertTriangle, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sha256Hex } from "@/lib/api-key-hash";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/kit";
import { cn } from "@/lib/utils";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scope: string;
  monthly_quota: number;
  used_this_month: number;
  revoked: boolean;
  created_at: string;
}

type Status =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "not-setup" }
  | { kind: "load-error"; message: string }
  | { kind: "ready" };

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50";

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  !!error && error.code === "PGRST205";

function makeRawKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ?? 0);
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `ivk_live_${b64}`;
}

export const ApiKeyManager = () => {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read" | "read-write">("read");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setStatus({ kind: "signed-out" });
      return;
    }
    setStatus({ kind: "loading" });
    const { data, error } = await (supabase as any)
      .from("api_keys")
      .select("id, name, key_prefix, scope, monthly_quota, used_this_month, revoked, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingTable(error)) {
        setStatus({ kind: "not-setup" });
        return;
      }
      setStatus({ kind: "load-error", message: error.message ?? "Unknown error" });
      return;
    }
    setKeys((data ?? []) as ApiKeyRow[]);
    setStatus({ kind: "ready" });
  }, [user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const generate = async () => {
    if (!user || busy) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setFormError("Give the key a name first (at least 2 characters).");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const raw = makeRawKey();
      const hash = await sha256Hex(raw);
      const { error } = await (supabase as any).from("api_keys").insert({
        user_id: user.id,
        name: trimmed,
        key_prefix: raw.slice(0, 8),
        key_hash: hash,
        scope,
      });
      if (error) {
        if (isMissingTable(error)) {
          setStatus({ kind: "not-setup" });
          return;
        }
        throw error;
      }
      setNewKey(raw);
      setName("");
      setCopied(false);
      await load();
    } catch {
      setFormError("Could not create the key. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (revoking) return;
    setRevoking(id);
    try {
      const { error } = await (supabase as any)
        .from("api_keys")
        .update({ revoked: true })
        .eq("id", id);
      if (error) throw error;
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
    } catch {
      setFormError("Could not revoke the key. Please try again.");
    } finally {
      setRevoking(null);
    }
  };

  const copyNewKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = newKey;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
  };

  if (authLoading || status.kind === "loading") {
    return (
      <div className="surface-card animate-pulse p-6 sm:p-8">
        <div className="h-5 w-40 rounded bg-surface-2" />
        <div className="mt-4 h-10 rounded-xl bg-surface-2" />
      </div>
    );
  }

  if (status.kind === "signed-out") {
    return (
      <Reveal>
        <div className="surface-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h3 className="font-display text-xl font-semibold">Your API keys</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Sign in to generate keys with a 1,000-call monthly quota. Keyless access keeps working
              without an account, under per-minute IP limits.
            </p>
          </div>
          <Link
            to="/auth"
            className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      </Reveal>
    );
  }

  if (status.kind === "load-error") {
    return (
      <Reveal>
        <div className="surface-card flex items-start gap-3 p-6 sm:p-8">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h3 className="font-display text-xl font-semibold">Could not load your API keys</h3>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
              The keys table exists but the API returned an error: {status.message} Please
              refresh the page, and if it continues, run the migration SQL once more in the
              Supabase SQL Editor.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </Reveal>
    );
  }

  if (status.kind === "not-setup") {
    return (
      <Reveal>
        <div className="surface-card flex items-start gap-3 p-6 sm:p-8">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h3 className="font-display text-xl font-semibold">API keys are almost ready</h3>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Key generation needs one database table that has not been created yet. Until then,
              the keyless endpoints below keep working with their normal per-minute limits.
            </p>
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <div className="surface-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-xl font-semibold">Your API keys</h3>
            <p className="text-sm text-muted-foreground">
              1,000 calls per key per month, free. Send it as{" "}
              <code className="font-mono text-[13px]">x-api-key</code> or{" "}
              <code className="font-mono text-[13px]">Authorization: Bearer</code>.
            </p>
          </div>
        </div>

        {newKey && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm font-medium">
              Copy this key now. It will never be shown again.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 break-all rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm">
                {newKey}
              </code>
              <button
                type="button"
                onClick={() => void copyNewKey()}
                className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewKey(null)}
              className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              I have saved it, hide this
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name, e.g. my side project"
            aria-label="Key name"
            maxLength={60}
            className={inputCls}
          />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "read" | "read-write")}
            aria-label="Key scope"
            className={inputCls}
          >
            <option value="read">read</option>
            <option value="read-write">read-write</option>
          </select>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generate key
          </button>
        </div>
        {formError && <p className="mt-3 text-sm text-red-500">{formError}</p>}

        <div className="mt-6">
          {keys.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No keys yet. Generate your first one above and it will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {keys.map((k) => {
                const pct = Math.min(100, Math.round((k.used_this_month / Math.max(1, k.monthly_quota)) * 100));
                return (
                  <li key={k.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{k.name}</span>
                        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                          {k.key_prefix}...
                        </code>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            k.revoked
                              ? "bg-red-500/10 text-red-500"
                              : "bg-primary-soft text-primary",
                          )}
                        >
                          {k.revoked ? "revoked" : k.scope}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-36 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className={cn("h-full rounded-full", pct >= 100 ? "bg-red-500" : "bg-primary")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {k.used_this_month.toLocaleString()} / {k.monthly_quota.toLocaleString()} this month
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Created {new Date(k.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!k.revoked && (
                      <button
                        type="button"
                        onClick={() => void revoke(k.id)}
                        disabled={revoking === k.id}
                        className="focus-ring inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-500/50 hover:text-red-500 disabled:opacity-60 sm:self-center"
                      >
                        {revoking === k.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        Revoke
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Treat keys like passwords. Use read-write keys only from your own backend, never in
            client-side code. Revoking is instant and cannot be undone.
          </span>
        </p>
      </div>
    </Reveal>
  );
};

export const ApiKeysSection = () => (
  <div>
    <SectionHeading eyebrow="Keys" title="Your API keys" />
    <div className="mt-8">
      <ApiKeyManager />
    </div>
  </div>
);

export default ApiKeyManager;
