import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CONSENT_ACCEPTED_EVENT, hasAnalyticsConsent } from "@/lib/cookie-consent";

const getSessionId = () => {
  let sid = sessionStorage.getItem("analytics_session");
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem("analytics_session", sid);
  }
  return sid;
};

export const usePageTracking = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPage = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const maybeSend = () => {
      const page = pathnameRef.current;
      if (!page || page === lastPage.current) return;
      // Privacy-first: never send page-views until the visitor accepts cookies.
      if (!hasAnalyticsConsent()) return;
      lastPage.current = page;

      void (async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          await supabase.from("analytics_events").insert({
            event_type: "page_view",
            page,
            user_id: user?.id ?? null,
            session_id: getSessionId(),
            metadata: { referrer: document.referrer },
          });
        } catch {
          /* analytics is best-effort */
        }
      })();
    };

    maybeSend();
    // If the visitor accepts mid-page, send the pending page-view right away.
    window.addEventListener(CONSENT_ACCEPTED_EVENT, maybeSend);
    return () => window.removeEventListener(CONSENT_ACCEPTED_EVENT, maybeSend);
  }, [pathname]);
};

export const trackEvent = async (eventType: string, metadata: Record<string, unknown> = {}) => {
  if (typeof window === "undefined") return;
  // Privacy-first: custom events use the same first-party analytics table.
  if (!hasAnalyticsConsent()) return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event_type: eventType,
      page: window.location.pathname,
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      metadata: metadata as never,
    });
  } catch {
    /* best-effort */
  }
};
