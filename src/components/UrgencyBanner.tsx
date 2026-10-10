// UrgencyBanner - slim "First 100 only" strip, inspired by IconsRoom's early-bird bar.
// Sits below the site header and scrolls away with the page (NOT sticky).
// Hidden for pro users and on dashboard/pricing pages. Links to /pro.

import { Link, useRouterState } from "@tanstack/react-router";
import { Crown, ArrowRight } from "lucide-react";
import { usePlan, LIFETIME_PRICE } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = ["/admin", "/profile", "/api", "/pro"];

export default function UrgencyBanner() {
  const { isPro } = usePlan();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPro || hidden) return null;

  return (
    <div className="bg-background px-4 pt-3 sm:px-6">
      <Link
        to="/pro"
        aria-label="Get IconVault lifetime access"
        className={cn(
          "focus-ring mx-auto flex max-w-2xl items-center justify-between gap-3",
          "rounded-2xl border border-primary/25 bg-primary-soft px-4 py-2.5",
          "transition-colors hover:bg-primary/15",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Crown className="h-4 w-4" />
          </span>
          <span className="truncate text-sm text-foreground">
            <span className="font-bold">First 100 only</span>
            <span className="hidden sm:inline"> · IconVault Lifetime</span>
            <span className="font-bold text-primary"> ${LIFETIME_PRICE}</span>
            <span className="text-muted-foreground"> once</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground">
          <span className="hidden sm:inline">Get Lifetime</span>
          <span className="sm:hidden">Get</span>
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}
