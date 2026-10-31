import { useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import PageShell from "@/components/PageShell";
import RouteError from "@/components/RouteError";
import { AnimatedPreview, LottiePlayer } from "@/components/AnimatedPreview";
import { ANIMATED_ICONS } from "@/lib/animated-icons-data";
import { PremiumGate, ProPickBadge } from "@/components/V55Download";
import { downloadUrlWithGate } from "@/lib/download-guard";

export const Route = createLazyFileRoute("/animated-icons/$slug")({
  component: Page,
  errorComponent: RouteError,
});

function Page() {
  const { slug } = Route.useParams();
  const item = ANIMATED_ICONS.find((x) => x.slug === slug);
  const [copied, setCopied] = useState(false);
  const [showLottie, setShowLottie] = useState(false);

  if (!item) {
    return (
      <PageShell eyebrow="Animated icons" title="Icon not found" description="This animated icon does not exist in the gallery.">
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
  const svgFile = item.files.find((f) => f.endsWith(".svg"));

  const copyMarkup = async () => {
    const text = item.format === "css" ? item.markup : "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <PageShell
      eyebrow="Animated icon"
      title={item.title}
      description={`${item.packName} · ${item.license} licensed · ${item.format}${item.animated ? "" : " · static SVG (Lottie version animated)"}`}
    >
      <div className="mx-auto max-w-4xl space-y-6">
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
          {item.format === "css" && item.markup && (
            <button
              type="button"
              onClick={() => void copyMarkup()}
              className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy HTML markup"}
            </button>
          )}
        </section>

        {item.format === "css" && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">How to use</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Include the CSS file below, then paste this markup. Whirl loaders use{" "}
              <code>--primary</code> / <code>--secondary</code> for colour; SpinKit spinners use{" "}
              <code>--sk-color</code> / <code>--sk-size</code>.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs">
              <code>{`<link rel="stylesheet" href="/animated-icons/${item.slug}/${item.files[0]}">\n${item.markup}`}</code>
            </pre>
            {svgFile === undefined && item.pack === "spinkit" && (
              <p className="mt-2 text-xs text-muted-foreground">
                SpinKit&apos;s centring helper class (.sk-center) is not duplicated in each file — add
                it once yourself if you need centred spinners.
              </p>
            )}
          </section>
        )}
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
