import { useEffect, useRef, useState } from "react";
import type { AnimatedIconEntry } from "@/lib/animated-icons-data";

/**
 * IconVault v59 — preview renderer for animated icons.
 * - SVG+SMIL / static SVG: plain <img> (SMIL runs inside <img> SVGs).
 * - CSS loaders (Whirl / SpinKit): fetched CSS + markup injected into a shadow
 *   DOM so generic class names (e.g. Whirl `.dots`) and keyframes can never
 *   collide with site CSS or with other loaders on the same page.
 * - Epic Spinners HTML: same-origin iframe of the self-contained demo file.
 * No player code is imported here; the Lottie player lives in LottiePlayer
 * (dynamic import only, rendered on meteocons detail pages).
 *
 * `interactive` (default true): when false — gallery cards and the homepage
 * strip, where the preview sits inside a <Link> — the preview is
 * pointer-events:none so clicks pass through to the card link. Without this,
 * iframe previews swallow clicks into the iframe's own document and the
 * card never navigates (v59 click fix; <img> and shadow-DOM previews bubble
 * in the same document, but the treatment is uniform for all three paths).
 */

function stripRootBlock(css: string): string {
  return css.replace(/:root\s*\{[^}]*\}/g, "");
}

interface Envelope {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function unionEnvelope(a: Envelope | null, b: Envelope | null): Envelope | null {
  if (!a) return b;
  if (!b) return a;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/**
 * Alignment/visibility (v57, envelope + upscale in v59): Whirl loaders
 * position themselves with `position: absolute; left: 50%; top: 50%` and ship
 * fixed pixel sizes (50–200px), while SpinKit scales via --sk-size. The wrap
 * is position:relative (absolute loaders anchor inside their box), the host
 * clips overflow, and after paint the loader subtree is measured against
 * the host box and the wrap is scaled about the content centre and shifted
 * so that centre lands on the box centre. The transform goes on the wrap,
 * never on the loader itself, so loader keyframe animations keep working.
 *
 * v59 changes, preview-only (data files and downloads untouched):
 * - UPSCALE ALLOWED: the old Math.min(1, …) cap left small loaders tiny
 *   (Hollow Dots fit 0.62 → ~9px dots). Scale now targets ~92% of the box
 *   in the limiting dimension, up or down, so small loaders grow and the
 *   8% margin still covers pseudo-element bleed (::before/::after cannot
 *   be measured — getBoundingClientRect sees no pseudo boxes — so the
 *   margin, not a second measurement, is the guard there).
 * - Content already filling the box (raw scale ~1) is left at scale 1:
 *   SpinKit sets --sk-size to the box size, and shrinking those by 8%
 *   would regress renders that are already correct.
 * - SECOND PASS + RESIZE: the fit re-measures 1200ms after mount (a later
 *   animation phase can draw wider than the rest phase) and on window
 *   resize; the envelope only ever grows within one mount, so a later
 *   phase can never re-clip a loader that already fit.
 * Honest limit: a wide-short loader (90×15) in a square box is
 * width-bound by definition — it fills the width at 92% but stays short.
 * The gallery size bump (56 → 76px) helps linearly; it cannot equalise
 * visual weight against square loaders.
 */
function CssPreview({
  item,
  size,
  interactive,
}: {
  item: AnimatedIconEntry;
  size: number;
  interactive: boolean;
}) {
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
    let wrap: HTMLDivElement | null = null;
    let envelope: Envelope | null = null;

    const measureAndApply = () => {
      if (!wrap || cancelled) return;
      // Reset first: a previous transform would corrupt the measurement.
      wrap.style.transform = "";
      void wrap.offsetWidth;
      const hostRect = host.getBoundingClientRect();
      if (!hostRect.width || !hostRect.height) return;
      // Union of the loader subtree (wrap itself is 100%x100%, so it
      // must not dominate the measurement). Zero-area boxes (empty
      // containers whose children are all absolute) are skipped.
      let env: Envelope | null = null;
      for (const el of Array.from(wrap.querySelectorAll("*"))) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (!r.width && !r.height) continue;
        env = unionEnvelope(env, { minX: r.left, minY: r.top, maxX: r.right, maxY: r.bottom });
      }
      if (!env) return;
      envelope = unionEnvelope(envelope, env);
      if (!envelope) return;
      const contentW = envelope.maxX - envelope.minX;
      const contentH = envelope.maxY - envelope.minY;
      if (!contentW || !contentH) return;
      const raw = Math.min(hostRect.width / contentW, hostRect.height / contentH);
      if (!Number.isFinite(raw) || raw <= 0) return;
      const scale = raw >= 1.05 ? raw * 0.92 : raw < 1 ? raw * 0.92 : 1;
      const contentCx = (envelope.minX + envelope.maxX) / 2;
      const contentCy = (envelope.minY + envelope.maxY) / 2;
      const hostCx = hostRect.left + hostRect.width / 2;
      const hostCy = hostRect.top + hostRect.height / 2;
      const dx = hostCx - contentCx;
      const dy = hostCy - contentCy;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && scale === 1) {
        wrap.style.transform = "";
        return;
      }
      // Scale about the content centre, then shift that centre onto
      // the box centre: with transform-origin at the content centre,
      // the centre maps to itself under scale, so the translate moves
      // it exactly onto the box centre. Wrap fills the host, so
      // host-relative origin coordinates are also wrap-relative.
      wrap.style.transformOrigin = `${contentCx - hostRect.left}px ${contentCy - hostRect.top}px`;
      wrap.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    };

