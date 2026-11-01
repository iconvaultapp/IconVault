import { useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";
import RouteError from "@/components/RouteError";
import { AnimatedPreview, LottiePlayer } from "@/components/AnimatedPreview";
import { AnimatedCodePanel } from "@/components/AnimatedCodePanel";
import { ANIMATED_ICONS } from "@/lib/animated-icons-data";
import { PremiumGate, ProPickBadge } from "@/components/V55Download";
import { downloadUrlWithGate } from "@/lib/download-guard";

export const Route = createLazyFileRoute("/animated-icons_/$slug")({
  component: Page,
  errorComponent: RouteError,
});

function Page() {
  const { slug } = Route.useParams();
  const item = ANIMATED_ICONS.find((x) => x.slug === slug);
  const [showLottie, setShowLottie] = useState(false);

  if (!item) {
    return (
      <PageShell fluid eyebrow="Animated icons" title="Icon not found" description="This animated icon does not exist in the gallery.">
        <p className="text-sm text-muted-foreground">
          <Link to="/animated-icons" className="font-medium text-primary hover:underline">
            Browse all animated icons
          </Link>
        </p>
      </PageShell>
    );
  }

  const isMeteocons = item.pack === "meteocons";
  const lottieFile = isMeteocons ? item.files.find((f) => f.endsWith(".json")) : undefined;

  return (
    <PageShell
      fluid
      eyebrow="Animated icon"
      title={item.title}
      description={`${item.packName} · ${item.license} licensed · ${item.format}${item.animated ? "" : " · static SVG (Lottie version animated)"}`}
    >
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {item.premium && <ProPickBadge />}
          <span className="text-sm text-muted-foreground">{item.packName}</span>
          <Link to="/animated-icons" className="text-sm font-medium text-primary hover:underline">
            ← All animated icons
          </Link>
        </div>

        {item.note && (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{item.note}</p>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8">
            <AnimatedPreview item={item} size={160} />
            {isMeteocons && lottieFile && !showLottie && (
              <button
                type="button"
                onClick={() => setShowLottie(true)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Play Lottie version
              </button>
            )}
            {isMeteocons && lottieFile && showLottie && (
              <LottiePlayer jsonUrl={`/animated-icons/${item.slug}/${lottieFile}`} size={160} />
            )}
          </section>

          <AnimatedCodePanel item={item} />
        </div>

        <section className="flex flex-wrap items-center gap-3">
          <PremiumGate premium={item.premium} label={item.title}>
            <span className="flex flex-wrap gap-2">
              {item.files.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => downloadUrlWithGate(`/animated-icons/${item.slug}/${f}`, f)}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Download {f}
                </button>
              ))}
            </span>
          </PremiumGate>
        </section>
        {isMeteocons && (
          <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground">Formats</h2>
            <p className="mt-2">
              Animated SVG (SMIL) for direct use as an image, plus a Lottie JSON version for
              app/player use. {item.animated ? "" : "This icon's SVG is static — the Lottie version is the animated one."}
            </p>
          </section>
        )}
      </div>
    </PageShell>
  );
}
