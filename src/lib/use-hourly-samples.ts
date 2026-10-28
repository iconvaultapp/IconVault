import { useEffect, useState } from "react";
import { hourBucket, pickRoundRobin, pickSeeded } from "./seeded-pick";

/** SSR renders `defaults`; after mount the current hour's seeded picks
 *  replace them. No hydration mismatch, no flash above the fold (both
 *  homepage sections sit below the hero). */
export function useHourlySamples<T>(
  defaults: readonly T[],
  pool: readonly T[],
  count: number,
): readonly T[] {
  const [samples, setSamples] = useState<readonly T[]>(defaults);
  useEffect(() => {
    setSamples(pickSeeded(pool, count, hourBucket(Date.now())));
  }, [pool, count]);
  return samples;
}

/** Same, but round-robin across groups so every group mixes each hour. */
export function useHourlyMixedSamples<T>(
  defaults: readonly T[],
  groups: ReadonlyArray<readonly T[]>,
  count: number,
): readonly T[] {
  const [samples, setSamples] = useState<readonly T[]>(defaults);
  useEffect(() => {
    setSamples(pickRoundRobin(groups, count, hourBucket(Date.now())));
  }, [groups, count]);
  return samples;
}