    const onResize = () => {
      if (!cancelled) measureAndApply();
    };
    let secondPass: number | undefined;

    fetch(`/animated-icons/${item.slug}/${item.files[0]}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((css) => {
        if (cancelled) return;
        const style = document.createElement("style");
        style.textContent = stripRootBlock(css);
        wrap = document.createElement("div");
        wrap.style.cssText = `display:flex;align-items:center;justify-content:center;width:100%;height:100%;position:relative;--sk-size:${size}px;--sk-color:#333;--primary:#6366f1;--secondary:#c7d2fe;`;
        wrap.innerHTML = item.markup;
        shadow.appendChild(style);
        shadow.appendChild(wrap);
        requestAnimationFrame(() => {
          if (cancelled) return;
          measureAndApply();
        });
        secondPass = window.setTimeout(() => {
          if (!cancelled) measureAndApply();
        }, 1200);
        window.addEventListener("resize", onResize);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (secondPass !== undefined) window.clearTimeout(secondPass);
    };
  }, [item, size]);

  if (failed) return <span className="text-xs text-muted-foreground">Preview unavailable</span>;
  return (
    <div
      ref={hostRef}
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        position: "relative",
        pointerEvents: interactive ? undefined : "none",
      }}
      aria-label={item.title}
    />
  );
}

/**
 * Alignment/visibility (v57, envelope sampling in v59): Epic Spinner demo
 * files are standalone HTML pages with the browser's 8px body margin and
 * no centring, and their spinners are 40–70px while gallery boxes were
 * 56px. The old plain iframe therefore showed every gallery spinner
 * shifted to the top-left and clipped on the right/bottom.
 *
 * v59 fit, preview-only (the file URL used for downloads is untouched):
 * on load, a centring style is injected into the same-origin preview
 * document and the spinner root is moved into a wrapper div. The wrapper
 * — never the spinner root — carries the fit transform, so keyframe
 * transforms on the spinner itself are never overridden (this is why
 * transform-on-wrapper replaces the old non-standard `zoom` on the root:
 * zoom is now broadly supported, but a wrapper transform is the portable
 * mechanism that cannot fight a spinner's own animation).
 *
 * ENVELOPE SAMPLING (the v57 defect it fixes): the old fit measured
 * getBoundingClientRect() once at load — one instant of the cycle. A
 * spinner whose keyframes scale to 1.4 (Fulfilling Bouncing Circle,
 * 4000ms cycle) or translate across the box (Looping Rhombuses,
 * translateX 0 → -466%) overflowed the 56px overflow:hidden iframe at
 * other phases. The new fit samples the spinner subtree's bounding
 * union every 120ms for 4200ms — a full cycle plus margin — and keeps
 * the UNION over all samples, so the final scale fits the worst phase,
 * not the load phase. It fills ~88% of the box in the limiting
 * dimension, ALLOWING UPSCALE (the old Math.min(1, …) cap is gone), so
 * small spinners grow instead of sitting tiny. The 12% margin covers
 * pseudo-element bleed, which getBoundingClientRect cannot see.
 * Re-runs on window resize from the stored envelope. Re-sampling after
 * a settling delay is subsumed by the 4200ms pass.
 * Honest limits: pseudo-element extents are never measured, only
 * margined for; a wide-short spinner stays width-bound in a square box.
 */
