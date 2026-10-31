import { useEffect, useRef, useState } from "react";
import type { AnimatedIconEntry } from "@/lib/animated-icons-data";

/**
 * IconVault v55 — preview renderer for animated icons.
 * - SVG+SMIL / static SVG: plain <img> (SMIL runs inside <img> SVGs).
 * - CSS loaders (Whirl / SpinKit): fetched CSS + markup injected into a shadow
 *   DOM so generic class names (e.g. Whirl `.dots`) and keyframes can never
 *   collide with site CSS or with other loaders on the same page.
 * - Epic Spinners HTML: same-origin iframe of the self-contained demo file.
 * No player code is imported here; the Lottie player lives in LottiePlayer
 * (dynamic import only, rendered on meteocons detail pages).
 */

function stripRootBlock(css: string): string {
  return css.replace(/:root\s*\{[^}]*\}/g, "");
}

function CssPreview({ item, size }: { item: AnimatedIconEntry; size: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.attachShadow({ mode: "open" });
    fetch(`/animated-icons/${item.slug}/${item.files[0]}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((css) => {
        if (cancelled) return;
        const style = document.createElement("style");
        style.textContent = stripRootBlock(css);
        const wrap = document.createElement("div");
        wrap.style.cssText = `display:flex;align-items:center;justify-content:center;width:100%;height:100%;--sk-size:${size}px;--sk-color:#333;--primary:#6366f1;--secondary:#c7d2fe;`;
        wrap.innerHTML = item.markup;
        shadow.appendChild(style);
        shadow.appendChild(wrap);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item, size]);

  if (failed) return <span className="text-xs text-muted-foreground">Preview unavailable</span>;
  return <div ref={hostRef} style={{ width: size, height: size }} aria-label={item.title} />;
}

export function AnimatedPreview({ item, size = 64 }: { item: AnimatedIconEntry; size?: number }) {
  if (item.format === "css") {
    return <CssPreview item={item} size={size} />;
  }
  if (item.format === "html-css") {
    return (
      <iframe
        title={item.title}
        src={`/animated-icons/${item.slug}/${item.files[0]}`}
        loading="lazy"
        style={{ width: size, height: size, border: 0, overflow: "hidden" }}
      />
    );
  }
  // SVG+SMIL and static SVG (meteocons + svg-loaders)
  return (
    <img
      src={`/animated-icons/${item.slug}/${item.files[0]}`}
      alt={item.title}
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

/** Lottie player: lottie-web is imported dynamically ONLY when this renders. */
export function LottiePlayer({ jsonUrl, size = 160 }: { jsonUrl: string; size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let anim: { destroy: () => void } | null = null;
    let cancelled = false;
    fetch(jsonUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(async (data) => {
        if (cancelled || !containerRef.current) return;
        const lottie = (await import("lottie-web")).default;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: data,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [jsonUrl]);

  if (failed) return <span className="text-xs text-muted-foreground">Lottie preview unavailable</span>;
  return <div ref={containerRef} style={{ width: size, height: size }} aria-label="Lottie animation preview" />;
}
