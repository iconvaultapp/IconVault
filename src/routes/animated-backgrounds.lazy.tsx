// /animated-backgrounds - v56 Vanta demo (the ONLY page that loads Vanta
// or three.js). Three effects, one at a time: waves, birds, fog.
//
// Loading rules:
// - three.js and the selected effect bundle are dynamic-imported only
//   after this page mounts, and only the selected effect is fetched.
//   Switching effects destroys the old one first.
// - Static gradient fallback: when WebGL is unavailable, when the effect
//   chunk fails to load, or when the visitor prefers reduced motion, the
//   stage shows a Porcelain and Verdigris gradient instead of a canvas,
//   with a short note saying why. Nothing here animates in that case.
// - Vanta is MIT (tengbao/vanta); three.js is MIT. Their licence notices
//   ship inside their packages; nothing here strips them.
//
// This demo is not reused anywhere else: never import this page, its
// loader, or its effect code from the homepage, tool pages or icon pages.

import { useCallback, useEffect, useRef, useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Bird, CloudFog, Waves } from "lucide-react";
import PageShell from "@/components/PageShell";
import GsapMotion from "@/components/GsapMotion";
import { prefersReducedMotion } from "@/lib/gsap-animations";

export const Route = createLazyFileRoute("/animated-backgrounds")({
  component: Page,
});

type EffectKey = "waves" | "birds" | "fog";

const EFFECTS: Array<{
  key: EffectKey;
  label: string;
  icon: typeof Waves;
  blurb: string;
}> = [
  { key: "waves", label: "Waves", icon: Waves, blurb: "Slow verdigris waves on porcelain." },
  { key: "birds", label: "Birds", icon: Bird, blurb: "A small flock drifting across the stage." },
  { key: "fog", label: "Fog", icon: CloudFog, blurb: "Soft teal fog over a warm cream base." },
];

// One explicit loader per effect so the bundler emits one lazy chunk per
// effect (a templated import path would not split reliably).
const EFFECT_LOADERS = {
  waves: () => import("vanta/dist/vanta.waves.min"),
  birds: () => import("vanta/dist/vanta.birds.min"),
  fog: () => import("vanta/dist/vanta.fog.min"),
} as const;

type VantaInstance = { destroy: () => void };

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function Page() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<VantaInstance | null>(null);
  const [effect, setEffect] = useState<EffectKey>("waves");
  const [status, setStatus] = useState<"loading" | "live" | "fallback">("loading");
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  const destroyEffect = useCallback(() => {
    try {
      effectRef.current?.destroy();
    } catch {
      // Destroy is best-effort; a failed destroy must not break the page.
    }
    effectRef.current = null;
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;

    if (prefersReducedMotion()) {
      setStatus("fallback");
      setFallbackNote("Motion is reduced on your device, so this demo shows a static gradient instead of a live effect.");
      return;
    }
    if (!webglAvailable()) {
      setStatus("fallback");
      setFallbackNote("WebGL is unavailable in this browser, so this demo shows a static gradient instead of a live effect.");
      return;
    }

    destroyEffect();
    setStatus("loading");
    setFallbackNote(null);

    void (async () => {
      try {
        const threeModule = await import("three");
        const effectModule = await EFFECT_LOADERS[effect]();
        if (cancelled || !stageRef.current) return;
        const factory = effectModule.default;
        const common = {
          el: stageRef.current,
          THREE: threeModule,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
        };
        // Verdigris on porcelain, matching the site theme.
        const options =
          effect === "waves"
            ? { ...common, color: 0x0d7a68, shininess: 40, waveHeight: 18, waveSpeed: 0.7, zoom: 0.9 }
            : effect === "birds"
              ? {
                  ...common,
                  backgroundColor: 0xf5f1e8,
                  backgroundAlpha: 1,
                  color1: 0x0d7a68,
                  color2: 0x115e59,
                  birdSize: 1.1,
                  wingSpan: 28,
                  speedLimit: 4,
                  separation: 60,
                  alignment: 30,
                  cohesion: 20,
                  quantity: 4,
                }
              : {
                  ...common,
                  highlightColor: 0x0d7a68,
                  midtoneColor: 0x5ea99a,
                  lowlightColor: 0xe8e0cd,
                  baseColor: 0xf5f1e8,
                  blurFactor: 0.55,
                  speed: 0.8,
                };
        effectRef.current = factory(options);
        if (!cancelled) setStatus("live");
      } catch {
        if (!cancelled) {
          setStatus("fallback");
          setFallbackNote("The live effect failed to load, so this demo shows a static gradient instead.");
        }
      }
    })();

    return () => {
      cancelled = true;
      destroyEffect();
    };
  }, [effect, destroyEffect]);

  return (
    <PageShell
      eyebrow="Animated backgrounds"
      title="Animated backgrounds demo"
      description="Three live Vanta effects, waves, birds and fog, in the site theme. A demo only: these effects do not run on the homepage, tool pages or icon pages."
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <GsapMotion>
          <p className="leading-relaxed text-muted-foreground">
            Pick an effect below. three.js and the effect code load only on this page, only
            after it opens, and only for the effect you pick. Vanta is MIT licensed and
            three.js is MIT licensed.
          </p>
        </GsapMotion>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose an animated background">
          {EFFECTS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setEffect(item.key)}
              aria-pressed={effect === item.key}
              className={`focus-ring inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                effect === item.key
                  ? "bg-ink text-background"
                  : "border border-border bg-surface hover:border-primary/40 hover:text-primary"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {EFFECTS.find((item) => item.key === effect)?.blurb}{" "}
          {status === "loading" && "Loading the live effect..."}
          {status === "live" && "Live effect running."}
        </p>

        {/* The stage always paints the theme gradient; the Vanta canvas, when
            live, draws on top of it. With no canvas, the gradient IS the demo. */}
        <div
          ref={stageRef}
          className="relative h-[420px] overflow-hidden rounded-3xl bg-[image:var(--gradient-hero)] ring-1 ring-inset ring-border/60"
          role="img"
          aria-label={
            status === "live"
              ? `Live animated background: ${effect}`
              : "Static gradient preview of the animated background demo"
          }
        >
          {status === "fallback" && fallbackNote && (
            <p className="absolute inset-x-0 bottom-0 bg-background/80 px-5 py-3 text-center text-sm text-muted-foreground backdrop-blur-sm">
              {fallbackNote}
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Tip: if the effect looks choppy on a low power device, switch to Fog, which is the
          lightest of the three. This page is a demo; IconVault pages themselves keep their
          static theme backgrounds.
        </p>
      </div>
    </PageShell>
  );
}
