import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code2, Braces, Wind, FileCode } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, Stack, CodeBlock, FaqList, CTABand } from "@/components/kit";
import { useFavourites } from "@/hooks/useFavourites";
import { parseIconId, getIconSvgUrl } from "@/lib/iconify";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/design-tokens")({
  head: () => ({
    meta: [
      { title: "Export design tokens - CSS, JSON, Tailwind | IconVault" },
      {
        name: "description",
        content:
          "Turn a saved icon set into tokens your codebase can consume: CSS custom properties, a JSON manifest, a Tailwind plugin or typed TypeScript constants.",
      },
      { property: "og:title", content: "Export design tokens - CSS, JSON, Tailwind" },
      {
        property: "og:description",
        content: "Turn saved icons into CSS variables, JSON, Tailwind config or typed constants.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/design-tokens" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/design-tokens" }],
  }),
  component: Page,
});

const formats = [
  { id: "css", label: "CSS variables", icon: Code2 },
  { id: "json", label: "JSON manifest", icon: Braces },
  { id: "tailwind", label: "Tailwind", icon: Wind },
  { id: "ts", label: "TypeScript", icon: FileCode },
] as const;

type FormatId = (typeof formats)[number]["id"];

const SAMPLE = ["lucide:heart", "lucide:search", "mdi:account", "ph:gear-six"];

const toVarName = (id: string) => {
  const { prefix, name } = parseIconId(id);
  return `${prefix}-${name}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
};

const toCamel = (id: string) =>
  toVarName(id).replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const generate = (format: FormatId, ids: string[]) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = (id: string) => {
    const { prefix, name } = parseIconId(id);
    return `${origin}${getIconSvgUrl(prefix, name)}`;
  };

  if (format === "css") {
    return `:root {\n${ids
      .map((id) => `  --icon-${toVarName(id)}: url("${url(id)}");`)
      .join("\n")}\n}\n\n.icon {\n  display: inline-block;\n  width: 1.25rem;\n  height: 1.25rem;\n  background-color: currentColor;\n  mask: var(--icon) center / contain no-repeat;\n}`;
  }
  if (format === "json") {
    return JSON.stringify(
      {
        name: "iconvault-tokens",
        version: "1.0.0",
        icons: ids.map((id) => {
          const { prefix, name } = parseIconId(id);
          return { token: toVarName(id), set: prefix, name, url: url(id) };
        }),
      },
      null,
      2,
    );
  }
  if (format === "tailwind") {
    return `// tailwind.config.ts\nimport plugin from "tailwindcss/plugin";\n\nexport default {\n  plugins: [\n    plugin(({ addUtilities }) => {\n      addUtilities({\n${ids
      .map(
        (id) =>
          `        ".icon-${toVarName(id)}": {\n          mask: 'url("${url(id)}") center / contain no-repeat',\n          backgroundColor: "currentColor",\n        },`,
      )
      .join("\n")}\n      });\n    }),\n  ],\n};`;
  }
  return `export const icons = {\n${ids
    .map((id) => `  ${toCamel(id)}: "${id}",`)
    .join("\n")}\n} as const;\n\nexport type IconToken = keyof typeof icons;`;
};

function Page() {
  const { favourites } = useFavourites();
  const [format, setFormat] = useState<FormatId>("css");

  const ids = favourites.length > 0 ? favourites.slice(0, 40) : SAMPLE;
  const output = useMemo(() => generate(format, ids), [format, ids]);

  return (
    <PageShell
      wide
      eyebrow="Collections"
      title="Export design tokens"
      description="An icon set only becomes a system when the codebase can name it. Generate tokens from your saved icons and paste them straight into the repo."
    >
      <Stack>
        <div>
          <Reveal>
            <div className="flex flex-wrap gap-2">
              {formats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "focus-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                    format === f.id
                      ? "border-primary/40 bg-primary-soft text-primary"
                      : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary",
                  )}
                >
                  <f.icon className="h-4 w-4" />
                  {f.label}
                </button>
              ))}
            </div>
          </Reveal>

          <p className="mt-4 text-sm text-muted-foreground">
            {favourites.length > 0
              ? `Generated from your ${Math.min(favourites.length, 40)} favourited icons.`
              : "Showing a sample - favourite some icons and they'll be used here instead."}
          </p>

          <div className="mt-6">
            <CodeBlock code={output} label={format} />
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="How to use it"
            title="Pick the format that matches your stack"
            description="CSS variables suit plain stylesheets and design-system packages. JSON is right when a build step generates components. Tailwind gives you icon-* utilities. TypeScript constants stop typos in icon names from reaching production."
          />
        </div>

        <div>
          <SectionHeading eyebrow="Questions" title="Token FAQ" />
          <div className="mt-8">
            <FaqList
              items={[
                {
                  q: "Do tokens pull icons at runtime?",
                  a: "CSS and Tailwind output references the CDN by URL, so icons load lazily and cache well. If you need zero external requests, use the CLI to vendor the SVGs and point the tokens at local paths.",
                },
                {
                  q: "Will icon names stay stable?",
                  a: "Upstream sets occasionally rename glyphs. Pin a version with the CLI lockfile and regenerate tokens deliberately rather than on every install.",
                },
                {
                  q: "Can I export a whole collection instead of favourites?",
                  a: "Yes - open the collection and choose Export, or point the CLI at the collection name to generate the same tokens in CI.",
                },
                {
                  q: "What about licensing?",
                  a: "The JSON manifest carries the set and licence for every icon, which makes attribution a build artefact instead of a memory exercise.",
                },
              ]}
            />
          </div>
        </div>

        <CTABand
          title="Automate it in CI"
          body="The CLI generates the same tokens on every build, so the repo never drifts from the vault."
          primary={{ label: "Use the CLI", to: "/cli" }}
          secondary={{ label: "Back to collections", to: "/collections" }}
        />
      </Stack>
    </PageShell>
  );
}
