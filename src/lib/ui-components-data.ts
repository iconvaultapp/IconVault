// UI components gallery index (v51, 2026-10-28).
// Entries live in per-category chunks under ./ui-components/ and load on
// demand — the gallery page never bundles all component code up front.
// Sources (all MIT licensed, original authors kept on every entry):
//   Uiverse community (github.com/uiverse-io/galaxy),
//   HyperUI (github.com/markmead/hyperui),
//   Flowbite free core (github.com/themesberg/flowbite).

export type UiComponentCategory = "buttons" | "cards" | "loaders" | "toggles" | "inputs" | "checkboxes" | "radio" | "tooltips" | "notifications" | "forms" | "navigation" | "sections" | "overlays" | "data" | "feedback" | "typography" | "patterns";

export type UiComponentSource = "galaxy" | "hyperui" | "flowbite";

export interface UiComponentEntry {
  category: UiComponentCategory;
  slug: string;
  title: string;
  author: string;
  source: UiComponentSource;
  /** Markup without the <style> block and without comments. */
  html: string;
  /** Contents of the <style> block, "" for pure-Tailwind components. */
  css: string;
  /** True when interactive parts need the source library's JavaScript
      (preview shows the static state). */
  needsJs?: boolean | undefined;
}

export interface UiComponentMeta {
  category: UiComponentCategory;
  slug: string;
  title: string;
  author: string;
  source: UiComponentSource;
}

export const UI_COMPONENT_CATEGORIES: Array<{
  id: UiComponentCategory;
  label: string;
}> = [
  { id: "buttons", label: "Buttons" },
  { id: "cards", label: "Cards" },
  { id: "loaders", label: "Loaders" },
  { id: "toggles", label: "Toggle switches" },
  { id: "inputs", label: "inputs" },
  { id: "checkboxes", label: "Checkboxes" },
  { id: "radio", label: "Radio buttons" },
  { id: "tooltips", label: "Tooltips" },
  { id: "notifications", label: "Notifications" },
  { id: "forms", label: "Forms" },
  { id: "navigation", label: "Navigation" },
  { id: "sections", label: "Sections" },
  { id: "overlays", label: "Overlays" },
  { id: "data", label: "Data display" },
  { id: "feedback", label: "Alerts & feedback" },
  { id: "typography", label: "Typography" },
  { id: "patterns", label: "Patterns" }
];

export const UI_COMPONENT_SOURCES: Array<{
  id: UiComponentSource;
  label: string;
  url: string;
  license: string;
}> = [
  { id: "galaxy", label: "Uiverse", url: "https://github.com/uiverse-io/galaxy", license: "MIT" },
  { id: "hyperui", label: "HyperUI", url: "https://github.com/markmead/hyperui", license: "MIT" },
  { id: "flowbite", label: "Flowbite", url: "https://github.com/themesberg/flowbite", license: "MIT" }
];

export const UI_COMPONENT_COUNTS: Record<UiComponentCategory, number> = {
  "buttons": 878,
  "cards": 390,
  "loaders": 640,
  "toggles": 221,
  "inputs": 206,
  "checkboxes": 151,
  "radio": 89,
  "tooltips": 42,
  "notifications": 30,
  "forms": 199,
  "navigation": 80,
  "sections": 60,
  "overlays": 71,
  "data": 88,
  "feedback": 47,
  "typography": 81,
  "patterns": 86
};

export const UI_COMPONENTS_TOTAL = 3359;

export const UI_COMPONENT_LOADERS: Record<
  UiComponentCategory,
  () => Promise<{ ENTRIES: UiComponentEntry[] }>
> = {
  "buttons": () => import("./ui-components/buttons"),
  "cards": () => import("./ui-components/cards"),
  "loaders": () => import("./ui-components/loaders"),
  "toggles": () => import("./ui-components/toggles"),
  "inputs": () => import("./ui-components/inputs"),
  "checkboxes": () => import("./ui-components/checkboxes"),
  "radio": () => import("./ui-components/radio"),
  "tooltips": () => import("./ui-components/tooltips"),
  "notifications": () => import("./ui-components/notifications"),
  "forms": () => import("./ui-components/forms"),
  "navigation": () => import("./ui-components/navigation"),
  "sections": () => import("./ui-components/sections"),
  "overlays": () => import("./ui-components/overlays"),
  "data": () => import("./ui-components/data"),
  "feedback": () => import("./ui-components/feedback"),
  "typography": () => import("./ui-components/typography"),
  "patterns": () => import("./ui-components/patterns")
};

/** Metadata-only index (no html/css). Dynamic so the gallery shell can
    render before any component code loads. */
export const loadComponentIndex = (): Promise<{
  UI_COMPONENTS_INDEX: UiComponentMeta[];
}> => import("./ui-components/index-meta");
