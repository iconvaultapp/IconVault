// IconVault v56 - /mockups data (METADATA ONLY; no file contents in the bundle).
// Static template files live under /mockups/<slug>/ and are served as plain
// static files, same pattern as the /templates gallery.
//
// FRAMES is the device-frame list for the mockup tool. It re-exports the
// project's own frame geometry (src/lib/mockup-frames.ts) so the homepage
// team can import FRAMES from this file for counts without a second source
// of truth. The CSS rendering of those frames is original IconVault CSS in
// src/components/mockup-frames.css (see that file's header for the
// third-party frame sources that were checked and NOT copied).

import { MOCKUP_FRAMES, type MockupFrame } from "@/lib/mockup-frames";

export { MOCKUP_FRAMES as FRAMES };
export type { MockupFrame };

export interface MockupTemplate {
  slug: string;
  title: string;
  source: string;
  license: string;
  category: string;
  frame: string;
  entry: string;
  files: string[];
  premium: boolean;
  note: string;
}

export const MOCKUPS: MockupTemplate[] = [
  {
    slug: "phone-app-portrait",
    title: "Phone App Portrait",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "device frame",
    frame: "iphone-pro",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: a portrait phone frame with a sample app screen. Replace the placeholder screen content with your own screenshot image.",
  },
  {
    slug: "phone-app-landscape",
    title: "Phone App Landscape",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "device frame",
    frame: "iphone-pro",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: a landscape phone frame with a sample wide app screen. Replace the placeholder screen content with your own screenshot image.",
  },
  {
    slug: "tablet-dashboard",
    title: "Tablet Dashboard",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "device frame",
    frame: "ipad-pro-13",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: a tablet frame with a sample dashboard screen (sidebar, stat cards, chart bars). Replace the placeholder screen content with your own screenshot image.",
  },
  {
    slug: "laptop-landing",
    title: "Laptop Landing Page",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "device frame",
    frame: "macbook-pro-14",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: a laptop frame with base and a sample landing page screen. Replace the placeholder screen content with your own screenshot image.",
  },
  {
    slug: "desktop-dashboard",
    title: "Desktop Dashboard",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "device frame",
    frame: "monitor",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: a desktop monitor frame with stand and a sample dashboard screen. Replace the placeholder screen content with your own screenshot image.",
  },
  {
    slug: "watch-face",
    title: "Watch Face",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "device frame",
    frame: "watch-ultra",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: a watch frame with a sample watch face (time, activity rings, stats). Replace the placeholder screen content with your own screenshot image.",
  },
  {
    slug: "app-store-screens",
    title: "App Store Screens",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "app screenshot",
    frame: "iphone-pro",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: three phone frames side by side showing a home, detail and checkout screen, as used for app store listings. Replace each placeholder screen with your own screenshots.",
  },
  {
    slug: "social-post-mockup",
    title: "Social Post Mockup",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "app screenshot",
    frame: "iphone-pro",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: a phone frame next to a caption card, for presenting a social post. Replace the placeholder screen and caption text with your own content.",
  },
  {
    slug: "onboarding-flow",
    title: "Onboarding Flow",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "app screenshot",
    frame: "iphone-pro",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: three phone frames showing steps 1, 2 and 3 of an onboarding flow with progress dots. Replace each placeholder screen with your own screenshots.",
  },
  {
    slug: "brand-business-card",
    title: "Brand Business Card",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "branding",
    frame: "iphone-pro",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: two business cards (front and back) on a desk backdrop, drawn in pure CSS. Replace the placeholder name, role and colours with your own brand.",
  },
  {
    slug: "brand-letterhead",
    title: "Brand Letterhead",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "branding",
    frame: "iphone-pro",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: an A4 letterhead sheet with header, body and footer, drawn in pure CSS. Replace the placeholder brand and text with your own content.",
  },
  {
    slug: "brand-social-banner",
    title: "Brand Social Banner",
    source: "IconVault Original",
    license: "Original (IconVault)",
    category: "branding",
    frame: "chrome",
    entry: "index.html",
    files: ["index.html"],
    premium: false,
    note: "Single-file HTML mockup: a browser frame showing a social banner with headline and profile row, drawn in pure CSS. Replace the placeholder headline and colours with your own brand.",
  },
];

export const MOCKUP_CATEGORIES: string[] = ["app screenshot", "branding", "device frame"];
export const MOCKUPS_TOTAL = MOCKUPS.length;
export const FRAMES_TOTAL = MOCKUP_FRAMES.length;
