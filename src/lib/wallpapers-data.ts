// IconVault v56 - wallpapers gallery (METADATA ONLY; no file contents in the bundle).
// Static files live under /wallpapers/<slug>/ and are served as plain static files.
// PROVENANCE, stated honestly: every wallpaper here is ORIGINAL artwork generated
// in code by the v56 wallpapers team (SVG vector gradients, shapes, shadows and
// depth giving a 3D look where noted). None are photographs, none come from
// Unsplash, Pexels, Pixabay or any wallpaper app, and none are Blender renders:
// the Blender binary is not installed in this build environment, so the
// Blender route was not used. The "3D" category means 3D look art made in code.
// Every download on the gallery and detail pages goes through download-guard
// (downloadUrlWithGate), so downloads need a free account; previews are free.

export type WallpaperMethod = "code-generated";

export interface WallpaperSize {
  label: string;
  width: number;
  height: number;
  webp: string;
  jpg: string;
}

export interface WallpaperEntry {
  slug: string;
  title: string;
  category: string;
  method: WallpaperMethod;
  formats: string[];
  files: string[];
  sizes: WallpaperSize[];
  preview: string;
}

const entry = (slug: string, title: string, category: string): WallpaperEntry => ({
  slug,
  title,
  category,
  method: "code-generated",
  formats: ["webp", "jpg"],
  files: [`${slug}-mobile.webp`, `${slug}-mobile.jpg`, `${slug}-desktop.webp`, `${slug}-desktop.jpg`],
  sizes: [
    {
      label: "Mobile",
      width: 1080,
      height: 1920,
      webp: `/wallpapers/${slug}/${slug}-mobile.webp`,
      jpg: `/wallpapers/${slug}/${slug}-mobile.jpg`,
    },
    {
      label: "Desktop",
      width: 1920,
      height: 1080,
      webp: `/wallpapers/${slug}/${slug}-desktop.webp`,
      jpg: `/wallpapers/${slug}/${slug}-desktop.jpg`,
    },
  ],
  preview: `/wallpapers/${slug}/${slug}-desktop.webp`,
});

export const WALLPAPERS: WallpaperEntry[] = [
  // 3D look, made in code (10)
  entry("verdigris-spheres", "Verdigris Spheres", "3D"),
  entry("porcelain-orbs", "Porcelain Orbs", "3D"),
  entry("ember-spheres", "Ember Spheres", "3D"),
  entry("teal-blocks", "Teal Blocks", "3D"),
  entry("sand-blocks", "Sand Blocks", "3D"),
  entry("river-pebbles", "River Pebbles", "3D"),
  entry("garden-pebbles", "Garden Pebbles", "3D"),
  entry("forest-columns", "Forest Columns", "3D"),
  entry("porcelain-columns", "Porcelain Columns", "3D"),
  entry("verdigris-rings", "Verdigris Rings", "3D"),
  // Gradient (8)
  entry("teal-mesh", "Teal Mesh", "Gradient"),
  entry("ember-mesh", "Ember Mesh", "Gradient"),
  entry("midnight-mesh", "Midnight Mesh", "Gradient"),
  entry("porcelain-dawn", "Porcelain Dawn", "Gradient"),
  entry("teal-dawn", "Teal Dawn", "Gradient"),
  entry("forest-aurora", "Forest Aurora", "Gradient"),
  entry("sage-aurora", "Sage Aurora", "Gradient"),
  entry("soft-fade", "Soft Fade", "Gradient"),
  // Geometric (6)
  entry("porcelain-arches", "Porcelain Arches", "Geometric"),
  entry("teal-arches", "Teal Arches", "Geometric"),
  entry("verdigris-diamonds", "Verdigris Diamonds", "Geometric"),
  entry("sand-diamonds", "Sand Diamonds", "Geometric"),
  entry("teal-waves", "Teal Waves", "Geometric"),
  entry("porcelain-dots", "Porcelain Dots", "Geometric"),
  // Nature, abstract shapes only, no photos (6)
  entry("porcelain-dunes", "Porcelain Dunes", "Nature"),
  entry("sage-dunes", "Sage Dunes", "Nature"),
  entry("teal-leaves", "Teal Leaves", "Nature"),
  entry("sunset-hills", "Sunset Hills", "Nature"),
  entry("calm-sea", "Calm Sea", "Nature"),
  entry("meadow-stems", "Meadow Stems", "Nature"),
];

export const WALLPAPER_CATEGORIES: string[] = ["3D", "Geometric", "Gradient", "Nature"];
export const WALLPAPERS_TOTAL = 30;
export const WALLPAPER_COUNTS: Record<string, number> = {
  "3D": 10,
  Gradient: 8,
  Geometric: 6,
  Nature: 6,
};
