// The pastel icon panel shared by the set / category cards (Sameer
// 2026-10-23): a soft-coloured rounded panel filled with a 3x3 grid of
// large real icons, the set's own stable tint behind them. Name and count
// live below the panel in the card itself, like the reference style grid.
import ReliableIcon from "@/components/ReliableIcon";
import { tintFor } from "@/lib/card-tints";

export interface PanelIcon {
  key: string;
  prefix: string;
  name: string;
}

export function IconPanel({
  tintKey,
  icons,
  size = 40,
  placeholders = 9,
}: {
  tintKey: string;
  icons: PanelIcon[];
  size?: number;
  placeholders?: number;
}) {
  return (
    <span
      className="grid grid-cols-3 gap-x-2 gap-y-5 rounded-[1.5rem] px-4 py-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lift"
      style={{ backgroundColor: tintFor(tintKey) }}
    >
      {icons.length > 0
        ? icons.map((icon, i) => (
            <span
              key={icon.key}
              className="grid place-items-center transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110"
              style={{ transitionDelay: `${i * 35}ms` }}
            >
              <ReliableIcon
                prefix={icon.prefix}
                name={icon.name}
                alt=""
                width={size}
                height={size}
                className="opacity-90 transition-opacity group-hover:opacity-100"
              />
            </span>
          ))
        : Array.from({ length: placeholders }, (_, i) => (
            <span key={i} className="grid place-items-center">
              <span
                className="animate-pulse rounded-lg bg-black/[0.07]"
                style={{ width: size, height: size }}
              />
            </span>
          ))}
    </span>
  );
}
