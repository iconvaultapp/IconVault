import { useId, type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** e.g. "+12%". Pass `tone` to control color. */
  delta?: string;
  deltaLabel?: string;
  tone?: "up" | "down" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  /** Small tinted-square background for the icon; defaults to a teal gradient chip. */
  iconClassName?: string;
  action?: ReactNode;
  /** Tiny trend line rendered under the value. */
  sparkline?: number[];
  /** Stroke color for the sparkline; defaults to the theme primary. */
  sparklineColor?: string;
}

/** Tiny inline SVG trend line. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const W = 120;
  const H = 34;
  const P = 4;
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2);
    const y = H - P - ((v - min) / range) * (H - P * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}` as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const area = `${line} L${(W - P).toFixed(1)},${H} L${P.toFixed(1)},${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 h-8 w-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={pts[pts.length - 1]!.split(",")[0]}
        cy={pts[pts.length - 1]!.split(",")[1]}
        r={3}
        fill={color}
        stroke="var(--card)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

/**
 * Premium metric card: gradient icon chip, big tabular number, delta line,
 * optional sparkline. Lifts slightly on hover.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  tone = "neutral",
  icon: Icon,
  iconClassName,
  action,
  sparkline,
  sparklineColor,
}: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        {action}
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
      {(delta || deltaLabel) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums",
                tone === "up" && "bg-success/10 text-success",
                tone === "down" && "bg-destructive/10 text-destructive",
                tone === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {tone === "up" && <TrendingUp className="h-3.5 w-3.5" />}
              {tone === "down" && <TrendingDown className="h-3.5 w-3.5" />}
              {delta}
            </span>
          )}
          {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
        </p>
      )}
      {sparkline && sparkline.length >= 2 && (
        <Sparkline data={sparkline} color={sparklineColor ?? "var(--primary)"} />
      )}
    </div>
  );
}
