/**
 * Google Analytics 4 (GA4) integration.
 *
 * HOW TO CONNECT (Sameer): paste the Measurement ID from GA4 here and
 * redeploy — nothing else needs changing. GA4 → Admin → Data Streams →
 * your Web stream → Measurement ID (looks like G-XXXXXXXXXX). The ID is
 * public by design (it ships in the page source), so sharing it in chat
 * is safe.
 *
 * PRIVACY RULE (matches the site's existing analytics): gtag is NEVER
 * loaded and no page-view is EVER sent before the visitor accepts cookies.
 * usePageTracking() only calls trackGaPageView() after hasAnalyticsConsent()
 * passes, and gtag's own automatic page_view is disabled (send_page_view:
 * false) so SPA route changes send exactly one page_view each, via
 * trackGaPageView(). With an empty ID this module is a complete no-op.
 */

export const GA_MEASUREMENT_ID = "G-YHLK41998C";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let gtagLoaded = false;

/** Inject gtag.js once. Returns false when there is no ID or no window. */
export function ensureGtag(): boolean {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return false;
  if (gtagLoaded) return true;
  try {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer ?? [];
    const gtag = (...args: unknown[]) => {
      (window.dataLayer as unknown[]).push(args);
    };
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
    gtagLoaded = true;
    return true;
  } catch {
    return false;
  }
}

/** Send one page_view for an SPA route change. No-op without ID/consent. */
export function trackGaPageView(page: string): void {
  try {
    if (!ensureGtag()) return;
    window.gtag?.("event", "page_view", { page_path: page });
  } catch {
    /* analytics is best-effort */
  }
}
