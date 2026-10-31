import { createLazyFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";
import RouteError from "@/components/RouteError";
import { WALLPAPERS } from "@/lib/wallpapers-data";
import { downloadUrlWithGate } from "@/lib/download-guard";

export const Route = createLazyFileRoute("/wallpapers/$slug")({
  component: Page,
  errorComponent: RouteError,
});

function Page() {
  const { slug } = Route.useParams();
  const item = WALLPAPERS.find((x) => x.slug === slug);

  if (!item) {
    return (
      <PageShell eyebrow="Wallpapers" title="Wallpaper not found" description="This wallpaper does not exist in the gallery.">
        <p className="text-sm text-muted-foreground">
          <Link to="/wallpapers" className="font-medium text-primary hover:underline">
            Browse all wallpapers
          </Link>
        </p>
      </PageShell>
    );
  }

  const mobile = item.sizes[0];
  const desktop = item.sizes[1];

  if (!mobile || !desktop) {
    return (
      <PageShell eyebrow="Wallpapers" title="Wallpaper not found" description="This wallpaper does not exist in the gallery.">
        <p className="text-sm text-muted-foreground">
          <Link to="/wallpapers" className="font-medium text-primary hover:underline">
            Browse all wallpapers
          </Link>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Wallpaper"
      title={item.title}
      description={`${item.category} · Original artwork generated in code · Mobile 1080x1920 · Desktop 1920x1080 · WebP and JPG`}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">{item.category}</span>
          <Link to="/wallpapers" className="text-sm font-medium text-primary hover:underline">
            ← All wallpapers
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <figure className="overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
            <img
              src={desktop.webp}
              alt={`${item.title} desktop wallpaper preview`}
              loading="lazy"
              width={1920}
              height={1080}
              className="aspect-video w-full object-cover"
            />
            <figcaption className="p-3 text-xs text-muted-foreground">Desktop preview, 1920x1080.</figcaption>
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-border bg-card">
            <img
              src={mobile.webp}
              alt={`${item.title} mobile wallpaper preview`}
              loading="lazy"
              width={1080}
              height={1920}
              className="mx-auto aspect-[9/16] w-full max-w-[240px] object-cover"
            />
            <figcaption className="p-3 text-xs text-muted-foreground">Mobile preview, 1080x1920.</figcaption>
          </figure>
        </section>

        <section className="flex flex-wrap items-center gap-2">
          {item.sizes.flatMap((size) => [
            <button
              key={`${size.label}-webp`}
              type="button"
              onClick={() => downloadUrlWithGate(size.webp, `${item.slug}-${size.label.toLowerCase()}.webp`)}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Download {size.label} WebP ({size.width}x{size.height})
            </button>,
            <button
              key={`${size.label}-jpg`}
              type="button"
              onClick={() => downloadUrlWithGate(size.jpg, `${item.slug}-${size.label.toLowerCase()}.jpg`)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Download {size.label} JPG ({size.width}x{size.height})
            </button>,
          ])}
        </section>
        <p className="text-sm text-muted-foreground">
          Downloads need a free account. If you are not signed in, you will be asked to sign in and
          your download will resume after sign in.
        </p>

        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">About this wallpaper</h2>
          <p className="mt-2">
            {item.title} is original artwork generated in code, in the IconVault Porcelain and
            Verdigris theme. It is not a photograph and not a 3D render
            {item.category === "3D" ? "; the 3D look comes from gradients, shapes and shadows drawn in code" : ""}.
            Files: {item.files.join(", ")}.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
