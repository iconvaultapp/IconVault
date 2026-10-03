import { useId } from "react";

/** Lightweight SVG charts. No dependencies, responsive via viewBox. */

const TEAL = "var(--chart-1)";
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

export interface BarDatum {
  label: string;
  value: number;
}

/** Vertical bar chart with value labels on hover (title) and axis labels. */
export function BarChart({
  data,
  height = 220,
  barColor = TEAL,
  ariaLabel,
}: {
  data: BarDatum[];
  height?: number;
  barColor?: string;
  ariaLabel?: string;
}) {
  const W = 640;
  const H = height;
  const padL = 36;
  const padB = 28;
  const padT = 12;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const innerW = W - padL - 8;
  const innerH = H - padT - padB;
  const n = Math.max(data.length, 1);
  const slot = innerW / n;
  const barW = Math.min(28, Math.max(8, slot * 0.55));

  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel ?? `Bar chart with ${data.length} bars`}
    >
      {ticks.map((t) => {
        const y = padT + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              {t}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * innerH : 0;
        const x = padL + slot * i + (slot - barW) / 2;
        const y = padT + innerH - h;
        return (
          <g key={`${d.label}-${i}`}>
            <title>{`${d.label}: ${d.value}`}</title>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={4}
              fill={barColor}
              opacity={0.9}
            />
            {n <= 16 && (
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted-foreground)"
              >
                {d.label.length > 8 ? `${d.label.slice(0, 7)}…` : d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Smooth line chart with soft area fill. */
export function LineChart({
  data,
  labels,
  height = 220,
  lineColor = TEAL,
  ariaLabel,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  lineColor?: string;
  ariaLabel?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const W = 640;
  const H = height;
  const padL = 36;
  const padB = 28;
  const padT = 12;
  const max = niceMax(Math.max(...data, 0));
  const innerW = W - padL - 8;
  const innerH = H - padT - padB;
  const n = data.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (max > 0 ? (v / max) * innerH : 0);

  const linePath =
    n === 0
      ? ""
      : data
          .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
          .join(" ");
  const areaPath =
    n === 0
      ? ""
      : `${linePath} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const labelStep = n > 12 ? Math.ceil(n / 8) : 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel ?? `Line chart with ${n} points`}
    >
      <defs>
        <linearGradient id={`lg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {ticks.map((t) => {
        const ty = padT + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={ty} y2={ty} stroke="var(--border)" strokeDasharray="3 3" />
            <text x={padL - 8} y={ty + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              {t}
            </text>
          </g>
        );
      })}
      {areaPath && <path d={areaPath} fill={`url(#lg-${gid})`} />}
      {linePath && (
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {data.map((v, i) => (
        <g key={i}>
          <title>{`${labels?.[i] ?? `Point ${i + 1}`}: ${v}`}</title>
          <circle cx={x(i)} cy={y(v)} r={3} fill={lineColor} stroke="var(--card)" strokeWidth={1.5} />
          {labels?.[i] && i % labelStep === 0 && (
            <text
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {labels[i]!.length > 8 ? `${labels[i]!.slice(0, 7)}…` : labels[i]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

/** Donut chart with center total and a legend. */
export function DonutChart({
  segments,
  size = 190,
  thickness = 30,
  ariaLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  ariaLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;

  const arcs = segments.map((s, i) => {
    const frac = total > 0 ? s.value / total : 0;
    const start = angle;
    const end = angle + frac * Math.PI * 2;
    angle = end;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    return { ...s, i, d: `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`, color: s.color ?? CHART_COLORS[i % CHART_COLORS.length] };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="shrink-0"
        role="img"
        aria-label={ariaLabel ?? `Donut chart with ${segments.length} segments`}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--muted)" strokeWidth={thickness} opacity={0.4} />
        {arcs.map((a) =>
          a.value > 0 ? (
            <g key={a.i}>
              <title>{`${a.label}: ${a.value}`}</title>
              <path d={a.d} fill="none" stroke={a.color} strokeWidth={thickness} strokeLinecap="butt" />
            </g>
          ) : null,
        )}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--foreground)" className="tabular-nums">
          {total}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
          total
        </text>
      </svg>
      <ul className="grid w-full gap-2">
        {arcs.map((a) => (
          <li key={a.i} className="flex items-center gap-2.5 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: a.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate capitalize text-muted-foreground">{a.label}</span>
            <span className="font-semibold tabular-nums">{a.value}</span>
            {total > 0 && (
              <span className="w-11 text-right text-xs tabular-nums text-muted-foreground">
                {Math.round((a.value / total) * 100)}%
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
