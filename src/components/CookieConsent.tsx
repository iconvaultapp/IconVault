import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  getCookieConsent,
  notifyConsentAccepted,
  setCookieConsent,
} from "@/lib/cookie-consent";

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  // Show only when the visitor has not made a choice yet.
  useEffect(() => {
    if (getCookieConsent() !== null) return;
    const timer = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  // Footer "Cookie settings" link re-opens the banner.
  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!visible) return null;

  const choose = (choice: "accepted" | "declined") => {
    setCookieConsent(choice);
    setVisible(false);
    // Let pending page-view tracking fire now that consent exists.
    if (choice === "accepted") notifyConsentAccepted();
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="pointer-events-none fixed inset-x-0 z-[60] px-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <div className="animate-slide-up pointer-events-auto mx-auto max-w-2xl rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">We use cookies</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              IconVault stores a small entry in your browser to remember this choice, keeps you
              signed in with an auth session cookie, and uses first-party analytics to improve the
              site. We do not run advertising trackers.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => choose("declined")}
              >
                Decline
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => choose("accepted")}
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
