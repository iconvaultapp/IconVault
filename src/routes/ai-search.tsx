import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Loader2, CornerDownLeft } from "lucide-react";
import PageShell from "@/components/PageShell";
import IconifyGrid from "@/components/IconifyGrid";
import IconifyDetail from "@/components/IconifyDetail";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, Stack, CTABand } from "@/components/kit";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { searchIcons } from "@/lib/iconify";

export const Route = createFileRoute("/ai-search")({
  head: () => ({
    meta: [
      { title: "AI icon search - describe it, we find it | IconVault" },
      {
        name: "description",
        content:
          "Describe the idea in plain language and get matching icons across 421,020 open-source glyphs. No keyword guessing, no set-by-set hunting.",
      },
      { property: "og:title", content: "AI icon search - describe it, we find it" },
      {
        property: "og:description",
        content: "Describe an idea in plain language and get matching icons instantly.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/ai-search" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/ai-search" }],
  }),
  component: Page,
});

/** Small concept map that turns intent phrases into the keywords icon sets actually use. */
const conceptMap: Record<string, string[]> = {
  buy: ["cart", "basket", "bag"],
  purchase: ["cart", "credit-card", "receipt"],
  checkout: ["cart", "credit-card", "wallet"],
  money: ["cash", "coin", "wallet", "currency"],
  payment: ["credit-card", "wallet", "receipt"],
  secure: ["lock", "shield", "key"],
  security: ["shield", "lock", "fingerprint"],
  private: ["lock", "eye-off", "shield"],
  fast: ["bolt", "rocket", "gauge"],
  speed: ["gauge", "bolt", "timer"],
  delete: ["trash", "x", "eraser"],
  remove: ["trash", "minus", "x"],
  edit: ["pencil", "pen", "edit"],
  settings: ["cog", "gear", "sliders", "wrench"],
  profile: ["user", "account", "person"],
  team: ["users", "people", "group"],
  message: ["chat", "comment", "mail"],
  email: ["mail", "envelope", "inbox"],
  upload: ["upload", "cloud-upload", "arrow-up-tray"],
  download: ["download", "cloud-download", "arrow-down-tray"],
  analytics: ["chart", "graph", "bar-chart", "trending-up"],
  report: ["chart", "document", "file-text"],
  time: ["clock", "timer", "calendar"],
  schedule: ["calendar", "clock", "event"],
  location: ["map-pin", "map", "globe"],
  ship: ["truck", "package", "box"],
  delivery: ["truck", "package", "box"],
  ai: ["sparkles", "robot", "brain", "cpu"],
  smart: ["sparkles", "brain", "lightbulb"],
  idea: ["lightbulb", "bulb", "sparkles"],
  warning: ["alert", "triangle", "exclamation"],
  error: ["alert-circle", "x-circle", "bug"],
  success: ["check", "check-circle", "badge-check"],
  favourite: ["heart", "star", "bookmark"],
  favorite: ["heart", "star", "bookmark"],
  search: ["search", "magnify", "zoom"],
  filter: ["filter", "funnel", "sliders"],
  dark: ["moon", "eclipse"],
  light: ["sun", "brightness"],
  notification: ["bell", "alarm"],
  home: ["home", "house"],
  file: ["file", "document", "folder"],
  cloud: ["cloud", "server", "database"],
  code: ["code", "terminal", "braces"],
  design: ["palette", "brush", "pen-tool"],
  music: ["music", "headphones", "speaker"],
  video: ["video", "film", "play"],
  photo: ["image", "camera", "picture"],
  health: ["heart-pulse", "stethoscope", "pill"],
  travel: ["plane", "map", "suitcase"],
  food: ["utensils", "pizza", "coffee"],
  weather: ["cloud", "sun", "rain"],
};

const stopWords = new Set([
  "a", "an", "the", "for", "with", "that", "this", "some", "icon", "icons", "of", "to", "and",
  "i", "need", "want", "looking", "something", "show", "me", "find", "like", "in", "on", "my",
]);

const expand = (input: string): string[] => {
  const words = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !stopWords.has(w));

  const terms = new Set<string>();
  words.forEach((w) => {
    terms.add(w);
    (conceptMap[w] ?? []).forEach((t) => terms.add(t));
  });
  if (words.length > 1) terms.add(words.join(" "));
  return [...terms].slice(0, 6);
};

const examples = [
  "something that means secure checkout",
  "empty state for no results found",
  "a friendly icon for an AI assistant",
  "shipping is on the way",
  "toggle dark mode",
  "team collaborating on a document",
];

function Page() {
  const [prompt, setPrompt] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const { addRecent } = useRecentlyViewed();
  const { record } = useSearchHistory();
  const runId = useRef(0);

  const run = useCallback(
    async (input: string) => {
      const text = input.trim();
      if (!text) return;
      const id = ++runId.current;
      const expanded = expand(text);
      setTerms(expanded);
      setLoading(true);
      setRan(true);
      try {
        const batches = await Promise.all(
          expanded.map((t) => searchIcons(t, 32).catch(() => ({ icons: [] as string[] }))),
        );
        if (id !== runId.current) return;
        const seen = new Set<string>();
        const merged: string[] = [];
        // Interleave so the first concept never drowns out the rest.
        const maxLen = Math.max(...batches.map((b) => b.icons.length), 0);
        for (let i = 0; i < maxLen; i++) {
          for (const batch of batches) {
            const icon = batch.icons[i];
            if (icon && !seen.has(icon)) {
              seen.add(icon);
              merged.push(icon);
            }
          }
        }
        setIcons(merged.slice(0, 120));
        record(text, merged.length);
      } finally {
        if (id === runId.current) setLoading(false);
      }
    },
    [record],
  );

  useEffect(() => {
    if (!prompt.trim()) return;
    const t = setTimeout(() => void run(prompt), 500);
    return () => clearTimeout(t);
  }, [prompt, run]);

  return (
    <PageShell
      wide
      eyebrow="Tools"
      title="Describe it. We'll find the icon."
      description="Icon sets name things like engineers, not like people. Type the meaning instead of the label and we'll translate it into the words the sets actually use."
    >
      <Stack>
        <div>
          <Reveal>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(prompt);
              }}
              className="surface-card flex items-center gap-3 p-2.5 pl-5"
            >
              <Sparkles className="h-4.5 w-4.5 shrink-0 text-primary" />
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the icon you need…"
                aria-label="Describe the icon you need"
                autoFocus
                className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              <button
                type="submit"
                className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Find icons <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            </form>
          </Reveal>

          <div className="mt-4 flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setPrompt(ex);
                  void run(ex);
                }}
                className="focus-ring rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {ex}
              </button>
            ))}
          </div>

          {terms.length > 0 && (
            <p className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="uppercase tracking-widest">Searching for</span>
              {terms.map((t) => (
                <span key={t} className="rounded-md bg-primary-soft px-2 py-0.5 text-primary">
                  {t}
                </span>
              ))}
            </p>
          )}

          <div className="mt-8">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" /> Interpreting your description…
              </div>
            ) : icons.length > 0 ? (
              <IconifyGrid icons={icons} onIconClick={setActiveIcon} />
            ) : ran ? (
              <div className="surface-card p-10 text-center">
                <p className="font-display text-lg font-semibold">Nothing matched that description</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Try naming the object rather than the feeling - "shield" beats "trustworthy". Still
                  missing? Request the icon and we'll chase the upstream set.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="How it works"
            title="Meaning in, keywords out"
            description="Your description is broken into concepts, each concept is expanded into the vocabulary icon authors use, and the result sets are interleaved so no single keyword dominates the grid. Nothing you type is stored on our servers."
          />
        </div>

        <CTABand
          title="Still can't find it?"
          body="Request the icon and we'll either point you at an existing glyph or push the upstream set to draw it."
          primary={{ label: "Request an icon", to: "/request" }}
          secondary={{ label: "Browse by set", to: "/app" }}
        />
      </Stack>

      {activeIcon && (
        <IconifyDetail iconId={activeIcon} onClose={() => setActiveIcon(null)} onAddToRecent={addRecent} />
      )}
    </PageShell>
  );
}
