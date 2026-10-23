import { useEffect, useState } from "react";
import {
  loadIllustrationSvg,
  recolorSvg,
  DEFAULT_ILLUSTRATION_COLOR,
} from "@/lib/illustrations-data";
import { cn } from "@/lib/utils";

interface IllustrationArtProps {
  slug: string;
  theme?: "light" | "dark";
  /** Primary colour the Flowbite blue ramp is recoloured to. */
  color?: string;
  className?: string;
  /** Accessible label; omit for decorative use. */
  title?: string;
}

/**
 * One bundled Flowbite illustration, rendered inline with its brand-blue
 * ramp recoloured live. The raw SVG is fetched once per slug+theme and
 * session-cached; recolouring is a pure string swap, so colour changes
 * are instant and downloads elsewhere reuse the same helpers.
 */
export const IllustrationArt = ({
  slug,
  theme = "light",
  color = DEFAULT_ILLUSTRATION_COLOR,
  className,
  title,
}: IllustrationArtProps) => {
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRaw(null);
    loadIllustrationSvg(slug, theme)
      .then((svg) => {
        if (alive) setRaw(svg);
      })
      .catch(() => {
        if (alive) setRaw("");
      });
    return () => {
      alive = false;
    };
  }, [slug, theme]);

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
          dangerouslySetInnerHTML={{ __html: recolorSvg(raw, color) }}
        />
      ) : null}
    </span>
  );
};

export default IllustrationArt;
