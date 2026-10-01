// /tools/css-reset-picker - Compare four CSS resets side by side, toggle
// sections, preview them on sample markup, and copy. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-reset-picker")({
  head: () => {
    const seo = getToolSeoMeta("css-reset-picker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CssResetPicker,
});

type Section = { name: string; code: string };
type ResetDef = { id: string; label: string; license: string; sections: Section[] };

const RESETS: ResetDef[] = [
  {
    id: "meyerweb",
    label: "Meyerweb",
    license: "Public domain (v2.0, 20110126)",
    sections: [
      {
        name: "Core reset",
        code: `html, body, div, span, applet, object, iframe,
h1, h2, h3, h4, h5, h6, p, blockquote, pre,
a, abbr, acronym, address, big, cite, code,
del, dfn, em, img, ins, kbd, q, s, samp,
small, strike, strong, sub, sup, tt, var,
b, u, i, center,
dl, dt, dd, ol, ul, li,
fieldset, form, label, legend,
table, caption, tbody, tfoot, thead, tr, th, td,
article, aside, canvas, details, embed,
figure, figcaption, footer, header, hgroup,
menu, nav, output, ruby, section, summary,
time, mark, audio, video {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 100%;
  font: inherit;
  vertical-align: baseline;
}`,
      },
      {
        name: "HTML5 display roles",
        code: `/* HTML5 display-role reset for older browsers */
article, aside, details, figcaption, figure,
footer, header, hgroup, menu, nav, section {
  display: block;
}
body {
  line-height: 1;
}`,
      },
      {
        name: "Lists and quotes",
        code: `ol, ul {
  list-style: none;
}
blockquote, q {
  quotes: none;
}
blockquote:before, blockquote:after,
q:before, q:after {
  content: "";
  content: none;
}`,
      },
      {
        name: "Tables",
        code: `table {
  border-collapse: collapse;
  border-spacing: 0;
}`,
      },
    ],
  },
  {
    id: "normalize",
    label: "Normalize",
    license: "MIT (v8.0.1, necolas/normalize.css)",
    sections: [
      {
        name: "Document",
        code: `html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
}`,
      },
      {
        name: "Sections",
        code: `main {
  display: block;
}

h1 {
  font-size: 2em;
  margin: 0.67em 0;
}`,
      },
      {
        name: "Grouping content",
        code: `hr {
  box-sizing: content-box;
  height: 0;
  overflow: visible;
}

pre {
  font-family: monospace, monospace;
  font-size: 1em;
}`,
      },
      {
        name: "Text-level semantics",
        code: `a {
  background-color: transparent;
}

abbr[title] {
  border-bottom: none;
  text-decoration: underline;
  text-decoration: underline dotted;
}

b,
strong {
  font-weight: bolder;
}

code,
kbd,
samp {
  font-family: monospace, monospace;
  font-size: 1em;
}

small {
  font-size: 80%;
}

sub,
sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

sub {
  bottom: -0.25em;
}

sup {
  top: -0.5em;
}`,
      },
      {
        name: "Embedded content",
        code: `img {
  border-style: none;
}`,
      },
      {
        name: "Forms",
        code: `button,
input,
optgroup,
select,
textarea {
  font-family: inherit;
  font-size: 100%;
  line-height: 1.15;
  margin: 0;
}

button,
input {
  overflow: visible;
}

button,
select {
  text-transform: none;
}

button,
[type="button"],
[type="reset"],
[type="submit"] {
  -webkit-appearance: button;
}

button::-moz-focus-inner,
[type="button"]::-moz-focus-inner,
[type="reset"]::-moz-focus-inner,
[type="submit"]::-moz-focus-inner {
  border-style: none;
  padding: 0;
}

button:-moz-focusring,
[type="button"]:-moz-focusring,
[type="reset"]:-moz-focusring,
[type="submit"]:-moz-focusring {
  outline: 1px dotted ButtonText;
}

fieldset {
  padding: 0.35em 0.75em 0.625em;
}

legend {
  box-sizing: border-box;
  color: inherit;
  display: table;
  max-width: 100%;
  padding: 0;
  white-space: normal;
}

progress {
  vertical-align: baseline;
}

textarea {
  overflow: auto;
}

[type="checkbox"],
[type="radio"] {
  box-sizing: border-box;
  padding: 0;
}

[type="number"]::-webkit-inner-spin-button,
[type="number"]::-webkit-outer-spin-button {
  height: auto;
}

[type="search"] {
  -webkit-appearance: textfield;
  outline-offset: -2px;
}

[type="search"]::-webkit-search-decoration {
  -webkit-appearance: none;
}

::-webkit-file-upload-button {
  -webkit-appearance: button;
  font: inherit;
}`,
      },
      {
        name: "Interactive and misc",
        code: `details {
  display: block;
}

summary {
  display: list-item;
}

template {
  display: none;
}

[hidden] {
  display: none;
}`,
      },
    ],
  },
  {
    id: "modern",
    label: "Modern",
    license: "Public domain (a sensible modern reset)",
    sections: [
      {
        name: "Box model and margins",
        code: `*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}`,
      },
      {
        name: "Typography",
        code: `html {
  -webkit-text-size-adjust: 100%;
}

body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}`,
      },
      {
        name: "Media elements",
        code: `img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}`,
      },
      {
        name: "Forms",
        code: `input,
button,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
}`,
      },
      {
        name: "Misc",
        code: `ul[role="list"],
ol[role="list"] {
  list-style: none;
}

#root,
#__next {
  isolation: isolate;
}`,
      },
    ],
  },
  {
    id: "minimal",
    label: "Minimal",
    license: "Public domain",
    sections: [
      {
        name: "Box model",
        code: `*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}`,
      },
      {
        name: "Images",
        code: `img {
  max-width: 100%;
  height: auto;
}`,
      },
    ],
  },
];

