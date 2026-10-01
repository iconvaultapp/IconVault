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

export interface IconCollection {
  id: string;
  name: string;
  description: string | null;
  icon_ids: string[];
  created_at: string;
}

const LOCAL_KEY = "iconvault_collections";

const readLocal = (): IconCollection[] => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? (JSON.parse(saved) as IconCollection[]) : [];
  } catch {
    return [];
  }
};

const writeLocal = (cols: IconCollection[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cols));
  } catch {
    /* ignore quota errors */
  }
};

interface CollectionsValue {
  collections: IconCollection[];
  loading: boolean;
  createCollection: (name: string, description?: string) => Promise<IconCollection | null>;
  addToCollection: (collectionId: string, iconId: string) => Promise<void>;
  removeFromCollection: (collectionId: string, iconId: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
}

const CollectionsContext = createContext<CollectionsValue | null>(null);

/**
 * Collections work offline/guest via localStorage and are merged into the
 * account on sign-in, so they stay consistent across devices. One provider
 * owns the state so every card and dialog reads the same list.
 */
export const CollectionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<IconCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      syncedFor.current = null;
      setCollections(readLocal());
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("icon_collections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      let remote = (data as IconCollection[] | null) ?? [];

      const guest = readLocal().filter((g) => g.id.startsWith("local-"));
      const toPush = guest.filter((g) => !remote.some((r) => r.name === g.name));
      if (toPush.length > 0) {
        const { data: inserted } = await supabase
          .from("icon_collections")
          .insert(
            toPush.map((g) => ({
              user_id: user.id,
              name: g.name,
              description: g.description ?? "",
              icon_ids: g.icon_ids ?? [],
            })),
          )
          .select();
        remote = [...((inserted as IconCollection[] | null) ?? []), ...remote];
        toast.success(
          `Synced ${toPush.length} collection${toPush.length > 1 ? "s" : ""} to your account`,
        );
      }

      if (cancelled) return;
      setCollections(remote);
      writeLocal(remote);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const persist = useCallback((next: IconCollection[]) => {
    setCollections(next);
    writeLocal(next);
  }, []);

  const createCollection = useCallback(
    async (name: string, description = "") => {
      if (!user) {
        const local: IconCollection = {
          id: `local-${Date.now()}`,
          name,
          description,
          icon_ids: [],
          created_at: new Date().toISOString(),
        };
        persist([local, ...readLocal()]);
        toast.success(`Collection "${name}" created - sign in to sync it`);
        return local;
      }
      const { data, error } = await supabase
        .from("icon_collections")
        .insert({ user_id: user.id, name, description, icon_ids: [] })
        .select()
        .single();
      if (error || !data) {
        toast.error("Failed to create collection");
        return null;
      }
      persist([data as IconCollection, ...collections]);
      toast.success(`Collection "${name}" created`);
      return data as IconCollection;
    },
    [user, collections, persist],
  );

  const addToCollection = useCallback(
    async (collectionId: string, iconId: string) => {
      const col = collections.find((c) => c.id === collectionId);
      if (!col) return;
      if (col.icon_ids.includes(iconId)) {
        toast.info("Already in this collection");
        return;
      }
      const updated = [...col.icon_ids, iconId];
      if (user && !collectionId.startsWith("local-")) {
        const { error } = await supabase
          .from("icon_collections")
          .update({ icon_ids: updated })
          .eq("id", collectionId);
        if (error) {
          toast.error("Couldn't add that icon - try again");
          return;
        }
      }
      persist(collections.map((c) => (c.id === collectionId ? { ...c, icon_ids: updated } : c)));
      toast.success(`Added to "${col.name}"`);
    },
    [collections, user, persist],
  );

  const removeFromCollection = useCallback(
    async (collectionId: string, iconId: string) => {
      const col = collections.find((c) => c.id === collectionId);
      if (!col) return;
      const updated = col.icon_ids.filter((i) => i !== iconId);
      if (user && !collectionId.startsWith("local-")) {
        const { error } = await supabase
          .from("icon_collections")
          .update({ icon_ids: updated })
          .eq("id", collectionId);
        if (error) {
          toast.error("Couldn't remove that icon - try again");
          return;
        }
      }
      persist(collections.map((c) => (c.id === collectionId ? { ...c, icon_ids: updated } : c)));
      toast.success("Removed from collection");
    },
    [collections, user, persist],
  );

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      if (user && !collectionId.startsWith("local-")) {
        await supabase.from("icon_collections").delete().eq("id", collectionId);
      }
      persist(collections.filter((c) => c.id !== collectionId));
      toast.success("Collection deleted");
    },
    [collections, user, persist],
  );

  const value = useMemo<CollectionsValue>(
    () => ({
      collections,
      loading,
      createCollection,
      addToCollection,
      removeFromCollection,
      deleteCollection,
    }),
    [collections, loading, createCollection, addToCollection, removeFromCollection, deleteCollection],
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
};

export const useCollections = (): CollectionsValue => {
  const ctx = useContext(CollectionsContext);
  if (!ctx) throw new Error("useCollections must be used inside CollectionsProvider");
  return ctx;
};
