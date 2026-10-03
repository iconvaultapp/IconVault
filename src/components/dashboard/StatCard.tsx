import type { ReactNode } from "react";
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
  /** Small tinted-square background for the icon; defaults to primary-soft. */
  iconClassName?: string;
  action?: ReactNode;
}

/** Rounded metric card: tinted icon square, big number, small delta line. */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  tone = "neutral",
  icon: Icon,
  iconClassName,
  action,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            iconClassName ?? "bg-primary-soft text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        {action}
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {(delta || deltaLabel) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold tabular-nums",
                tone === "up" && "text-success",
                tone === "down" && "text-destructive",
                tone === "neutral" && "text-muted-foreground",
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
    </div>
  );
}
