import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useServerFn } from "@tanstack/react-start";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { recordReferral } from "@/lib/admin.functions";
import { PlanProvider } from "@/hooks/usePlan";
import { SignInPromptProvider } from "@/hooks/useSignInPrompt";
import { SignInPrompt } from "@/components/SignInPrompt";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, Box, Compass, Search, Shapes } from "lucide-react";
import { usePageTracking } from "@/hooks/useAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import { FavouritesProvider } from "@/hooks/useFavourites";
import { CollectionsProvider } from "@/hooks/useCollections";
import { SearchHistoryProvider } from "@/hooks/useSearchHistory";
import MobileTabBar from "@/components/MobileTabBar";

const POPULAR_LINKS: { to: string; label: string }[] = [
  { to: "/tools", label: "All tools" },
  { to: "/app", label: "Icon library" },
  { to: "/pro", label: "Pro" },
  { to: "/categories", label: "Categories" },
  { to: "/tools/qr-generator", label: "QR generator" },
  { to: "/tools/image-compressor", label: "Image compressor" },
  { to: "/tools/password-generator", label: "Password generator" },
];

function NotFoundComponent() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <div className="hero-glow relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative w-full max-w-xl text-center">
        {/* Decorative branded illustration: gradient numerals + floating icon chips */}
        <div
          className="relative mx-auto mb-4 flex h-44 items-center justify-center sm:h-60"
          aria-hidden="true"
        >
          <span className="text-gradient font-display text-[6.5rem] font-bold leading-none tracking-tight sm:text-[10rem]">
            404
          </span>
          <span
            className="animate-float absolute left-[4%] top-[10%] hidden h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-soft sm:flex"
            style={{ animationDelay: "-1.5s" }}
          >
            <Search className="h-5 w-5" />
          </span>
          <span
            className="animate-float absolute right-[6%] top-[22%] hidden h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-soft sm:flex"
            style={{ animationDelay: "-3.2s" }}
          >
            <Compass className="h-6 w-6" />
          </span>
          <span
            className="animate-float absolute bottom-[8%] left-[14%] hidden h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-soft sm:flex"
            style={{ animationDelay: "-5s" }}
          >
            <Shapes className="h-4 w-4" />
          </span>
          <span
            className="animate-float absolute bottom-[18%] right-[12%] hidden h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-soft sm:flex"
            style={{ animationDelay: "-2.4s" }}
          >
            <Box className="h-5 w-5" />
          </span>
        </div>

        <p className="eyebrow">Error 404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Lost in the icon vault?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
          This page wandered off, moved, or never existed. Search the tools or hop to a popular
          spot below.
        </p>

        <form
          className="mx-auto mt-8 flex max-w-md items-center gap-2"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/tools", search: { q: query } });
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 579 free tools..."
              aria-label="Search tools"
              className="focus-ring h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="focus-ring inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Search
          </button>
        </form>

        <nav aria-label="Popular pages" className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Popular destinations
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="focus-ring inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mt-10">
          <Link
            to="/"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="focus-ring inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="focus-ring inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "IconVault - 421,020 open-source icons" },
      {
        name: "description",
        content:
          "Search, preview and export 421,020 open-source icons from 239 collections. Copy as React, Vue, SVG or Tailwind in one click.",
      },
      { name: "author", content: "IconVault" },
      { property: "og:title", content: "IconVault - 421,020 open-source icons" },
      {
        property: "og:description",
        content:
          "Search, preview and export 421,020 open-source icons from 239 collections in one clean workspace.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "IconVault" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "IconVault",
          url: "https://iconvault.site",
          description:
            "IconVault indexes 421,020 open-source icons from 239 collections so you can search, preview and export them in one place.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "IconVault",
          url: "https://iconvault.site",
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: "https://iconvault.site/app?q={search_term_string}" },
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://cdn.jsdelivr.net" },
      { rel: "dns-prefetch", href: "https://cdn.jsdelivr.net" },
      { rel: "preconnect", href: "https://unpkg.com" },
      { rel: "dns-prefetch", href: "https://unpkg.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "64x64" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://unpkg.com" />
        <link rel="dns-prefetch" href="https://unpkg.com" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AnalyticsTracker() {
  usePageTracking();
  return null;
}

/**
 * Captures ?ref=<user-id> on first load and attributes the signup to the
 * referrer. Runs once per page load, only when a user is signed in; the
 * param is left in place for logged-out visitors so a later sign-in can
 * still record it. Silent fail.
 */
function ReferralCapture() {
  const { user, loading } = useAuth();
  const record = useServerFn(recordReferral);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || loading || !user) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (!code) return;
    done.current = true;
    record({ data: { code } }).catch(() => {
      /* silent */
    });
    params.delete("ref");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
    );
  }, [user, loading, record]);
  return null;
}

/**
 * Reports client-side errors to /api/log-error. Fire-and-forget, capped at
 * 5 reports per page load so a crash loop can't spam the endpoint.
 */
function ErrorReporter() {
  useEffect(() => {
    let count = 0;
    const send = (message: string, stack?: string) => {
      if (count >= 5) return;
      count += 1;
      try {
        void fetch("/api/log-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, stack: stack ?? null, url: window.location.href }),
        });
      } catch {
        /* reporting must never break the page */
      }
    };
    const onError = (event: ErrorEvent) => {
      send(event.message || "window error", event.error?.stack);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "unhandled rejection");
      send(message, reason instanceof Error ? reason.stack : undefined);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

/**
 * Scroll to top on route pathname changes (e.g. opening a tool from a
 * related-tools link at the bottom of a page). Search-param-only changes
 * (like /tools?category= switches) keep the scroll position.
 */
function ScrollToTop() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prev = useRef(pathname);
  useEffect(() => {
    if (prev.current !== pathname) {
      prev.current = pathname;
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // The private admin entrance is a standalone screen: no app chrome, no tab bar.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bare = pathname.startsWith("/admin-login");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ReferralCapture />
        <ErrorReporter />
        <PlanProvider>
        <SignInPromptProvider>
          <FavouritesProvider>
            <CollectionsProvider>
              <SearchHistoryProvider>
                <TooltipProvider delayDuration={200}>
                  <AnalyticsTracker />
                  <ScrollToTop />
                  <div className={bare ? undefined : "pb-[4.5rem] lg:pb-0"}>
                    {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                    <Outlet />
                  </div>
                  {!bare && <MobileTabBar />}
                  <SignInPrompt />
                  <CookieConsent />
                  <Toaster position="bottom-right" />
                </TooltipProvider>
              </SearchHistoryProvider>
            </CollectionsProvider>
          </FavouritesProvider>
        </SignInPromptProvider>
        </PlanProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
