import { useEffect, useState } from "react";
import {
  loadIllustrationSvg,
  packOf,
  recolorSvg,
  type IllustrationEntry,
} from "@/lib/illustrations-data";
import { cn } from "@/lib/utils";

interface IllustrationArtProps {
  entry: IllustrationEntry;
  theme?: "light" | "dark";
  /** Target colour; defaults to the pack's own primary (no recolour). */
  color?: string;
  className?: string;
  /** Accessible label; omit for decorative use. */
  title?: string;
}

/**
 * One bundled illustration, rendered inline with its pack's colour family
 * recoloured live. The raw SVG is fetched once per pack+slug+theme and
 * session-cached; recolouring is a pure string swap, so colour changes
 * are instant and downloads elsewhere reuse the same helpers.
 */
export const IllustrationArt = ({
  entry,
  theme = "light",
  color,
  className,
  title,
}: IllustrationArtProps) => {
  const [raw, setRaw] = useState<string | null>(null);
  const activeColor = color ?? packOf(entry).primary;

  useEffect(() => {
    let alive = true;
    setRaw(null);
    loadIllustrationSvg(entry, theme)
      .then((svg) => {
        if (alive) setRaw(svg);
      })
      .catch(() => {
        if (alive) setRaw("");
      });
    return () => {
      alive = false;
    };
  }, [entry, theme]);

  return (
    <span
      className={cn(
        "block [&>svg]:h-full [&>svg]:w-full",
        raw === null && "animate-pulse rounded-2xl bg-muted/50",
        className,
      )}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {raw ? (
        <span
          className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: recolorSvg(entry, raw, activeColor) }}
        />
      ) : null}
    </span>
  );
};

export default IllustrationArt;
