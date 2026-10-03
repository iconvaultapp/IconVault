import { cn } from "@/lib/utils";

/**
 * Abstract welcome banner graphic: layered gradient waves, floating icon
 * tiles and orbit rings in the teal brand palette. Pure SVG + CSS
 * gradients, no external images, theme-token driven.
 */
export function WelcomeBannerArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 160"
      className={cn("h-full w-full", className)}
      role="img"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="wb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
          <stop offset="55%" stopColor="var(--chart-3)" stopOpacity={0.12} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
        </linearGradient>
        <linearGradient id="wb-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="wb-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--chart-3)" />
        </linearGradient>
        <radialGradient id="wb-glow" cx="0.7" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
        </radialGradient>
      </defs>

      <rect width="400" height="160" fill="url(#wb-bg)" />
      <rect width="400" height="160" fill="url(#wb-glow)" />

      {/* layered waves */}
      <path
        d="M0,108 C60,88 120,120 190,100 C260,80 320,110 400,92 L400,160 L0,160 Z"
        fill="url(#wb-wave)"
        opacity={0.7}
      />
      <path
        d="M0,128 C70,112 140,138 210,122 C280,106 340,130 400,118 L400,160 L0,160 Z"
        fill="var(--primary)"
        opacity={0.12}
      />

      {/* orbit rings */}
      <circle cx="318" cy="62" r="46" fill="none" stroke="var(--primary)" strokeOpacity={0.25} strokeWidth="1.5" strokeDasharray="4 5" />
      <circle cx="318" cy="62" r="30" fill="none" stroke="var(--primary)" strokeOpacity={0.18} strokeWidth="1.5" />

      {/* floating tiles */}
      <g transform="rotate(-8 318 62)">
        <rect x="296" y="40" width="44" height="44" rx="12" fill="url(#wb-tile)" opacity={0.9} />
        <path
          d="M310 62 l6 6 12 -13"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
        />
      </g>
      <g transform="rotate(10 262 104)">
        <rect x="246" y="88" width="32" height="32" rx="9" fill="var(--card)" stroke="var(--primary)" strokeOpacity={0.4} strokeWidth="1.5" />
        <circle cx="262" cy="104" r="6" fill="var(--primary)" opacity={0.7} />
      </g>
      <g transform="rotate(-12 366 108)">
        <rect x="354" y="96" width="24" height="24" rx="7" fill="var(--chart-2)" opacity={0.55} />
      </g>

      {/* bars motif */}
      <g opacity={0.5}>
        <rect x="52" y="118" width="10" height="22" rx="3" fill="var(--primary)" opacity={0.35} />
        <rect x="68" y="106" width="10" height="34" rx="3" fill="var(--primary)" opacity={0.5} />
        <rect x="84" y="124" width="10" height="16" rx="3" fill="var(--primary)" opacity={0.3} />
        <rect x="100" y="96" width="10" height="44" rx="3" fill="url(#wb-tile)" opacity={0.75} />
      </g>

      {/* dots */}
      <circle cx="190" cy="44" r="4" fill="var(--primary)" opacity={0.4} />
      <circle cx="214" cy="60" r="2.5" fill="var(--chart-2)" opacity={0.5} />
      <circle cx="160" cy="70" r="3" fill="var(--chart-3)" opacity={0.4} />
    </svg>
  );
}

/**
 * Welcome banner: greeting + subtitle on the left, abstract art on the
 * right. Used at the top of the admin overview.
 */
export function WelcomeBanner({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 sm:block" aria-hidden>
        <WelcomeBannerArt />
      </div>
      <div className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-r from-card via-card/60 to-transparent sm:w-1/2" aria-hidden />
      <div className="relative px-6 py-6 sm:px-8 sm:py-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Dashboard
        </p>
        <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{subtitle}</p>
        )}
        {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
    </div>
  );
}