const SAMPLE = `
<article>
  <h1>Sample article heading</h1>
  <p>This is a <strong>paragraph</strong> with <em>emphasis</em>, a <a href="#">link</a>, and some <code>code</code>. It shows how body text renders under each reset.</p>
  <blockquote>A blockquote with a <cite>citation</cite>.</blockquote>
  <ul>
    <li>First list item</li>
    <li>Second list item</li>
    <li>Third list item</li>
  </ul>
  <table>
    <thead><tr><th>Name</th><th>Value</th></tr></thead>
    <tbody><tr><td>Alpha</td><td>1</td></tr><tr><td>Beta</td><td>2</td></tr></tbody>
  </table>
  <form onsubmit="return false">
    <label>Search <input type="search" placeholder="Type here"></label>
    <button type="button">Submit</button>
  </form>
</article>`;

function CssResetPicker() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-reset-picker", isPro);
  const seo = getToolSeo("css-reset-picker");

  const [activeId, setActiveId] = useState("modern");
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({});
  const [showReset, setShowReset] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const active = RESETS.find((r) => r.id === activeId)!;
  const activeExcluded = excluded[activeId] ?? new Set<string>();

  const css = useMemo(
    () =>
      active.sections
        .filter((s) => !activeExcluded.has(s.name))
        .map((s) => `/* ${active.label} - ${s.name} */\n${s.code}`)
        .join("\n\n"),
    [active, activeExcluded],
  );

  const srcDoc = useMemo(
    () => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:16px;}</style>${showReset ? `<style>${css}</style>` : ""}</head><body>${SAMPLE}</body></html>`,
    [css, showReset],
  );

  const toggleSection = (name: string) => {
    setExcluded((prev) => {
      const next = { ...prev };
      const set = new Set(next[activeId] ?? []);
      if (set.has(name)) set.delete(name);
      else set.add(name);
      next[activeId] = set;
      return next;
    });
  };

  const copy = async () => {
    if (!trial.canUse) {
      setError(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      toast.success(`${active.label} reset copied`);
      setError(null);
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="css-reset-picker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Reset Picker" left={trial.left} />

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {RESETS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveId(r.id)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                activeId === r.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div>
              <p className="text-lg font-bold">{active.label}</p>
              <p className="text-xs text-muted-foreground">{active.license}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {css.split("\n").length} lines - {active.sections.length - activeExcluded.size} of {active.sections.length} sections
              </p>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Sections</p>
              <div className="space-y-2">
                {active.sections.map((s) => {
                  const on = !activeExcluded.has(s.name);
                  return (
                    <label key={s.name} className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleSection(s.name)}
                        className="h-4 w-4 rounded accent-[hsl(var(--primary))]"
                      />
                      <span className={cn("font-medium", !on && "text-muted-foreground line-through")}>{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <ActionButton onClick={copy} disabled={!trial.canUse || !css}>
              <ClipboardCopy className="h-4 w-4" /> Copy {active.label} reset
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
              </p>
            )}
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Selected CSS</p>
              <pre className="max-h-64 overflow-auto rounded-xl bg-muted/40 p-3 font-mono text-xs leading-relaxed">{css || "/* all sections excluded */"}</pre>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[13px] font-medium text-foreground/80">
                <FileText className="h-4 w-4" /> Live preview on sample markup
              </p>
              <div className="flex gap-2">
                {(["with", "without"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setShowReset(v === "with")}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                      (showReset && v === "with") || (!showReset && v === "without")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {v} reset
                  </button>
                ))}
              </div>
            </div>
            <iframe
              key={`${activeId}-${showReset}`}
              title="Reset preview"
              sandbox="allow-same-origin"
              srcDoc={srcDoc}
              className="min-h-[520px] w-full rounded-xl border border-border bg-white"
            />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
