import { cn } from "@/lib/utils";

/**
 * Friendly abstract empty-state illustration: soft gradient blobs, a
 * document card and orbiting dots, in the teal brand palette. Pure SVG,
 * theme-token driven so it works in light and dark mode.
 */
export function EmptyStateIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={cn("h-28 w-auto", className)}
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="es-blob" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} />
        </linearGradient>
        <linearGradient id="es-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--card)" />
          <stop offset="100%" stopColor="var(--muted)" stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id="es-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.55} />
        </linearGradient>
      </defs>

      {/* soft background blob */}
      <ellipse cx="100" cy="70" rx="86" ry="56" fill="url(#es-blob)" />

      {/* document card */}
      <g transform="rotate(-6 100 70)">
        <rect x="72" y="34" width="56" height="72" rx="10" fill="url(#es-card)" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="82" y="48" width="36" height="5" rx="2.5" fill="var(--primary)" opacity={0.5} />
        <rect x="82" y="59" width="28" height="5" rx="2.5" fill="var(--muted-foreground)" opacity={0.3} />
        <rect x="82" y="70" width="32" height="5" rx="2.5" fill="var(--muted-foreground)" opacity={0.22} />
        <rect x="82" y="81" width="22" height="5" rx="2.5" fill="var(--muted-foreground)" opacity={0.15} />
      </g>

      {/* magnifier */}
      <g transform="translate(128 88)">
        <circle cx="0" cy="0" r="16" fill="none" stroke="url(#es-teal)" strokeWidth="5" />
        <line x1="11" y1="11" x2="22" y2="22" stroke="url(#es-teal)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="0" cy="0" r="16" fill="white" opacity={0.12} />
      </g>

      {/* orbiting dots */}
      <circle cx="48" cy="46" r="5" fill="var(--primary)" opacity={0.35} />
      <circle cx="36" cy="92" r="3.5" fill="var(--chart-2)" opacity={0.4} />
      <circle cx="160" cy="44" r="4" fill="var(--chart-3)" opacity={0.35} />
      <circle cx="66" cy="116" r="3" fill="var(--primary)" opacity={0.25} />

      {/* sparkles */}
      <path d="M150 108 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="var(--primary)" opacity={0.4} />
      <path d="M42 66 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5 z" fill="var(--chart-2)" opacity={0.45} />
    </svg>
  );
}

/** Empty state block: illustration + message, for tables and lists. */
export function EmptyState({
  title = "Nothing here yet.",
  hint,
  action,
}: {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <EmptyStateIllustration />
      <p className="mt-4 font-display text-base font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
