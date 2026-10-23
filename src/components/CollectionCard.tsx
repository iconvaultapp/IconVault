import { Heart, ArrowUpRight } from "lucide-react";
import ReliableIcon from "@/components/ReliableIcon";
import { useFavourites } from "@/hooks/useFavourites";
import { cn } from "@/lib/utils";
import { parseIconId } from "@/lib/iconify";
import { tintFor } from "@/lib/card-tints";
import type { IconifyCollection } from "@/lib/iconify";

interface CollectionCardProps {
  prefix: string;
  collection: IconifyCollection;
  onClick: () => void;
}

// Browse-page icon-set card (Sameer 2026-10-23, style-grid reference): the
// whole card is a soft pastel panel in the set's own stable tint, the set
// name and icon count sit inside the panel, and 6 curated sample icons show
// large in soft white tiles. Curated samples only - the alphabetical name
// index filled panels with repeated number icons and looked broken.
export const CollectionCard = ({ prefix, collection, onClick }: CollectionCardProps) => {
  const { isFavourite, toggleFavourite } = useFavourites();
  const setId = `set:${prefix}`;
  const faved = isFavourite(setId);
  const samples = collection.samples?.slice(0, 6) ?? [];

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
      className="focus-ring group relative cursor-pointer overflow-hidden rounded-[1.4rem] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
      style={{ backgroundColor: tintFor(prefix) }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate font-display text-[1.05rem] font-semibold tracking-tight text-foreground">
          {collection.name}
        </h3>
        <span className="shrink-0 text-sm font-medium tabular-nums text-foreground/55">
          {collection.total.toLocaleString()}
        </span>
      </div>

      {samples.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {samples.map((sample, index) => {
            const parsed = sample.includes(":") ? parseIconId(sample) : { prefix, name: sample };
            return (
              <span
                key={sample}
                className="grid place-items-center rounded-xl bg-white/45 py-3 transition-colors duration-300 group-hover:bg-white/60"
              >
                <ReliableIcon
                  prefix={parsed.prefix}
                  name={parsed.name}
                  alt={parsed.name}
                  width={34}
                  height={34}
                  priority={index === 0}
                  className="h-[34px] w-[34px] transition-transform duration-300 group-hover:scale-110"
                />
              </span>
            );
          })}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-3 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          aria-label={faved ? "Remove set from favourites" : "Save set to favourites"}
          onClick={(e) => {
            e.stopPropagation();
            void toggleFavourite(setId);
          }}
          className="focus-ring pointer-events-auto grid h-7 w-7 place-items-center rounded-full bg-white/75 shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          <Heart className={cn("h-3.5 w-3.5", faved ? "fill-accent text-accent" : "text-foreground/60")} />
        </button>
        <span className="pointer-events-none grid h-7 w-7 place-items-center rounded-full bg-white/75 text-primary shadow-sm backdrop-blur">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
};

export default CollectionCard;
