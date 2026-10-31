import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * Alignment/visibility (v57): Whirl loaders position themselves with
 * `position: absolute; left: 50%; top: 50%` and ship fixed pixel sizes
 * (50–200px), while SpinKit scales via --sk-size. Two defects followed:
 * (a) the old wrap was position:static, so the 58 absolute loaders
 * anchored to the viewport instead of their card — blank card preview
 * plus a stray loader floating at screen centre; (b) loaders wider than
 * the box (load-man 200px, pong/rays/rainbow/push-* 100px, battery 60px)
 * overflowed the 56px gallery box into the card title below, because
 * the host had no overflow clipping and no fit step.
 * Fix, preview-only (data files and downloads untouched): the wrap is
 * position:relative (absolute loaders now anchor inside their box), the
 * host clips overflow, and after paint the loader subtree is measured
 * against the host box and the wrap is scaled about the content centre
 * and shifted so that centre lands on the box centre. The shift also
 * re-centres loaders like load-man whose own left:50% has no
 * translate(-50%,-50%). The transform goes on the wrap, never on the
 * loader itself, so loader keyframe animations keep working.
 */
function CssPreview({ item, size }: { item: AnimatedIconEntry; size: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    // Reuse a shadow root that already exists (detail-page slug change):
    // attachShadow() throws on a host that already has one, which used
    // to leave a blank preview.
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.innerHTML = "";
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
        wrap.style.cssText = `display:flex;align-items:center;justify-content:center;width:100%;height:100%;position:relative;--sk-size:${size}px;--sk-color:#333;--primary:#6366f1;--secondary:#c7d2fe;`;
        wrap.innerHTML = item.markup;
        shadow.appendChild(style);
        shadow.appendChild(wrap);
        requestAnimationFrame(() => {
          if (cancelled) return;
          const hostRect = host.getBoundingClientRect();
          if (!hostRect.width || !hostRect.height) return;
          // Union of the loader subtree (wrap itself is 100%x100%, so it
          // must not dominate the measurement). Zero-area boxes (empty
          // containers whose children are all absolute) are skipped.
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (const el of Array.from(wrap.querySelectorAll("*"))) {
            const r = (el as HTMLElement).getBoundingClientRect();
            if (!r.width && !r.height) continue;
            minX = Math.min(minX, r.left);
            minY = Math.min(minY, r.top);
            maxX = Math.max(maxX, r.right);
            maxY = Math.max(maxY, r.bottom);
          }
          if (!Number.isFinite(minX)) return;
          const contentW = maxX - minX;
          const contentH = maxY - minY;
          if (!contentW || !contentH) return;
          let scale = Math.min(1, hostRect.width / contentW, hostRect.height / contentH);
          if (!Number.isFinite(scale) || scale <= 0) return;
          // Safety margin on shrink only: pseudo-element bleed (e.g.
          // load-man's chomping heads stick past the measured root box)
          // must not peek out of the clipped host.
          if (scale < 1) scale *= 0.92;
          const contentCx = (minX + maxX) / 2;
          const contentCy = (minY + maxY) / 2;
          const hostCx = hostRect.left + hostRect.width / 2;
          const hostCy = hostRect.top + hostRect.height / 2;
          const dx = hostCx - contentCx;
          const dy = hostCy - contentCy;
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && scale >= 1) return;
          // Scale about the content centre, then shift that centre onto
          // the box centre: with transform-origin at the content centre,
          // the centre maps to itself under scale, so the translate moves
          // it exactly onto the box centre.
          wrap.style.transformOrigin = `${contentCx - hostRect.left}px ${contentCy - hostRect.top}px`;
          wrap.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item, size]);

  if (failed) return <span className="text-xs text-muted-foreground">Preview unavailable</span>;
  return (
    <div
      ref={hostRef}
      style={{ width: size, height: size, overflow: "hidden", position: "relative" }}
      aria-label={item.title}
    />
  );
}

/**
 * Alignment/visibility (v57): Epic Spinner demo files are standalone
 * HTML pages with the browser's 8px body margin and no centring, and
 * their spinners are 40–70px while gallery boxes are 56px. The old
 * plain iframe therefore showed every gallery spinner shifted to the
 * top-left and clipped on the right/bottom (a 70px spinner lost ~22px),
 * and detail spinners sat top-left instead of centred.
 * Fix, preview-only (the file URL used for downloads is untouched):
 * on load, inject a centring style into the same-origin preview
 * document and zoom the spinner root to fit the box.
 */
function HtmlCssPreview({ item, size }: { item: AnimatedIconEntry; size: number }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const fit = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc || !doc.body) return;
    let style = doc.getElementById("iconvault-preview-fit");
    if (!style) {
      style = doc.createElement("style");
      style.id = "iconvault-preview-fit";
      doc.head.appendChild(style);
    }
    style.textContent =
      "html,body{margin:0!important;height:100%!important}body{display:grid!important;place-items:center!important;overflow:hidden!important}";
    const child = doc.body.firstElementChild as HTMLElement | null;
    if (!child) return;
    // Reset first: a previous zoom would corrupt the measurement.
    child.style.setProperty("zoom", "1");
    const vw = frame.clientWidth;
    const vh = frame.clientHeight;
    const r = child.getBoundingClientRect();
    if (!vw || !vh || !r.width || !r.height) return;
    const scale = Math.min(1, vw / r.width, vh / r.height);
    if (!Number.isFinite(scale) || scale <= 0) return;
    // Zoom on the spinner root, not the body: the grid-centred body box
    // stays full-size, so the zoomed spinner stays exactly centred.
    // Zoom is not a transform, so spinner keyframe animations are
    // unaffected.
    child.style.setProperty("zoom", String(scale));
  }, []);

  return (
    <iframe
      ref={frameRef}
      title={item.title}
      src={`/animated-icons/${item.slug}/${item.files[0]}`}
      loading="lazy"
      scrolling="no"
      onLoad={fit}
      style={{ width: size, height: size, border: 0, overflow: "hidden" }}
    />
  );
}

export function AnimatedPreview({ item, size = 64 }: { item: AnimatedIconEntry; size?: number }) {
  if (item.format === "css") {
    return <CssPreview item={item} size={size} />;
  }
  if (item.format === "html-css") {
    return <HtmlCssPreview item={item} size={size} />;
  }
  // SVG+SMIL and static SVG (meteocons + svg-loaders).
  // v58 FIX: Meteocons list the Lottie JSON FIRST and the SVG second
  // (e.g. ["alert-avalanche-danger.json", "alert-avalanche-danger.svg"]),
  // so files[0] as an <img> src asked the browser to render JSON as an
  // image -> broken-image placeholder on all 475 Meteocons entries.
  // Pick the .svg explicitly; packs that already list the SVG first
  // (svg-loaders) are unaffected via the files[0] fallback. The data
  // file order is intentionally untouched: the detail page's Lottie
  // lookup and download buttons assume the current order.
  const svgFile = item.files.find((f) => f.endsWith(".svg")) ?? item.files[0];
  return (
    <img
      src={`/animated-icons/${item.slug}/${svgFile}`}
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
