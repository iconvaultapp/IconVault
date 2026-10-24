/**
 * Shared SVG sanitizer (fixes SEC-M1 + SEC-M2 + SEC-L8).
 *
 * Client-only: DOMPurify throws during SSR, so it is loaded with a dynamic
 * import and this helper must only run in effects / event handlers (never
 * during render). Callers sanitize once at load time; later string swaps
 * (recolouring hex values, forcing currentColor fills) cannot introduce
 * markup, so the sanitized string stays safe downstream.
 *
 * Policy: SVG elements only, with the dangerous ones explicitly forbidden.
 * DOMPurify already strips event-handler attributes, javascript: URLs and
 * comments by default; the FORBID_TAGS list below covers what the SVG
 * profile would otherwise allow (foreignObject can smuggle HTML, animate/
 * set can re-trigger scripted behaviour).
 */
export async function sanitizeSvg(svg: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [
      "script",
      "style",
      "foreignObject",
      "animate",
      "animateTransform",
      "animateMotion",
      "set",
      "iframe",
      "object",
      "embed",
      "link",
      "meta",
    ],
  }) as string;
}
