// IconVault v56 - GSAP entrance wrapper for MARKETING pages only.
// The wrapper div carries data-gsap="fade-up"; when it scrolls near the
// viewport, the GSAP chunk is lazy-loaded (see src/lib/gsap-animations.ts)
// and the div fades up once. With prefers-reduced-motion, or if the chunk
// fails, children render normally with no animation at all.
// Never use this on tool, icon or download pages.

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/gsap-animations";

interface GsapMotionProps {
  children: ReactNode;
  className?: string;
}

export const GsapMotion = ({ children, className }: GsapMotionProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        if (cancelled) return;
        void import("@/lib/gsap-animations").then(({ animateFadeUp }) => {
          if (!cancelled) void animateFadeUp(node);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} data-gsap="fade-up" className={className}>
      {children}
    </div>
  );
};

export default GsapMotion;
