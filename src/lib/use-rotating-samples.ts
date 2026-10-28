import { useEffect, useState } from "react";
import { pickRoundRobin, pickSeeded } from "./seeded-pick";

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** SSR renders `defaults`; after mount a fresh random pick replaces them,
 *  so EVERY refresh and EVERY return to the homepage shows different
 *  samples (Sameer 2026-10-28 — v52 rotated hourly, v53 rotates per
 *  visit). No hydration mismatch: the swap happens after hydration, and
 *  both sections sit below the fold, so it is invisible in practice. */
export function useRotatingSamples<T>(
  defaults: readonly T[],
  pool: readonly T[],
  count: number,
): readonly T[] {
  const [samples, setSamples] = useState<readonly T[]>(defaults);
  useEffect(() => {
    setSamples(pickSeeded(pool, count, randomSeed()));
  }, [pool, count]);
  return samples;
}

/** Same, but round-robin across groups so every group mixes each visit. */
export function useRotatingMixedSamples<T>(
  defaults: readonly T[],
  groups: ReadonlyArray<readonly T[]>,
  count: number,
): readonly T[] {
  const [samples, setSamples] = useState<readonly T[]>(defaults);
  useEffect(() => {
    setSamples(pickRoundRobin(groups, count, randomSeed()));
  }, [groups, count]);
  return samples;
}
