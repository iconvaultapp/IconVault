import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const LOCAL_KEY = "iconvault_favourites";

const readLocal = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? (JSON.parse(saved) as string[]) : [];
  } catch {
    return [];
  }
};

const writeLocal = (ids: string[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
};

interface FavouritesValue {
  favourites: string[];
  loading: boolean;
  toggleFavourite: (iconId: string) => Promise<void>;
  isFavourite: (iconId: string) => boolean;
}

const FavouritesContext = createContext<FavouritesValue | null>(null);

/**
 * Favourites are always mirrored to localStorage so guests keep their picks,
 * and merged into the account on sign-in so they follow the user across devices.
 * A single provider owns the state so hundreds of icon cards share one sync.
 */
export const FavouritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      syncedFor.current = null;
      setFavourites(readLocal());
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data } = await supabase.from("favourites").select("icon_id").eq("user_id", user.id);
      const remote = data?.map((f) => f.icon_id) ?? [];
      const guest = readLocal();
      const missing = guest.filter((id) => !remote.includes(id));

      if (missing.length > 0) {
        await supabase
          .from("favourites")
          .insert(missing.map((icon_id) => ({ user_id: user.id, icon_id })));
      }

      const merged = Array.from(new Set([...remote, ...guest]));
      if (cancelled) return;
      setFavourites(merged);
      writeLocal(merged);
      setLoading(false);
      if (missing.length > 0) toast.success(`Synced ${missing.length} favourites to your account`);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavourite = useCallback(
    async (iconId: string) => {
      let isFav = false;
      setFavourites((prev) => {
        isFav = prev.includes(iconId);
        const updated = isFav ? prev.filter((f) => f !== iconId) : [...prev, iconId];
        writeLocal(updated);
        return updated;
      });

      if (user) {
        const { error } = isFav
          ? await supabase.from("favourites").delete().eq("user_id", user.id).eq("icon_id", iconId)
          : await supabase.from("favourites").insert({ user_id: user.id, icon_id: iconId });
        if (error) {
          toast.error("Couldn't save that favourite - try again");
          return;
        }
      }
      toast.success(isFav ? "Removed from favourites" : "Added to favourites");
    },
    [user],
  );

  // O(1) membership checks for grid cells; the array stays the source of
  // truth for ordering and persistence.
  const favSet = useMemo(() => new Set(favourites), [favourites]);
  const isFavourite = useCallback((iconId: string) => favSet.has(iconId), [favSet]);

  const value = useMemo<FavouritesValue>(
    () => ({ favourites, loading, toggleFavourite, isFavourite }),
    [favourites, loading, toggleFavourite, isFavourite],
  );

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
};

export const useFavourites = (): FavouritesValue => {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be used inside FavouritesProvider");
  return ctx;
};
