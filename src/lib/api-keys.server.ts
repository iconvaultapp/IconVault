// Server-only API key verification for the public JSON endpoints.
// This file is imported dynamically inside server handlers only; it must
// never be imported from client components (it pulls the service-role key).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sha256Hex } from "./api-key-hash";

const QUOTA_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface ApiKeyVerdict {
  /** No key was presented at all. */
  presented: boolean;
  /** The key is valid, unrevoked and under quota (usage already counted). */
  ok: boolean;
  /** HTTP status to answer with when !ok. */
  status?: number;
  /** Safe, user-facing message. Never contains the key. */
  message?: string;
}

/** Pull an IconVault API key from `x-api-key` or `Authorization: Bearer`. */
export function extractApiKey(request: Request): string | null {
  const direct = request.headers.get("x-api-key");
  if (direct && direct.trim()) return direct.trim();
  const auth = request.headers.get("authorization");
  if (auth) {
    const m = /^bearer\s+(.+)$/i.exec(auth.trim());
    const token = m?.[1]?.trim();
    if (token) return token;
  }
  return null;
}

interface KeyRow {
  id: string;
  revoked: boolean;
  monthly_quota: number;
  used_this_month: number;
  period_start: string;
}

/**
 * Verify a presented API key against Supabase. Resets the monthly usage
 * window when it is older than 30 days and increments usage on success.
 * Returns null when the request carries no key (caller keeps the existing
 * keyless behavior). Never logs or returns the raw key.
 */
export async function verifyApiKeyRequest(request: Request): Promise<ApiKeyVerdict | null> {
  const key = extractApiKey(request);
  if (!key) return null;

  let row: KeyRow | null;
  try {
    const hash = await sha256Hex(key);
    const { data, error } = await (supabaseAdmin as any)
      .from("api_keys")
      .select("id, revoked, monthly_quota, used_this_month, period_start")
      .eq("key_hash", hash)
      .maybeSingle();
    if (error) throw error;
    row = (data as KeyRow | null) ?? null;
  } catch (err) {
    // Fail closed rather than silently treating a bad key as valid.
    // Distinguish "server not configured" from "transient DB failure" so the
    // 503 stays honest without leaking secrets. The raw key is never logged
    // (only its hash ever reaches the query).
    const msg = err instanceof Error ? err.message : String(err);
    const notConfigured = /Missing Supabase environment variable/i.test(msg);
    console.error(
      "[api-keys] verification failed:",
      notConfigured ? "service not configured (missing env)" : msg,
    );
    return {
      presented: true,
      ok: false,
      status: 503,
      message: notConfigured
        ? "API key verification is not configured on the server yet."
        : "API key verification is temporarily unavailable. Try again in a minute.",
    };
  }

  if (!row) {
    return { presented: true, ok: false, status: 401, message: "Invalid API key." };
  }
  if (row.revoked) {
    return { presented: true, ok: false, status: 401, message: "This API key has been revoked." };
  }

  let used = row.used_this_month;
  const periodStart = new Date(row.period_start).getTime();
  const patch: Record<string, unknown> = {};
  if (Number.isFinite(periodStart) && Date.now() - periodStart > QUOTA_WINDOW_MS) {
    used = 0;
    patch["period_start"] = new Date().toISOString();
  }
  if (used >= row.monthly_quota) {
    return {
      presented: true,
      ok: false,
      status: 429,
      message: "Monthly API quota exhausted. Usage resets 30 days after the period started.",
    };
  }

  patch["used_this_month"] = used + 1;
  try {
    await (supabaseAdmin as any).from("api_keys").update(patch).eq("id", row.id);
  } catch {
    // Usage counting is best-effort; the request itself was authorized.
  }
  return { presented: true, ok: true };
}
