import { useEffect, useRef, useState } from "react";
import {
  loadIllustrationSvg,
  packOf,
  recolorSvg,
  type IllustrationEntry,
} from "@/lib/illustrations-data";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { cn } from "@/lib/utils";

interface IllustrationArtProps {
  /** Undefined is tolerated (ROB-M5): a bad slug renders a fallback box,
   *  never a crash. Callers pass getIllustration() results straight in. */
  entry: IllustrationEntry | undefined;
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
 *
 * Hardening (v26): the SVG is fetched only when the card scrolls near the
 * viewport (PERF-H4 - the gallery used to fetch every card's full SVG on
 * mount), and DOMPurify-sanitized before injection (SEC-L8 - bundled files
 * are grep-clean today, but a future bad file must not run scripts).
 */
export const IllustrationArt = ({
  entry,
  theme = "light",
  color,
  className,
  title,
}: IllustrationArtProps) => {
  const holderRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [raw, setRaw] = useState<string | null>(null);
  const activeColor = color ?? (entry ? packOf(entry).primary : "#0d7a68");

  // Viewport gating: no fetch until the card is near the viewport.
  useEffect(() => {
    const el = holderRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!entry) {
      setRaw("");
      return;
    }
    if (!inView) return;
    let alive = true;
    setRaw(null);
    loadIllustrationSvg(entry, theme)
      .then((svg) => sanitizeSvg(svg))
      .then((svg) => {
        if (alive) setRaw(svg);
      })
      .catch(() => {
        if (alive) setRaw("");
      });
    return () => {
      alive = false;
    };
  }, [entry, theme, inView]);

  return (
    <span
      ref={holderRef}
      className={cn(
        "block [&>svg]:h-full [&>svg]:w-full",
        raw === null && "animate-pulse rounded-2xl bg-muted/50",
        className,
      )}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {raw && entry ? (
        <span
          className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: recolorSvg(entry, raw, activeColor) }}
        />
      ) : null}
    </span>
  );
};

export default IllustrationArt;
