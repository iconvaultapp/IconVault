// Shared UI-component previews (extracted from the /ui-components route
// 2026-10-26: the homepage ComponentsHome section reuses them, and route
// files must never be imported by other routes, so they live here).
import { useCallback, useEffect, useRef, useState } from "react";
import type { UiComponentEntry } from "@/lib/ui-components-data";
import { cn } from "@/lib/utils";

/** Base page style shared by iframe previews and standalone downloads. */
const BASE_STYLE =
  "html,body{margin:0;min-height:100%;display:grid;place-items:center;padding:8px;box-sizing:border-box}body{font-family:system-ui,sans-serif}";

/** Full standalone document for a component: iframe previews + .html downloads. */
export function standaloneDoc(entry: UiComponentEntry): string {
  const style = entry.css
    ? `<style>\n${entry.css}\n</style>`
    : `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>\n<!-- This component uses Tailwind CSS classes: paste it into a Tailwind project, or open this file with internet access for the CDN build. -->`;
  return `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${entry.title}</title>\n<style>${BASE_STYLE}</style>\n${style}\n</head>\n<body>\n${entry.html}\n</body>\n</html>`;
}

/**
 * Live preview. CSS components render in a sandboxed iframe so their
 * generic class names (.card, .cta, ...) can never leak into the page.
 * Pure-Tailwind components have no custom CSS, so they render inline with
 * the site's own Tailwind build.
 *
 * Visibility rule (Sameer 2026-10-26): EVERY component must be fully
 * visible in BOTH the grid card and the modal. The preview area grows to
 * the component's own height (grid cap 480px, modal cap 560px); taller
 * than the cap, it scales down to fit the cap. Never clipped, never
 * scrolled inside the preview. No padding is ever put on the preview
 * element itself: it corrupts the fit math (v36 modal bug — p-6 on the
 * iframe made clientHeight differ from the viewport height).
 *
 * Measurement must be robust: scroll size alone misses
 * absolutely-positioned and 3D-transformed content (flip cards, floating
 * decorations), so we take the union of the scroll size and every
 * descendant's post-transform bounding box.
 */
const FLUID_MIN = 96;

/** Union of scroll size + every descendant's bounding box, relative to
 * the container's top-left. Covers absolute + 3D-transformed content. */
function measureUnionSize(container: HTMLElement): { w: number; h: number } {
  const origin = container.getBoundingClientRect();
  let w = container.scrollWidth;
  let h = container.scrollHeight;
  const els = container.querySelectorAll("*");
  for (const el of Array.from(els)) {
    const r = (el as HTMLElement).getBoundingClientRect();
    if (!r.width && !r.height) continue;
    w = Math.max(w, r.right - origin.left);
    h = Math.max(h, r.bottom - origin.top);
  }
  return { w, h };
}

function IframePreview({
  entry,
  lazy,
  fluidCap,
}: {
  entry: UiComponentEntry;
  lazy?: boolean | undefined;
  fluidCap: number;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [fluidHeight, setFluidHeight] = useState(fluidCap >= 560 ? 320 : 176);

  const fit = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc || !doc.body) return;
    // Reset first: a previous zoom would corrupt the measurement.
    doc.body.style.setProperty("zoom", "1");
    const stageW = frame.clientWidth;
    const { w: contentW, h: contentH } = measureUnionSize(doc.body);
    if (!stageW || !contentW || !contentH) return;
    // Fit the width, grow the height to the component (capped).
    const scale = Math.min(1, stageW / contentW, fluidCap / contentH);
    if (!Number.isFinite(scale) || scale <= 0) return;
    doc.body.style.setProperty("zoom", String(scale));
    setFluidHeight(
      Math.min(fluidCap + 2, Math.max(FLUID_MIN, Math.ceil(contentH * scale) + 2)),
    );
    doc.documentElement.style.setProperty("overflow", "hidden");
    doc.body.style.setProperty("overflow", "hidden");
  }, [fluidCap]);

  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  return (
    <iframe
      ref={frameRef}
      title={`${entry.title} preview`}
      // allow-same-origin (and deliberately NO allow-scripts) so the
      // parent can measure the preview document. Safe because curated
      // entries carry no scripts, handlers or javascript: URIs (verified
      // on every data build), and the sandbox still blocks forms,
      // popups and top navigation.
      sandbox="allow-same-origin"
      scrolling="no"
      loading={lazy ? "lazy" : undefined}
      onLoad={fit}
      srcDoc={standaloneDoc(entry)}
      style={{ height: fluidHeight }}
      className="w-full overflow-hidden border-0 bg-white"
    />
  );
}

function InlinePreview({
  entry,
  fluidCap,
}: {
  entry: UiComponentEntry;
  fluidCap: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [fluidHeight, setFluidHeight] = useState(fluidCap >= 560 ? 320 : 176);

  const fit = useCallback(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content) return;
    // Reset first: a previous zoom would corrupt the measurement.
    content.style.setProperty("zoom", "1");
    void content.offsetWidth;
    const stageW = stage.clientWidth;
    const { w: contentW, h: contentH } = measureUnionSize(content);
    if (!stageW || !contentW || !contentH) return;
    const next = Math.min(1, stageW / contentW, fluidCap / contentH);
    if (!Number.isFinite(next) || next <= 0) return;
    setScale(next);
    setFluidHeight(
      Math.min(fluidCap + 2, Math.max(FLUID_MIN, Math.ceil(contentH * next) + 2)),
    );
  }, [fluidCap]);

  useEffect(() => {
    fit();
    const timer = setTimeout(fit, 100);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", fit);
    };
  }, [fit, entry]);

  return (
    <div
      ref={stageRef}
      style={{ height: fluidHeight }}
      className="grid place-items-center overflow-hidden bg-white"
    >
      <div
        ref={contentRef}
        style={{ zoom: scale }}
        // Curated static strings from the bundled data file, never user input.
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />
    </div>
  );
}

export function ComponentPreview({
  entry,
  lazy,
  fluidCap,
}: {
  entry: UiComponentEntry;
  lazy?: boolean;
  fluidCap: number;
}) {
  if (!entry.css) return <InlinePreview entry={entry} fluidCap={fluidCap} />;
  return <IframePreview entry={entry} lazy={lazy} fluidCap={fluidCap} />;
}

/**
 * Speed (Sameer 2026-10-26): grid previews mount only when their card is
 * near the viewport. 24 simultaneous iframes, each parsing its own CSS and
 * running animations, were this page's real cost; below-fold cards now stay
 * a plain placeholder until scrolled near. The modal preview stays eager.
 */
export function LazyPreview({ entry }: { entry: UiComponentEntry }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      {mounted ? (
        <ComponentPreview entry={entry} lazy fluidCap={480} />
      ) : (
        <div className="h-44 w-full bg-white" aria-hidden="true" />
      )}
    </div>
  );
}
