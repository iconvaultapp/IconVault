import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, Plus, Trash2, Download, Loader2, Heart, X } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";
import IconifyDetail from "@/components/IconifyDetail";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, Stack, CTABand } from "@/components/kit";
import { useCollections } from "@/hooks/useCollections";
import { useFavourites } from "@/hooks/useFavourites";
import { useAuth } from "@/hooks/useAuth";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { fetchIconSvg, getIconSvgUrl, parseIconId } from "@/lib/iconify";
import { brandFilename } from "@/lib/logo-builder";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "My collections - group and export icon packs | IconVault" },
      {
        name: "description",
        content:
          "Group icons into named packs per project, keep them synced across devices, and export the whole set as SVG in one download.",
      },
      { property: "og:title", content: "My collections - group and export icon packs" },
      {
        property: "og:description",
        content: "Group icons into named packs per project and export the whole set at once.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/collections" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/collections" }],
  }),
  component: Page,
});

function Page() {
  const { user, loading: authLoading } = useAuth();
  const { collections, loading, createCollection, removeFromCollection, deleteCollection } =
    useCollections();
  const { favourites, toggleFavourite } = useFavourites();
  const { addRecent } = useRecentlyViewed();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [trap, setTrap] = useState("");
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isBotSubmission(trap)) {
      // Bot filled the honeypot: silently discard (real flow has no toast).
      setName("");
      return;
    }
    setCreating(true);
    await createCollection(name.trim());
    setName("");
    setCreating(false);
  };

  /** Downloads every icon in a collection as individual SVG files. */
  const exportCollection = async (id: string, label: string, iconIds: string[]) => {
    if (iconIds.length === 0) return;
    setExporting(id);
    try {
      for (const iconId of iconIds) {
        const { prefix, name: iconName } = parseIconId(iconId);
        const svg = await fetchIconSvg(prefix, iconName);
        const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = brandFilename(`${prefix}-${iconName}.svg`);
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`Exported ${iconIds.length} icons from "${label}"`);
    } catch {
      toast.error("Export failed - try again");
    } finally {
      setExporting(null);
    }
  };

  const IconTile = ({
    iconId,
    onRemove,
  }: {
    iconId: string;
    onRemove?: () => void;
  }) => {
    const { prefix, name: iconName } = parseIconId(iconId);
    return (
      <div className="group relative">
        <button
          type="button"
          onClick={() => setActiveIcon(iconId)}
          title={iconId}
          className="focus-ring grid aspect-square w-full place-items-center rounded-xl border border-border bg-surface transition-colors hover:border-primary/40"
        >
          <img
            src={getIconSvgUrl(prefix, iconName, { width: 22, height: 22, color: "currentColor" })}
            alt={iconName}
            loading="lazy"
            className="h-5.5 w-5.5"
          />
        </button>
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove ${iconId}`}
            onClick={onRemove}
            className="focus-ring absolute -right-1.5 -top-1.5 hidden rounded-full border border-border bg-surface p-1 text-muted-foreground shadow-soft transition-colors hover:text-destructive group-hover:block"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <PageShell
      wide
      eyebrow="Collections"
      title="My collections"
      description="A project rarely needs 421,020 icons - it needs about forty, chosen once and reused. Collections are where that shortlist lives."
    >
      <Stack>
        {!authLoading && !user && (
          <div className="surface-card p-10 text-center">
            <FolderOpen className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-semibold">Sign in to save collections</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Favourites work without an account on this device. Named collections sync to your
              profile, so they follow you to another machine.
            </p>
            <Link
              to="/auth"
              className="focus-ring mt-6 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Create a free account
            </Link>
          </div>
        )}

        {user && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Your packs" title="Collections" />
              <form onSubmit={create} className="flex items-center gap-2">
                <HoneypotField onFill={setTrap} />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New collection name"
                  aria-label="New collection name"
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </button>
              </form>
            </div>

            <div className="mt-8 grid gap-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading collections…
                </div>
              ) : collections.length > 0 ? (
                collections.map((collection, i) => (
                  <Reveal key={collection.id} delay={i * 40}>
                    <section className="surface-card p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-display text-base font-semibold">{collection.name}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {collection.icon_ids.length} icons
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void exportCollection(collection.id, collection.name, collection.icon_ids)
                            }
                            disabled={exporting === collection.id || collection.icon_ids.length === 0}
                            className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                          >
                            {exporting === collection.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            Export SVGs
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${collection.name}`}
                            onClick={() => void deleteCollection(collection.id)}
                            className="focus-ring rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {collection.icon_ids.length > 0 ? (
                        <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-14">
                          {collection.icon_ids.map((iconId) => (
                            <IconTile
                              key={iconId}
                              iconId={iconId}
                              onRemove={() => void removeFromCollection(collection.id, iconId)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                          Empty. Open an icon in the vault and add it to this collection.
                        </p>
                      )}
                    </section>
                  </Reveal>
                ))
              ) : (
                <div className="surface-card p-10 text-center">
                  <FolderOpen className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 font-display text-lg font-semibold">No collections yet</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Name your first one above - most teams start with one per product surface.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <SectionHeading
            eyebrow="Favourites"
            title="Quick saves"
            description="Everything you've hearted, in one grid. Stored on your account when signed in, on this device otherwise."
          />
          <div className="mt-8">
            {favourites.length > 0 ? (
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-14">
                {favourites.map((iconId) => (
                  <IconTile
                    key={iconId}
                    iconId={iconId}
                    onRemove={() => void toggleFavourite(iconId)}
                  />
                ))}
              </div>
            ) : (
              <div className="surface-card p-10 text-center">
                <Heart className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-semibold">Nothing favourited yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Hit the heart on any icon card and it lands here.
                </p>
              </div>
            )}
          </div>
        </div>

        <CTABand
          title="Ship the set, not the screenshots"
          body="Export a whole collection as SVG, or pull it straight into code with the CLI."
          primary={{ label: "Browse icons", to: "/app" }}
          secondary={{ label: "Use the CLI", to: "/cli" }}
        />
      </Stack>

      {activeIcon && (
        <IconifyDetail iconId={activeIcon} onClose={() => setActiveIcon(null)} onAddToRecent={addRecent} />
      )}
    </PageShell>
  );
}
