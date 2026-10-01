import { Shapes, User, Scale, FileDown } from "lucide-react";
import type { IconifyCollection, PackSeo } from "@/lib/iconify";

/**
 * Per-set header: title + intro + the four stat cards
 * (Icons / Designer / License / Formats), matching the pack page design.
 * Used on /packs/$prefix and inline on /app below the icon grid.
 */
export default function PackHeader({
  collection,
  seo,
}: {
  collection: IconifyCollection;
  seo: PackSeo | null;
}) {
  const designer = (collection.author as { name?: string } | undefined)?.name;
  const license = (collection.license as { title?: string } | undefined)?.title;

  return (
    <div>
      <h2 className="text-balance text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {collection.name}
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
        {seo?.about ??
          `${collection.total.toLocaleString("en-US")} free ${collection.name} icons - download as SVG, PNG, WebP or copy-paste React components.`}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Icons", value: collection.total.toLocaleString("en-US"), icon: Shapes },
          { label: "Designer", value: designer ?? "-", icon: User },
          { label: "License", value: license ?? "Open source", icon: Scale },
          { label: "Formats", value: "SVG, PNG, WebP, React, CDN", icon: FileDown },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="surface-card rounded-2xl border p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <div className="mt-1.5 break-words font-display text-base font-semibold leading-snug sm:text-lg" title={value}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
