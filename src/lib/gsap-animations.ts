// IconVault v56 - GSAP integration (single shared entry point).
//
// GSAP (GreenSock, standard free licence) is used for subtle entrance and
// scroll animations on MARKETING pages only: the homepage "New in v56"
// cards and the /animated-backgrounds intro. It is NOT wired into /about
// (deliberate v56 decision: /about already animates with the existing
// Reveal component, and double animation would risk visual glitches).
// It is never used on tool, icon or download pages.
//
// Loading rules (performance):
// - GSAP is never in the entry chunk. It is loaded with dynamic import()
//   only when an animated element scrolls near the viewport, and only once
//   (the import promise is cached). The caller's IntersectionObserver is
//   the scroll gate, so no ScrollTrigger plugin is needed and nothing can
//   get stuck at opacity 0 waiting for a trigger that already passed.
// - prefers-reduced-motion is respected: loadGsap() resolves to null and
//   animateFadeUp() becomes a no-op, so content is simply shown as-is.
// - GreenSock licence notices ship inside the gsap package itself; nothing
//   here strips, rewrites or hides them.
//
// Licence boundary (do not cross): the only prohibition in the GSAP
// standard licence is building no-code visual animation builders that
// compete with Webflow. IconVault builds no such builder; this file only
// animates IconVault's own marketing sections.

import type gsap from "gsap";

let gsapPromise: Promise<typeof gsap | null> | null = null;

/** True when the visitor asked for reduced motion, or when rendering on the server. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Lazily load GSAP, exactly once. Returns null on the server, when reduced
 * motion is preferred, or when the chunk fails to load (callers then leave
 * content unanimated).
 */
export async function loadGsap(): Promise<typeof gsap | null> {
  if (typeof window === "undefined" || prefersReducedMotion()) return null;
  if (!gsapPromise) {
    gsapPromise = (async () => {
      try {
        const gsapModule = await import("gsap");
        return gsapModule.default;
      } catch {
        return null;
      }
    })();
  }
  return gsapPromise;
}

/**
 * Subtle fade-up for every [data-gsap="fade-up"] element inside `scope`
 * (or `scope` itself when it carries the attribute). Callers only invoke
 * this once the element is already near the viewport, so the animation
 * always plays and clearProps restores the element afterwards.
 * No-op when GSAP did not load (reduced motion, SSR, chunk failure).
 */
export async function animateFadeUp(scope: HTMLElement | null): Promise<void> {
  if (!scope) return;
  const instance = await loadGsap();
  if (!instance) return;
  const targets: HTMLElement[] = scope.matches('[data-gsap="fade-up"]')
    ? [scope]
    : Array.from(scope.querySelectorAll<HTMLElement>('[data-gsap="fade-up"]'));
  if (targets.length === 0) return;
  targets.forEach((target, i) => {
    instance.fromTo(
      target,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay: Math.min(i * 0.06, 0.3),
        ease: "power2.out",
        clearProps: "all",
      },
    );
  });
}
