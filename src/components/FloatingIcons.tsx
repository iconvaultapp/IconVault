// Floating background icon chips for hero sections.
// Rendered from lucide-react (already in the bundle) so they cost zero
// extra requests. Each chip drifts with the theme's float animation and
// nudges on hover.

import {
  Sparkles,
  Rocket,
  Heart,
  ShoppingCart,
  Command,
  Layers,
  Paintbrush,
  Zap,
  Code2,
  Palette,
  Star,
  Figma,
  Globe,
  Image,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CHIPS: { Icon: LucideIcon; className: string; delay: string; size: string }[] = [
  { Icon: Sparkles, className: "left-[4%] top-[12%]", delay: "0s", size: "h-5 w-5" },
  { Icon: Rocket, className: "left-[10%] top-[64%]", delay: "1.2s", size: "h-4 w-4" },
  { Icon: Heart, className: "left-[16%] top-[30%]", delay: "2.1s", size: "h-4 w-4" },
  { Icon: ShoppingCart, className: "left-[7%] top-[42%]", delay: "0.6s", size: "h-5 w-5" },
  { Icon: Command, className: "left-[22%] top-[78%]", delay: "1.8s", size: "h-4 w-4" },
  { Icon: Layers, className: "right-[6%] top-[14%]", delay: "0.9s", size: "h-5 w-5" },
  { Icon: Paintbrush, className: "right-[12%] top-[58%]", delay: "2.4s", size: "h-4 w-4" },
  { Icon: Zap, className: "right-[18%] top-[32%]", delay: "1.5s", size: "h-5 w-5" },
  { Icon: Code2, className: "right-[8%] top-[80%]", delay: "0.3s", size: "h-4 w-4" },
  { Icon: Palette, className: "right-[24%] top-[70%]", delay: "2.8s", size: "h-4 w-4" },
  { Icon: Star, className: "left-[28%] top-[10%]", delay: "1.1s", size: "h-4 w-4" },
  { Icon: Figma, className: "right-[28%] top-[12%]", delay: "2.0s", size: "h-4 w-4" },
  { Icon: Globe, className: "left-[34%] top-[84%]", delay: "0.7s", size: "h-4 w-4" },
  { Icon: Image, className: "right-[33%] top-[86%]", delay: "1.6s", size: "h-4 w-4" },
];

export default function FloatingIcons({ dim = false }: { dim?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {CHIPS.map(({ Icon, className, delay, size }, i) => (
        <div
          key={i}
          className={cn(
            "absolute animate-float rounded-2xl border border-border bg-surface/80 p-2.5 shadow-soft backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:scale-110 hover:rotate-6",
            className,
            dim && "opacity-60",
          )}
          style={{ animationDelay: delay }}
        >
          <Icon className={cn(size, i % 3 === 0 ? "text-primary" : i % 3 === 1 ? "text-accent" : "text-muted-foreground")} />
        </div>
      ))}
    </div>
  );
}
