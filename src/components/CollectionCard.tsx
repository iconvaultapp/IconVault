import { Heart, ArrowUpRight } from "lucide-react";
import ReliableIcon from "@/components/ReliableIcon";
import { useFavourites } from "@/hooks/useFavourites";
import { cn } from "@/lib/utils";
import { parseIconId } from "@/lib/iconify";
import type { IconifyCollection } from "@/lib/iconify";

interface CollectionCardProps {
  prefix: string;
  collection: IconifyCollection;
  onClick: () => void;
}

export const CollectionCard = ({ prefix, collection, onClick }: CollectionCardProps) => {
  const { isFavourite, toggleFavourite } = useFavourites();
  const setId = `set:${prefix}`;
  const faved = isFavourite(setId);
  const samples = collection.samples?.slice(0, 4) ?? [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Open the ${collection.name} icon set`}
      className="surface-card lift-hover focus-ring group relative cursor-pointer overflow-hidden text-left"
    >
      <span className="block h-1 w-full bg-[image:var(--gradient-primary)] opacity-40 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate font-display text-base font-semibold transition-colors group-hover:text-primary">
            {collection.name}
          </h3>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {collection.total.toLocaleString()}
          </span>
        </div>

        {samples.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {samples.map((sample, index) => {
              const parsed = sample.includes(":") ? parseIconId(sample) : { prefix, name: sample };
              return (
                <span
                  key={sample}
                  className="grid h-11 place-items-center overflow-hidden rounded-xl bg-muted/60 transition-colors duration-300 group-hover:bg-primary-soft"
                >
                  <ReliableIcon
                    prefix={parsed.prefix}
                    name={parsed.name}
                    alt={parsed.name}
                    width={20}
                    height={20}
                    priority={index === 0}
                    className="h-5 w-5 opacity-70 transition-transform duration-300 group-hover:scale-110"
                  />
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <span className="rounded-md border border-border px-1.5 py-0.5">{prefix}</span>
          {collection.license?.title && (
            <span className="truncate rounded-md bg-muted px-1.5 py-0.5">{collection.license.title}</span>
          )}
          {collection.category && (
            <span className="hidden truncate rounded-md bg-primary-soft px-1.5 py-0.5 text-primary sm:inline">
              {collection.category}
            </span>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-4 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          aria-label={faved ? "Remove set from favourites" : "Save set to favourites"}
          onClick={(e) => {
            e.stopPropagation();
            void toggleFavourite(setId);
          }}
          className="focus-ring pointer-events-auto grid h-7 w-7 place-items-center rounded-full border border-border bg-surface/90 backdrop-blur transition-colors hover:border-primary/40"
        >
          <Heart className={cn("h-3.5 w-3.5", faved ? "fill-accent text-accent" : "text-muted-foreground")} />
        </button>
        <span className="pointer-events-none grid h-7 w-7 place-items-center rounded-full border border-border bg-surface/90 text-primary backdrop-blur">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
};

export default CollectionCard;
