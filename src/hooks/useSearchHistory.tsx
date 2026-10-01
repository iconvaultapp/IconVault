import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const KEY = "iconvault_search_history";
const MAX = 50;

export interface SearchHistoryEntry {
  query: string;
  at: number;
  results?: number;
}

const readLocal = (): SearchHistoryEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as SearchHistoryEntry[];
  } catch {
    return [];
  }
};

const writeLocal = (entries: SearchHistoryEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
};

const dedupe = (entries: SearchHistoryEntry[]) => {
  const seen = new Set<string>();
  const out: SearchHistoryEntry[] = [];
  for (const e of entries.sort((a, b) => b.at - a.at)) {
    const k = e.query.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out.slice(0, MAX);
};

interface SearchHistoryValue {
  history: SearchHistoryEntry[];
  record: (query: string, results?: number) => void;
  remove: (query: string) => void;
  clear: () => void;
}

const SearchHistoryContext = createContext<SearchHistoryValue | null>(null);

/**
 * Search history is written locally for instant reads and mirrored to the
 * account when signed in, so it survives new devices and browser resets.
 */
export const SearchHistoryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    setHistory(dedupe(readLocal()));
  }, []);

  useEffect(() => {
    if (!user) {
      syncedFor.current = null;
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("search_history")
        .select("query, results, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(MAX);

      const remote: SearchHistoryEntry[] = (data ?? []).map((r) => ({
        query: r.query as string,
        at: new Date(r.created_at as string).getTime(),
        ...(r.results === null || r.results === undefined ? {} : { results: r.results as number }),
      }));

      const local = readLocal();
      const missing = local.filter(
        (l) => !remote.some((r) => r.query.toLowerCase() === l.query.toLowerCase()),
      );
      if (missing.length > 0) {
        await supabase.from("search_history").insert(
          missing.map((m) => ({
            user_id: user.id,
            query: m.query,
            results: m.results ?? null,
            created_at: new Date(m.at).toISOString(),
          })),
        );
      }

      if (cancelled) return;
      const merged = dedupe([...remote, ...local]);
      setHistory(merged);
      writeLocal(merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const record = useCallback(
    (query: string, results?: number) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setHistory((prev) => {
        const next = dedupe([
          { query: trimmed, at: Date.now(), ...(results === undefined ? {} : { results }) },
          ...prev,
        ]);
        writeLocal(next);
        return next;
      });
      if (user) {
        void supabase
          .from("search_history")
          .insert({ user_id: user.id, query: trimmed, results: results ?? null });
      }
    },
    [user],
  );

  const remove = useCallback(
    (query: string) => {
      setHistory((prev) => {
        const next = prev.filter((e) => e.query !== query);
        writeLocal(next);
        return next;
      });
      if (user) {
        void supabase
          .from("search_history")
          .delete()
          .eq("user_id", user.id)
          .eq("query", query);
      }
    },
    [user],
  );

  const clear = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    setHistory([]);
    if (user) void supabase.from("search_history").delete().eq("user_id", user.id);
  }, [user]);

  const value = useMemo<SearchHistoryValue>(
    () => ({ history, record, remove, clear }),
    [history, record, remove, clear],
  );

  return <SearchHistoryContext.Provider value={value}>{children}</SearchHistoryContext.Provider>;
};

export const useSearchHistory = (): SearchHistoryValue => {
  const ctx = useContext(SearchHistoryContext);
  if (!ctx) throw new Error("useSearchHistory must be used inside SearchHistoryProvider");
  return ctx;
};
