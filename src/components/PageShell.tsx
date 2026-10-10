import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import UrgencyBanner from "@/components/UrgencyBanner";
import SiteFooter from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

interface PageShellProps {
  eyebrow?: string;
  /** Optional: when omitted, the hero band is skipped (page renders its own header). */
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  /** Wide content for /tools pages: capped at 1440px, comfortable side gaps. */
  fullWidth?: boolean;
  /** Compact hero on mobile only (tighter spacing, slightly smaller title).
      Used by ToolPageShell so all 579 tool pages share one mobile hero. */
  compactHero?: boolean;
}

/** Shared shell for every inner page: header, hero band, content, footer. */
export const PageShell = ({
  eyebrow,
  title,
  description,
  actions,
  children,
  wide = false,
  fullWidth = false,
  compactHero = false,
}: PageShellProps) => (
  <div className="flex min-h-screen flex-col bg-background">
    <SiteHeader />
    <UrgencyBanner />
    <main className="flex-1">
      {title && (
      <section className="relative overflow-hidden border-b border-border bg-surface-2">
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-[-6rem] h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div
          className={cn(
            fullWidth
              ? "relative mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-12 text-center sm:px-6 sm:py-14"
              : cn(
                  "relative mx-auto grid gap-6 px-5 py-14 sm:py-16 lg:px-8",
                  wide ? "max-w-7xl" : "max-w-5xl",
                ),
            compactHero && "gap-4 py-8 sm:gap-6 sm:py-14",
          )}
        >
          <Reveal>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1
              className={cn(
                "mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl",
                compactHero && "text-3xl sm:text-5xl",
              )}
            >
              {title}
            </h1>
            {description && (
              <p
                className={cn(
                  "mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg",
                  fullWidth && "mx-auto",
                  compactHero && "mt-3 text-[15px] sm:mt-4 sm:text-lg",
                )}
              >
                {description}
              </p>
            )}
            {actions && (
              <div className={cn("mt-7 flex flex-wrap gap-3", fullWidth && "justify-center")}>
                {actions}
              </div>
            )}
          </Reveal>
        </div>
      </section>
      )}

      <div
        className={
          fullWidth
            ? "mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10"
            : cn("mx-auto px-5 py-14 lg:px-8", wide ? "max-w-7xl" : "max-w-5xl")
        }
      >
        {children}
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default PageShell;
