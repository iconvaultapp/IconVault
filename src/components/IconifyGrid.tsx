import { useEffect, useState } from "react";
import { Check, Copy, Heart } from "lucide-react";
import { toast } from "sonner";
import { loadIconData, parseIconId } from "@/lib/iconify";
import { useFavourites } from "@/hooks/useFavourites";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import ReliableIcon from "@/components/ReliableIcon";
import { cn } from "@/lib/utils";

interface IconifyGridProps {
  icons: string[];
  onIconClick?: (iconId: string) => void;
  selectedIcons?: Set<string> | undefined;
  emptyMessage?: string;
}

export const IconifyGrid = ({
  icons,
  onIconClick,
  selectedIcons,
  emptyMessage = "No icons matched that search",
}: IconifyGridProps) => {
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);
  const { isFavourite, toggleFavourite } = useFavourites();
  const { requireAuth } = useRequireAuth();
  const bulkMode = selectedIcons !== undefined;

  // Warm the icon-data cache during idle time for icons just below the fold,
  // so scrolling feels instant instead of triggering a network round-trip
  // per icon. The first 32 are already priority-loaded above.
  useEffect(() => {
    if (typeof window === "undefined" || icons.length <= 32) return;
    const warm = () => {
      for (const iconId of icons.slice(32, 224)) {
        const { prefix, name } = parseIconId(iconId);
        if (prefix && name) {
          void loadIconData(prefix, name).catch(() => {
            /* warmed on demand later */
          });
        }
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(timer);
  }, [icons]);

  const copyName = (iconId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth("copy icon names")) return;
    void navigator.clipboard.writeText(iconId);
    setCopiedIcon(iconId);
    toast.success(`Copied ${iconId}`);
    setTimeout(() => setCopiedIcon(null), 1600);
  };

  if (icons.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="font-display text-base font-semibold">Nothing here yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {icons.map((iconId, index) => {
        const { prefix, name } = parseIconId(iconId);
        const isCopied = copiedIcon === iconId;
        const fav = isFavourite(iconId);
        const selected = selectedIcons?.has(iconId);

        return (
          <button
            key={iconId}
            data-icon-id={iconId}
            type="button"
            onClick={() => onIconClick?.(iconId)}
            className={cn(
              "focus-ring group relative min-w-0 rounded-2xl border bg-surface p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm",
              selected ? "border-primary bg-primary-soft/30" : "border-border",
            )}
            aria-label={`Open ${iconId}`}
          >
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted/55 text-foreground">
              {prefix && name ? (
                <ReliableIcon
                  prefix={prefix}
                  name={name}
                  alt={name}
                  width={32}
                  height={32}
                  priority={index < 32}
                  className="h-8 w-8 transition-transform duration-300 group-hover:scale-110"
                />
              ) : null}
            </span>
            <span className="mt-2 block truncate font-mono text-[11px] text-muted-foreground" title={iconId}>
              {name}
            </span>

            {bulkMode && (
              <span
                className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full border border-border bg-surface"
                aria-hidden="true"
              >
                {selected ? <Check className="h-3 w-3 text-primary" /> : null}
              </span>
            )}

            {!bulkMode && (
              <span className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Toggle favourite"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleFavourite(iconId);
                  }}
                  className="pointer-events-auto grid h-6 w-6 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  <Heart className={cn("h-3.5 w-3.5", fav && "fill-accent text-accent")} />
                </span>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Copy icon name"
                  onClick={(e) => copyName(iconId, e)}
                  className="pointer-events-auto grid h-6 w-6 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </span>
              </span>
            )}

            {!bulkMode && fav && (
              <span className="absolute left-2 top-2 opacity-100 transition-opacity group-hover:opacity-0">
                <Heart className="h-3.5 w-3.5 fill-accent text-accent" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default IconifyGrid;
