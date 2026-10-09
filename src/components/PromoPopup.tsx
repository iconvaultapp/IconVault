// Lifetime-deal promo popup - $12 founding-member offer, first 100 only.
// Shows a few seconds after load, dismissible (X, backdrop, "Later"),
// and reappears after 30 minutes ("keeps coming") - never for pro users
// or admin pages. Uses the site's teal theme tokens.

import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { X, Crown, Check, Infinity as InfinityIcon, Zap, Download, Flame } from "lucide-react";
import { usePlan, LIFETIME_PRICE } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "iv_promo_popup_v2";
const SHOW_DELAY_MS = 6000;
const REAPPEAR_AFTER_MS = 30 * 60 * 1000; // 30 minutes
const FOUNDER_LIMIT = 100;

function shouldShow(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const { dismissedAt } = JSON.parse(raw) as { dismissedAt: number };
    return Date.now() - dismissedAt > REAPPEAR_AFTER_MS;
  } catch {
    return true;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
  } catch {
    /* storage unavailable - popup just shows again next load */
  }
}

const PERKS = [
  { icon: Zap, label: "Unlimited tools & icon downloads" },
  { icon: Download, label: "Bulk export + HD downloads" },
  { icon: InfinityIcon, label: "Pay once, yours forever" },
];

export default function PromoPopup() {
  const [visible, setVisible] = useState(false);
  const [claimed, setClaimed] = useState<number | null>(null);
  const { isPro } = usePlan();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const skip = pathname.startsWith("/admin") || pathname.startsWith("/api");

  useEffect(() => {
    if (skip || isPro) return;
    if (!shouldShow()) return;
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [skip, isPro]);

  // Re-check periodically so the popup "keeps coming" during long sessions.
  useEffect(() => {
    if (skip || isPro || visible) return;
    const t = setInterval(() => {
      if (shouldShow()) setVisible(true);
    }, 60_000);
    return () => clearInterval(t);
  }, [skip, isPro, visible]);

  // Fetch the real claimed count when the popup opens.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    fetch("/api/billing/lifetime-count")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.claimed === "number") setClaimed(Math.min(d.claimed, FOUNDER_LIMIT));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [visible]);

  if (!visible || skip || isPro) return null;

  const close = () => {
    markDismissed();
    setVisible(false);
  };

  const left = claimed === null ? null : Math.max(FOUNDER_LIMIT - claimed, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lifetime deal"
      className="animate-fade-in fixed inset-0 z-[120] grid place-items-center bg-ink/50 p-4 backdrop-blur-[2px]"
      onClick={close}
    >
      <div
        className="animate-pop relative w-full max-w-sm overflow-hidden rounded-3xl bg-surface shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        {/* teal header band */}
        <div className="relative bg-primary px-6 pb-8 pt-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
            <Flame className="h-3.5 w-3.5" /> First {FOUNDER_LIMIT} only
          </span>
          <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-primary-foreground">
            Every icon, every tool.
            <br />
            One payment.
          </h2>
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
            {[...Array(24)].map((_, i) => (
              <span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-primary-foreground"
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 53) % 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full bg-ink/20 p-1.5 text-primary-foreground transition hover:bg-ink/35"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-5">
          <div className="flex items-end justify-center gap-2">
            <span className="font-display text-5xl font-semibold tracking-tight text-foreground">
              ${LIFETIME_PRICE}
            </span>
            <span className="pb-1.5 text-sm font-medium text-muted-foreground">one-time · lifetime</span>
          </div>
          {claimed !== null && left !== null && left > 0 && (
            <p className="mt-1 text-center font-mono text-[11px] font-semibold text-amber-700">
              {claimed} of {FOUNDER_LIMIT} claimed - {left} spots left
            </p>
          )}

          <ul className="mt-5 space-y-2.5">
            {PERKS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-foreground">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{label}</span>
                <Check className="ml-auto h-4 w-4 shrink-0 text-accent" />
              </li>
            ))}
          </ul>

          <Link
            to="/pro"
            onClick={close}
            className={cn(
              "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5",
              "text-[15px] font-bold text-primary-foreground shadow-lift transition hover:opacity-90",
            )}
          >
            <Crown className="h-4 w-4" /> Get lifetime access – ${LIFETIME_PRICE}
          </Link>
          <button
            onClick={close}
            className="mt-2 w-full py-2 text-center text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Later
          </button>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            Secure checkout · Free plan stays free forever
          </p>
        </div>
      </div>
    </div>
  );
}
