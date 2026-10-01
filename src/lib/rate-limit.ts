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
