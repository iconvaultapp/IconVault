// Free-trial system for tools: every visitor gets 5 free uses per tool PER DAY,
// tracked in localStorage (no account needed). The counter resets at local
// midnight. Pro members (on a paid plan) get unlimited uses.
//
// NOTE (accepted risk, documented - audit M6): this limit is enforced
// client-side ONLY, by design. Every tool runs 100% in the browser, so there
// is no server-side execution to gate; treat the counter as an upsell nudge,
// never as a security boundary. Server-enforced entitlements are the API
// quota (src/lib/api-keys.server.ts -> consume_api_quota RPC) and the Pro
// plan checks (src/hooks/usePlan.tsx + user_plans RLS).
//
// Tools in FREE_UNLIMITED_TOOL_IDS are completely free - no counting, no
// account, no paywall ever. Sameer: edit that list to change which tools
// are fully free.
//
// A "use" is counted when the tool produces its result (convert / generate /
// capture / compress-download), not on page view.

import { useCallback, useState } from "react";

export const TOOL_TRIAL_LIMIT = 5;

/**
 * Tools that are 100% free for everyone, forever - no daily limit, no
 * account needed. These are cheap, private, fully client-side utilities.
 * Sameer can add/remove ids here; ids must match the tool catalog ids.
 */
export const FREE_UNLIMITED_TOOL_IDS: ReadonlySet<string> = new Set([
  "password-generator",
  "uuid-generator",
  "timestamp-converter",
  "json-formatter",
  "base64",
  "url-encoder",
  "hash-generator",
  "word-counter",
  "character-counter",
  "case-converter",
  "lorem-ipsum",
  "color-converter",
  "unit-converter",
  "percentage-calculator",
  "bmi-calculator",
  "regex-tester",
  "markdown-preview",
  "diff-checker",
  "text-binary-converter",
  "qr-generator",
]);

export function isToolFreeUnlimited(toolId: string): boolean {
  return FREE_UNLIMITED_TOOL_IDS.has(toolId);
}

const storageKey = (toolId: string) => `iv_tool_trial_${toolId}`;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface StoredTrial {
  d: string;
  n: number;
}

function readStored(toolId: string): StoredTrial {
  try {
    const raw = localStorage.getItem(storageKey(toolId));
    if (!raw) return { d: todayKey(), n: 0 };
    // Backwards compatibility: old format was a bare number (lifetime count).
    // Treat any legacy value as "already used up today" is wrong - instead,
    // migrate it to today's bucket so existing users get a fresh daily start.
    if (/^\d+$/.test(raw.trim())) return { d: todayKey(), n: 0 };
    const parsed = JSON.parse(raw) as Partial<StoredTrial>;
    if (typeof parsed?.n !== "number" || typeof parsed?.d !== "string") {
      return { d: todayKey(), n: 0 };
    }
    // New day -> fresh counter.
    if (parsed.d !== todayKey()) return { d: todayKey(), n: 0 };
    return { d: parsed.d, n: Math.max(0, Math.floor(parsed.n)) };
  } catch {
    return { d: todayKey(), n: 0 };
  }
}

function writeStored(toolId: string, n: number): void {
  try {
    localStorage.setItem(storageKey(toolId), JSON.stringify({ d: todayKey(), n }));
  } catch {
    /* private mode - trial simply won't persist */
  }
}

export function getTrialUsed(toolId: string): number {
  if (typeof window === "undefined") return 0;
  if (isToolFreeUnlimited(toolId)) return 0;
  return readStored(toolId).n;
}

/** Increment the counter and return the new used count. */
export function recordTrialUse(toolId: string): number {
  if (isToolFreeUnlimited(toolId)) return 0;
  const next = readStored(toolId).n + 1;
  writeStored(toolId, next);
  return next;
}

export interface TrialState {
  used: number;
  left: number;
  limit: number;
  /** True when the tool is fully free (no counting at all). */
  isFreeUnlimited: boolean;
  /** True when the user may run the tool right now. */
  canUse: boolean;
  /** Record one completed use (no-op for Pro and fully-free tools). */
  recordUse: () => void;
}

/**
 * @param toolId  catalog id, e.g. "image-to-svg"
 * @param isPro   true for lifetime owners and active yearly subscribers
 * @param limit   free uses per day for non-Pro (defaults to TOOL_TRIAL_LIMIT)
 */
export function useToolTrial(toolId: string, isPro: boolean, limit: number = TOOL_TRIAL_LIMIT): TrialState {
  const freeUnlimited = isToolFreeUnlimited(toolId);
  const [used, setUsed] = useState<number>(() => getTrialUsed(toolId));

  const recordUse = useCallback(() => {
    if (isPro || freeUnlimited) return;
    setUsed(recordTrialUse(toolId));
  }, [toolId, isPro, freeUnlimited]);

  // Re-read at local midnight boundary is handled lazily: the stored bucket
  // carries its date, so the first read after midnight returns 0.
  // Fully-free tools always show a full counter (they never decrement).
  const left = freeUnlimited ? limit : Math.max(0, limit - used);
  return {
    used,
    left,
    limit,
    isFreeUnlimited: freeUnlimited,
    canUse: isPro || freeUnlimited || left > 0,
    recordUse,
  };
}
