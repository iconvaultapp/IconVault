import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code2, Paintbrush, MousePointerClick, Gauge } from "lucide-react";
import PageShell from "@/components/PageShell";
import { SectionHeading, FeatureGrid, CodeBlock, FaqList, CTABand, Stack } from "@/components/kit";

export const Route = createFileRoute("/embed")({
  head: () => ({
    meta: [
      { title: "Embeddable icon picker widget | IconVault" },
      {
        name: "description",
        content:
          "Drop a working icon picker into any website with one script tag. Search 421,020 icons and copy SVG on click. No key, no build step.",
      },
      { property: "og:title", content: "Embeddable icon picker widget" },
      {
        property: "og:description",
        content: "A one-script-tag icon picker: search the library, click to copy SVG.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/embed" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/embed" }],
  }),
  component: Page,
});

/** Live demo: mounts the real /embed/v1.js widget on this page. */
function LiveDemo() {
  useEffect(() => {
    if (document.querySelector('script[data-iconvault-widget-demo]')) return;
    const s = document.createElement("script");
    s.src = "/embed/v1.js";
    s.defer = true;
    s.setAttribute("data-iconvault-widget-demo", "true");
    document.body.appendChild(s);
  }, []);
  return (
    <div
      data-iconvault-picker
      data-theme="light"
      data-query="arrow"
      className="mx-auto w-full max-w-2xl"
    />
  );
}

function Page() {
  return (
    <PageShell
      wide
      eyebrow="Developers"
      title="Put an icon picker inside your product"
      description="If your users pick icons - for a dashboard, a CMS, a docs site - you shouldn't have to build search and previews yourself. Paste one script tag and ours is live."
    >
      <Stack>
        <div>
          <SectionHeading eyebrow="Install" title="One script tag, zero build step" />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <CodeBlock
              label="html"
              code={`<div data-iconvault-picker data-theme="light"></div>
<script src="https://iconvault.site/embed/v1.js" defer></script>`}
            />
            <CodeBlock
              label="options"
              code={`<div
  data-iconvault-picker
  data-theme="dark"    <!-- light or dark, default light -->
  data-limit="24"      <!-- results per search, 1-48 -->
  data-query="arrow"   <!-- run this search on load -->
></div>`}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Live demo" title="This is the real widget" />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The picker below is loaded from <code className="font-mono text-[13px]">/embed/v1.js</code>,
            the exact file your site would use. Type to search, click any icon to copy its SVG.
          </p>
          <div className="mt-6">
            <LiveDemo />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Why embed" title="It behaves like part of your page" />
          <div className="mt-8">
            <FeatureGrid
              items={[
                { icon: Paintbrush, title: "Light or dark", body: "One data-theme attribute. The picker inherits nothing and leaks nothing - all styles are scoped." },
                { icon: Code2, title: "Framework free", body: "Vanilla JS under 10 kB. Works in plain HTML, WordPress, React, or anything that renders a div." },
                { icon: MousePointerClick, title: "Click to copy SVG", body: "Every result copies clean, optimised SVG markup to the clipboard with a small confirmation toast." },
                { icon: Gauge, title: "Fast by default", body: "Debounced search, lazy-loaded previews, and icons streamed from the edge cache." },
              ]}
              columns={2}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Questions" title="Embed FAQ" />
          <div className="mt-8">
            <FaqList
              items={[
                {
                  q: "Do I need an API key?",
                  a: "No. The widget uses the public endpoints, so the normal keyless limits apply (120 searches a minute per IP). For heavy traffic, proxy searches through your backend with your own key.",
                },
                {
                  q: "Can I style it to match my site?",
                  a: "Light and dark themes are built in via data-theme. Deeper theming is not supported yet - the widget is deliberately self-contained so it never fights your CSS.",
                },
                {
                  q: "Does it work in single-page apps?",
                  a: "Yes. The script watches for picker divs added after load, so client-side navigation and dynamically rendered content are handled.",
                },
                {
                  q: "What exactly gets copied?",
                  a: "The full optimised SVG markup for the clicked icon, e.g. <svg ...>...</svg>, ready to paste into HTML or save as a file.",
                },
              ]}
            />
          </div>
        </div>

        <CTABand
          title="Need higher limits?"
          body="Generate a free API key for 1,000 calls a month, or grab icons from the terminal with the CLI."
          primary={{ label: "API access", to: "/api-access" }}
          secondary={{ label: "CLI", to: "/cli" }}
        />
      </Stack>
    </PageShell>
  );
}
