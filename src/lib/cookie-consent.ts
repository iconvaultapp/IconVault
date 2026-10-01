/**
 * Cookie consent helpers (IconVault).
 *
 * The site stores one localStorage entry for the visitor's consent choice.
 * First-party page-view analytics are only sent when the visitor has
 * accepted. Auth/session behaviour is untouched by this module.
 */

export const COOKIE_CONSENT_KEY = "iconvault-cookie-consent";

export type CookieConsentChoice = "accepted" | "declined";

/** Fired when the visitor accepts, so pending page-views can be sent. */
export const CONSENT_ACCEPTED_EVENT = "iconvault:consent-accepted";

/** Fired (e.g. from the footer) to re-open the consent banner. */
export const OPEN_COOKIE_SETTINGS_EVENT = "iconvault:open-cookie-settings";

export const getCookieConsent = (): CookieConsentChoice | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
};

export const setCookieConsent = (choice: CookieConsentChoice): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
  } catch {
    /* storage unavailable; banner will simply show again next visit */
  }
};

/** Privacy-first: analytics may only be sent after an explicit accept. */
export const hasAnalyticsConsent = (): boolean => getCookieConsent() === "accepted";

export const openCookieSettings = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
};

export const notifyConsentAccepted = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_ACCEPTED_EVENT));
};
