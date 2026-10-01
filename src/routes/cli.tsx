import { createFileRoute } from "@tanstack/react-router";
import { Terminal, Zap, FolderDown, KeyRound } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, FeatureGrid, CodeBlock, FaqList, CTABand, Stack } from "@/components/kit";

export const Route = createFileRoute("/cli")({
  head: () => ({
    meta: [
      { title: "IconVault CLI - pull icons from the terminal" },
      {
        name: "description",
        content:
          "Search the IconVault library and download icons as SVG without leaving your terminal. Zero dependencies, works on Node 18+.",
      },
      { property: "og:title", content: "IconVault CLI - pull icons from the terminal" },
      {
        property: "og:description",
        content: "Search and download icons from the terminal with @iconvault/cli.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/cli" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/cli" }],
  }),
  component: Page,
});

const commands = [
  { cmd: "iconvault search <query>", desc: "Search the library. Prints one prefix:name per line." },
  { cmd: "iconvault search arrow --limit 5", desc: "Limit results (default 20, max 999)." },
  { cmd: "iconvault add mdi:cart", desc: "Download one icon as an optimised SVG into ./icons." },
  { cmd: "iconvault add lucide:heart --out ./src/icons", desc: "Choose the output directory; it is created if needed." },
  { cmd: "iconvault --help", desc: "Full usage, flags and environment variables." },
  { cmd: "iconvault --version", desc: "Print the installed version." },
];

function Page() {
  return (
    <PageShell
      wide
      eyebrow="Developers"
      title="Icons without leaving the terminal"
      description="A tiny zero-dependency CLI that searches the IconVault library and saves icons as SVG files, ready to commit."
    >
      <Stack>
        <div>
          <SectionHeading eyebrow="Install" title="One line, any machine with Node 18+" />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <CodeBlock
              label="install"
              code={`npm i -g @iconvault/cli
# or run it once without installing
npx @iconvault/cli search "shopping cart"`}
            />
            <CodeBlock
              label="first run"
              code={`iconvault search "shopping cart"
# mdi:cart
# mdi:cart-outline
# ...

iconvault add mdi:cart lucide:heart
# saved ./icons/mdi-cart.svg (0.4 kB)
# saved ./icons/lucide-heart.svg (0.3 kB)`}
            />
          </div>
          <Reveal>
            <p className="mt-4 rounded-2xl border border-border bg-surface px-5 py-4 text-sm leading-relaxed text-muted-foreground">
              Publishing note: the <code className="font-mono text-[13px]">@iconvault/cli</code> package
              ships with the next release and is not on npm yet. Until then, every command on this
              page is implemented for real in <code className="font-mono text-[13px]">packages/cli</code> in
              the project repo, and you can run it with <code className="font-mono text-[13px]">node packages/cli/bin/iconvault.js</code>.
            </p>
          </Reveal>
        </div>

        <div>
          <SectionHeading eyebrow="Commands" title="The whole surface area" />
          <Reveal>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
              {commands.map((c) => (
                <div
                  key={c.cmd}
                  className="flex flex-col gap-1 border-b border-border px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:gap-6"
                >
                  <code className="w-80 shrink-0 font-mono text-[13px] text-primary">{c.cmd}</code>
                  <span className="text-sm text-muted-foreground">{c.desc}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div>
          <SectionHeading eyebrow="Why" title="Small, fast, honest" />
          <div className="mt-8">
            <FeatureGrid
              items={[
                { icon: Zap, title: "Zero dependencies", body: "Only Node built-ins. Installs in seconds and never breaks because a transitive package did." },
                { icon: Terminal, title: "Script-friendly output", body: "search prints one id per line, so it pipes cleanly into xargs, fzf or your own scripts." },
                { icon: FolderDown, title: "Real SVG files", body: "add writes optimised SVG straight to disk with a predictable prefix-name.svg filename." },
                { icon: KeyRound, title: "Key aware", body: "Set ICONVAULT_KEY to skip the public per-minute limits and use your 1,000 monthly calls." },
              ]}
              columns={2}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Configuration" title="Flags and environment" />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <CodeBlock
              label="flags"
              code={`--limit N    search results (default 20, max 999)
--out DIR    output directory for add (default ./icons)
--api URL    API base URL (default https://iconvault.site)`}
            />
            <CodeBlock
              label="environment"
              code={`# same as --api
export ICONVAULT_API="https://iconvault.site"

# your key from /api-access, sent as x-api-key
export ICONVAULT_KEY="ivk_live_your_key_here"`}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Questions" title="CLI FAQ" />
          <div className="mt-8">
            <FaqList
              items={[
                {
                  q: "Does it work offline?",
                  a: "No. Both commands call the IconVault API over the network. Downloaded SVGs are yours to keep and work offline forever.",
                },
                {
                  q: "What does add do with the file name?",
                  a: "It saves ./icons/<prefix>-<name>.svg, so mdi:cart becomes mdi-cart.svg. Collisions across sets are impossible by construction.",
                },
                {
                  q: "Do I need an API key?",
                  a: "No. Without one you share the public limits (120 searches and 240 downloads a minute per IP). Set ICONVAULT_KEY for your personal 1,000-call monthly quota.",
                },
                {
                  q: "Is there a login, sync or lockfile?",
                  a: "Not yet. This is v0.1 with search and add only. Sync, lockfiles and CI checks are on the roadmap and will be documented here when they land.",
                },
              ]}
            />
          </div>
        </div>

        <CTABand
          title="Get your API key"
          body="Pair the CLI with a free key for 1,000 calls a month and no per-minute limits."
          primary={{ label: "API access", to: "/api-access" }}
          secondary={{ label: "Embed a picker", to: "/embed" }}
        />
      </Stack>
    </PageShell>
  );
}
