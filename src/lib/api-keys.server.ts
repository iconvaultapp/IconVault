// Server-only API key verification for the public JSON endpoints.
// This file is imported dynamically inside server handlers only; it must
// never be imported from client components (it pulls the service-role key).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sha256Hex } from "./api-key-hash";

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
}

/**
 * Verify a presented API key against Supabase and atomically consume one
 * unit of its monthly quota via the public.consume_api_quota RPC (quota
 * check + increment in a single statement, so concurrent requests cannot
 * race past the quota). Returns null when the request carries no key
 * (caller keeps the existing keyless behavior). Never logs or returns the
 * raw key.
 */
export async function verifyApiKeyRequest(request: Request): Promise<ApiKeyVerdict | null> {
  const key = extractApiKey(request);
  if (!key) return null;

  let hash: string;
  let row: KeyRow | null;
  try {
    hash = await sha256Hex(key);
    const { data, error } = await (supabaseAdmin as any)
      .from("api_keys")
      .select("id, revoked")
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

  // Atomic quota consumption: the RPC checks quota, resets the 30-day
  // window when due, and increments used_this_month in ONE statement.
  try {
    const { data, error } = await (supabaseAdmin as any).rpc("consume_api_quota", {
      p_key_hash: hash,
    });
    if (error) throw error;
    const verdict = (Array.isArray(data) ? data[0] : data) as
      | { ok: boolean; status: number }
      | null
      | undefined;
    if (!verdict) throw new Error("consume_api_quota returned no row");
    if (!verdict.ok) {
      return {
        presented: true,
        ok: false,
        status: verdict.status || 429,
        message: "Monthly API quota exhausted. Usage resets 30 days after the period started.",
      };
    }
  } catch (err) {
    // Fail closed: when quota cannot be counted, the key is not honoured.
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api-keys] quota consumption failed:", msg);
    return {
      presented: true,
      ok: false,
      status: 503,
      message: "API key verification is temporarily unavailable. Try again in a minute.",
    };
  }
  return { presented: true, ok: true };
}
