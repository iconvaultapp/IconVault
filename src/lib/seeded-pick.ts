/** Deterministic rotation helpers (no React, unit-testable with bun).
 *
 * The homepage sections show different samples every hour without any
 * server state, extra requests, or hydration mismatch: SSR renders
 * fixed defaults, and the client swaps in the hour's seeded picks after
 * mount (both sections sit below the fold, so the swap is invisible).
 */

/** Hour bucket since the epoch (UTC). Same for every visitor in an hour. */
export function hourBucket(now: number): number {
  return Math.floor(now / 3_600_000);
}

/** mulberry32: tiny deterministic PRNG for seeded shuffles. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** First `count` items of a seeded Fisher-Yates shuffle (input untouched). */
export function pickSeeded<T>(items: readonly T[], count: number, seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr.slice(0, Math.max(0, count));
}

/** Round-robin across groups: seeded group order, then one item per
 *  group per round, so every group appears in every pick when possible.
 *  Used by the illustrations section so all five packs mix every hour. */
export function pickRoundRobin<T>(
  groups: ReadonlyArray<readonly T[]>,
  count: number,
  seed: number,
): T[] {
  const rand = mulberry32(seed);
  const shuffled = groups.map((g) => pickSeeded(g, g.length, Math.floor(rand() * 2 ** 31)));
  const order = pickSeeded(
    groups.map((_, i) => i),
    groups.length,
    Math.floor(rand() * 2 ** 31),
  );
  const out: T[] = [];
  let round = 0;
  while (out.length < count) {
    let progressed = false;
    for (const gi of order) {
      if (out.length >= count) break;
      const item = shuffled[gi]?.[round];
      if (item !== undefined) {
        out.push(item);
        progressed = true;
      }
    }
    if (!progressed) break;
    round++;
  }
  return out;
}