function HtmlCssPreview({
  item,
  size,
  interactive,
}: {
  item: AnimatedIconEntry;
  size: number;
  interactive: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const timersRef = useRef<number[]>([]);
  const envelopeRef = useRef<Envelope | null>(null);

  const clearTimers = () => {
    for (const id of timersRef.current) window.clearInterval(id);
    timersRef.current = [];
  };

  const handleResize = () => {
    fit(false);
  };

  useEffect(
    () => () => {
      clearTimers();
      window.removeEventListener("resize", handleResize);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fit = (fresh: boolean) => {
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
    let wrapper = doc.getElementById("iconvault-preview-wrap") as HTMLDivElement | null;
    if (!wrapper) {
      const child = doc.body.firstElementChild as HTMLElement | null;
      if (!child) return;
      wrapper = doc.createElement("div");
      wrapper.id = "iconvault-preview-wrap";
      wrapper.style.cssText = "display:grid;place-items:center;width:fit-content;height:fit-content;";
      doc.body.insertBefore(wrapper, child);
      wrapper.appendChild(child);
    }
    const spinner = wrapper.firstElementChild as HTMLElement | null;
    if (!spinner) return;

    if (fresh) {
      envelopeRef.current = null;
      clearTimers();
    }

    const sample = () => {
      // Reset first: the previous sample's transform would corrupt rects.
      wrapper!.style.transform = "";
      void wrapper!.offsetWidth;
      const vw = doc.documentElement.clientWidth;
      const vh = doc.documentElement.clientHeight;
      if (!vw || !vh) return;
      let env: Envelope | null = null;
      const nodes = [spinner, ...Array.from(spinner.querySelectorAll("*"))];
      for (const el of nodes) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (!r.width && !r.height) continue;
        env = unionEnvelope(env, { minX: r.left, minY: r.top, maxX: r.right, maxY: r.bottom });
      }
      if (!env) return;
      envelopeRef.current = unionEnvelope(envelopeRef.current, env);
      const e = envelopeRef.current;
      if (!e) return;
      const envW = e.maxX - e.minX;
      const envH = e.maxY - e.minY;
      if (!envW || !envH) return;
      const scale = Math.min(vw / envW, vh / envH) * 0.88;
      if (!Number.isFinite(scale) || scale <= 0) return;
      const envCx = (e.minX + e.maxX) / 2;
      const envCy = (e.minY + e.maxY) / 2;
      // Translate in iframe-viewport coordinates: the envelope centre
      // must land on the frame centre (vw/2, vh/2). transform-origin is
      // wrapper-relative, so it uses the unscaled wrapper rect.
      const wrapRect = wrapper!.getBoundingClientRect();
      const dx = vw / 2 - envCx;
      const dy = vh / 2 - envCy;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.01) {
        wrapper!.style.transform = "";
        return;
      }
      wrapper!.style.transformOrigin = `${envCx - wrapRect.left}px ${envCy - wrapRect.top}px`;
      wrapper!.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    };

    sample();
    if (fresh) {
      const started = Date.now();
      const id = window.setInterval(() => {
        sample();
        if (Date.now() - started >= 4200) window.clearInterval(id);
      }, 120);
      timersRef.current.push(id);
      window.addEventListener("resize", handleResize);
    }
  };

  return (
    <iframe
      ref={frameRef}
      title={item.title}
      src={`/animated-icons/${item.slug}/${item.files[0]}`}
      loading="lazy"
      scrolling="no"
      onLoad={() => fit(true)}
      style={{
        width: size,
        height: size,
        border: 0,
        overflow: "hidden",
        pointerEvents: interactive ? undefined : "none",
      }}
    />
  );
}

export function AnimatedPreview({
  item,
  size = 64,
  interactive = true,
}: {
  item: AnimatedIconEntry;
  size?: number;
  /** false inside a card <Link>: preview becomes click-through. */
  interactive?: boolean;
}) {
  if (item.format === "css") {
    return <CssPreview item={item} size={size} interactive={interactive} />;
  }
  if (item.format === "html-css") {
    return <HtmlCssPreview item={item} size={size} interactive={interactive} />;
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
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        pointerEvents: interactive ? undefined : "none",
      }}
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
