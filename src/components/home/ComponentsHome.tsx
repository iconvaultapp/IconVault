// Homepage UI components section (Sameer 2026-10-26): mirrors the
// IllustrationsHome section directly above it — same section shell,
// centered header, 8-sample grid and "browse all" path, but for UI
// components. Samples come from the small ui-components-home subset (not
// the full 1.84 MB gallery data) so the homepage chunk stays light, and
// previews mount lazily on scroll like the gallery grid.
import { Link } from "@tanstack/react-router";
import { ArrowRight, Component } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { LazyPreview } from "@/components/UiComponentPreview";
import { HOME_COMPONENTS, UI_COMPONENTS_TOTAL } from "@/lib/ui-components-home";

// Tiny label map (kept local so this file never imports the 1.84 MB gallery
// data file just for category names).
const CAT_LABEL: Record<string, string> = {
  buttons: "Buttons",
  cards: "Cards",
  loaders: "Loaders",
  toggles: "Toggle switches",
  inputs: "Inputs",
  checkboxes: "Checkboxes",
  forms: "Forms",
  radio: "Radio buttons",
};

export const ComponentsHome = () => (
  <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
    <Reveal>
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow flex items-center justify-center gap-2">
          <Component className="h-3.5 w-3.5" /> Free UI components
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Components that <span className="text-gradient">drop straight in</span>
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {UI_COMPONENTS_TOTAL} free UI components for websites and apps. Preview live, copy
          the HTML, JSX or CSS, and paste into any project - free for personal and
          commercial use.
        </p>
        <Link
          to="/ui-components"
          search={{ open: undefined }}
          className="group mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Browse all {UI_COMPONENTS_TOTAL} components
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Reveal>

    <div className="mt-8 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {HOME_COMPONENTS.map((entry, i) => (
        <Reveal key={`${entry.category}:${entry.slug}`} delay={Math.min(i * 60, 240)} className="h-full">
          <Link
            to="/ui-components"
            search={{ open: `${entry.category}:${entry.slug}` }}
            className="surface-card lift-hover group block h-full p-4 transition-transform active:scale-[0.98]"
            aria-label={`Open ${entry.title} in the UI components gallery`}
          >
            <span className="block overflow-hidden rounded-xl ring-1 ring-inset ring-border/50">
              <LazyPreview entry={entry} />
            </span>
            <span className="mt-3 flex items-center justify-between gap-2">
              <span className="truncate font-display text-[0.95rem] font-semibold tracking-tight">
                {entry.title}
              </span>
              <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                {entry.css ? "HTML + CSS" : "Tailwind"}
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {CAT_LABEL[entry.category] ?? entry.category} · by {entry.author} · MIT
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-transform group-hover:translate-x-0.5">
              Click Here <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </Reveal>
      ))}
    </div>
  </section>
);

export default ComponentsHome;
