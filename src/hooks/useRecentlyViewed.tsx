import { useState, useCallback, useEffect } from "react";

const MAX_RECENT = 20;
const KEY = "iconvault_recent";

export const useRecentlyViewed = () => {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(KEY) || "[]") as string[]);
    } catch {
      setRecent([]);
    }
  }, []);

  const addRecent = useCallback((iconId: string) => {
    setRecent((prev) => {
      const updated = [iconId, ...prev.filter((i) => i !== iconId)].slice(0, MAX_RECENT);
      localStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecent = useCallback(() => {
    localStorage.removeItem(KEY);
    setRecent([]);
  }, []);

  return { recent, addRecent, clearRecent };
};
