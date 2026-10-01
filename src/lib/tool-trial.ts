// Free-trial system for tools: every visitor gets 5 free uses per tool,
// tracked in localStorage (no account needed). Pro members (on the $9.9/year
// plan) get unlimited uses.
//
// A "use" is counted when the tool produces its result (convert / generate /
// capture / compress-download), not on page view.

import { useCallback, useState } from "react";

export const TOOL_TRIAL_LIMIT = 5;

const storageKey = (toolId: string) => `iv_tool_trial_${toolId}`;

function readUsed(toolId: string): number {
  try {
    const raw = localStorage.getItem(storageKey(toolId));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeUsed(toolId: string, n: number): void {
  try {
    localStorage.setItem(storageKey(toolId), String(n));
  } catch {
    /* private mode - trial simply won't persist */
  }
}

export function getTrialUsed(toolId: string): number {
  if (typeof window === "undefined") return 0;
  return readUsed(toolId);
}

/** Increment the counter and return the new used count. */
export function recordTrialUse(toolId: string): number {
  const next = readUsed(toolId) + 1;
  writeUsed(toolId, next);
  return next;
}

export interface TrialState {
  used: number;
  left: number;
  limit: number;
  /** True when the user may run the tool right now. */
  canUse: boolean;
  /** Record one completed use (no-op for Pro). */
  recordUse: () => void;
}

/**
 * @param toolId  catalog id, e.g. "image-to-svg"
 * @param isPro   true for lifetime owners and active monthly subscribers
 * @param limit   free uses for non-Pro (defaults to TOOL_TRIAL_LIMIT)
 */
export function useToolTrial(toolId: string, isPro: boolean, limit: number = TOOL_TRIAL_LIMIT): TrialState {
  const [used, setUsed] = useState<number>(() => getTrialUsed(toolId));

  const recordUse = useCallback(() => {
    if (isPro) return;
    setUsed(recordTrialUse(toolId));
  }, [toolId, isPro]);

  const left = Math.max(0, limit - used);
  return {
    used,
    left,
    limit,
    canUse: isPro || left > 0,
    recordUse,
  };
}
