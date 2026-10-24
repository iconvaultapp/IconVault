/**
 * Shared in-memory per-IP rate limiter for public API routes.
 * Per Worker isolate - blunts casual abuse; Cloudflare + Supabase are the
 * real backstops. Limits are documented in /docs (API section).
 */

const buckets = new Map<string, number[]>();

const getIp = (request: Request): string =>
  request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";

/**
 * Returns true when the caller is over the limit (and the request should get
 * a 429). Sliding 60s window.
 */
export function isRateLimited(request: Request, key: string, maxHits: number): boolean {
  const now = Date.now();
  const bucketKey = `${key}:${getIp(request)}`;
  const arr = (buckets.get(bucketKey) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  buckets.set(bucketKey, arr);
  if (buckets.size > 8000) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
  return arr.length > maxHits;
}

export const rateLimitedResponse = () =>
  Response.json(
    { error: "Rate limit exceeded. Slow down or upgrade to Pro for higher limits." },
    { status: 429, headers: { "Retry-After": "60" } },
  );

/** Per-endpoint limits (requests/minute/IP), matching the /docs API page. */
export const API_LIMITS = {
  search: 120,
  icon: 240,
  batch: 120,
} as const;

/**
 * KV-backed GLOBAL rate limiter (SEC-L3, v27).
 *
 * The in-memory limiter above is per Worker isolate: Cloudflare runs many
 * isolates, so one IP could burn its quota on isolate A and keep going on
 * isolate B. KV is shared across all of them, so this version enforces the
 * same 60s window everywhere.
 *
 * Binding: the dashboard KV namespace `iconvault-ratelimit` is bound as
 * `RATE_LIMIT_KV` (Worker Settings -> Bindings). Nitro's cloudflare preset
 * stashes bindings on `globalThis.__env__` per request (see
 * server-env.server.ts) - that is how this reads the binding without any
 * env plumbing in the route handlers.
 *
 * Fallback contract (never break a request over the limiter itself):
 * - No binding (local dev, a deploy where the binding was dropped) -> the
 *   in-memory limiter above.
 * - KV read/write failure -> the in-memory limiter above.
 * - Corrupt stored value -> treated as an empty window.
 *
 * Accepted imprecision: two concurrent requests from one IP can read the
 * same array and lose one increment on write (KV has no atomic increment).
 * For a blunt abuse limiter that is fine - the window still fills within
 * a request or two of the limit. Keys expire after 60s, so no cleanup job.
 */
interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const getRateLimitKV = (): KVNamespaceLike | null => {
  try {
    const workerEnv = (globalThis as unknown as Record<string, unknown>)["__env__"] as
      | Record<string, unknown>
      | undefined;
    const kv = workerEnv?.["RATE_LIMIT_KV"];
    if (
      kv &&
      typeof (kv as KVNamespaceLike).get === "function" &&
      typeof (kv as KVNamespaceLike).put === "function"
    ) {
      return kv as KVNamespaceLike;
    }
  } catch {
    /* ignore - fall back to in-memory */
  }
  return null;
};

export async function isRateLimitedKV(
  request: Request,
  key: string,
  maxHits: number,
): Promise<boolean> {
  const kv = getRateLimitKV();
  if (!kv) return isRateLimited(request, key, maxHits);

  const kvKey = `rl:${key}:${getIp(request)}`;
  try {
    const now = Date.now();
    let hits: number[] = [];
    const raw = await kv.get(kvKey);
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          hits = parsed.filter((t) => typeof t === "number" && now - t < 60_000);
        }
      } catch {
        hits = [];
      }
    }
    hits.push(now);
    await kv.put(kvKey, JSON.stringify(hits), { expirationTtl: 60 });
    return hits.length > maxHits;
  } catch {
    return isRateLimited(request, key, maxHits);
  }
}
