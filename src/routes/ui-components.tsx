import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Download, Search, X } from "lucide-react";
import { downloadWithGate } from "@/lib/download-guard";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import RouteError from "@/components/RouteError";
import { GallerySeoSections } from "@/components/GallerySeoSections";
import { UI_COMPONENTS_SEO } from "@/lib/gallery-seo";
import {
  UI_COMPONENT_CATEGORIES,
  UI_COMPONENT_COUNTS,
  UI_COMPONENT_LOADERS,
  UI_COMPONENT_SOURCES,
  UI_COMPONENTS_TOTAL,
  loadComponentIndex,
  type UiComponentCategory,
  type UiComponentEntry,
  type UiComponentMeta,
} from "@/lib/ui-components-data";
import { cn } from "@/lib/utils";
import {
  ComponentPreview,
  LazyPreview,
  standaloneDoc,
} from "@/components/UiComponentPreview";

export const Route = createFileRoute("/ui-components")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search["open"] === "string" ? search["open"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "3359 Free UI Components - Buttons, Cards, Loaders, Navigation, Sections & More | IconVault" },
      {
        name: "description",
        content:
          "3359 free open-source UI components from Uiverse, HyperUI and Flowbite: buttons, cards, loaders, navigation, sections, toggles, inputs and more. Preview, copy the HTML, JSX or CSS, and paste into any project. MIT licensed.",
      },
      { property: "og:title", content: "Free UI Components | IconVault" },
      {
        property: "og:description",
        content:
          "3359 free MIT-licensed UI components with live previews. Copy the HTML, JSX or CSS and ship faster.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/ui-components" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/ui-components" }],
  }),
  component: Page,
  errorComponent: RouteError,
});

type CategoryFilter = "all" | UiComponentCategory;
type CodeTab = "html" | "jsx" | "css";

const PAGE_SIZE = 24;

const CATEGORY_ORDER = UI_COMPONENT_CATEGORIES.map((c) => c.id);

const SOURCE_LABEL = new Map(
  UI_COMPONENT_SOURCES.map((s) => [s.id, s.label] as const),
);

const VOID_TAGS = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
];

/** Best-effort HTML -> JSX: class/for/tabindex renames + self-closed void tags. */
function htmlToJsx(html: string): string {
  let out = html
    .replace(/\bclass=/g, "className=")
    .replace(/\bfor=/g, "htmlFor=")
    .replace(/\btabindex=/g, "tabIndex=");
  for (const tag of VOID_TAGS) {
    out = out.replace(new RegExp(`<${tag}([^>]*?)(?<!/)>`, "g"), `<${tag}$1 />`);
  }
  return out;
}

// v55 download gate: anonymous users park the file + get the sign-in prompt;
// it resumes automatically after login.
function downloadBlob(name: string, blob: Blob) {
  downloadWithGate(blob, name);
}

async function copyText(text: string, okMsg: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    } catch {
      toast.error("Copy failed - select the code manually");
      return false;
    }
  }
  toast.success(okMsg);
  return true;
}

function DetailModal({ entry, onClose }: { entry: UiComponentEntry; onClose: () => void }) {
  const [tab, setTab] = useState<CodeTab>("html");
  const [copied, setCopied] = useState(false);
  const tabs: Array<{ id: CodeTab; label: string }> = [
    { id: "html", label: "HTML" },
    { id: "jsx", label: "JSX" },
    ...(entry.css ? [{ id: "css" as CodeTab, label: "CSS" }] : []),
  ];
  const code = tab === "html" ? entry.html : tab === "jsx" ? htmlToJsx(entry.html) : entry.css;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    setTab("html");
    setCopied(false);
  }, [entry]);

  const onCopy = async () => {
    if (await copyText(code, "Code copied")) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm [animation-duration:150ms]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.title} details`}
    >
      <div
        className="surface-card animate-pop max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6 [animation-duration:200ms]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{entry.title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Free UI component · MIT license · by {entry.author} · via{" "}
              {SOURCE_LABEL.get(entry.source) ?? entry.source}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl bg-white p-6 ring-1 ring-inset ring-border/60">
          <ComponentPreview entry={entry} fluidCap={560} />
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  tab === t.id
                    ? "bg-primary font-medium text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t.label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onCopy}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                Copy {tab.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    `${entry.slug}.html`,
                    new Blob([standaloneDoc(entry)], { type: "text/html" }),
                  )
                }
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download .html
              </button>
            </div>
          </div>
          <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-muted/60 p-4 text-left text-[13px] leading-relaxed">
            <code>{code}</code>
          </pre>
          {!entry.css && (
            <p className="mt-2 text-xs text-muted-foreground">
              This component uses Tailwind CSS classes: paste it into a Tailwind project.
            </p>
          )}
          {entry.needsJs && (
            <p className="mt-2 text-xs text-muted-foreground">
              This component&apos;s interactive parts need{" "}
              {SOURCE_LABEL.get(entry.source) ?? entry.source}&apos;s JavaScript — the
              preview shows its static state.
            </p>
          )}
          {entry.source === "flowbite" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Uses Flowbite theme classes (bg-brand, text-heading…) — include Flowbite&apos;s
              default theme in your Tailwind project for exact colors.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<CategoryFilter>("all");
  const [selected, setSelected] = useState<UiComponentEntry | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // On-demand data: the metadata index loads first (no html/css), then
  // each category's code chunk loads only when it is actually shown.
  // This keeps the first visit fast no matter how many components exist.
  const [index, setIndex] = useState<UiComponentMeta[] | null>(null);
  const [chunks, setChunks] = useState<
    Partial<Record<UiComponentCategory, UiComponentEntry[]>>
  >({});
  const loadedRef = useRef<Set<UiComponentCategory>>(new Set());
  const inFlightRef = useRef<Set<UiComponentCategory>>(new Set());
  const startedRef = useRef(false);
  const deepLinkRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const catLabelById = useMemo(
    () => new Map(UI_COMPONENT_CATEGORIES.map((c) => [c.id, c.label] as const)),
    [],
  );
  const sourceLabelById = useMemo(
    () => new Map(UI_COMPONENT_SOURCES.map((s) => [s.id, s.label] as const)),
    [],
  );

  const ensureCats = useCallback((cats: readonly UiComponentCategory[]) => {
    for (const cat of cats) {
      if (loadedRef.current.has(cat) || inFlightRef.current.has(cat)) continue;
      inFlightRef.current.add(cat);
      void UI_COMPONENT_LOADERS[cat]().then(
        (mod) => {
          inFlightRef.current.delete(cat);
          loadedRef.current.add(cat);
          setChunks((prev) => ({ ...prev, [cat]: mod.ENTRIES }));
        },
        () => {
          inFlightRef.current.delete(cat);
        },
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadComponentIndex().then((mod) => {
      if (!cancelled) setIndex(mod.UI_COMPONENTS_INDEX);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, catFilter]);

  const q = query.trim().toLowerCase();

  const filteredMeta = useMemo(() => {
    if (!index) return [];
    return index.filter((e) => {
      if (catFilter !== "all" && e.category !== catFilter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.author.toLowerCase().includes(q) ||
        (catLabelById.get(e.category) ?? "").toLowerCase().includes(q) ||
        (sourceLabelById.get(e.source) ?? "").toLowerCase().includes(q)
      );
    });
  }, [index, catFilter, q, catLabelById, sourceLabelById]);

  const progressive = !q && catFilter === "all";

  // Filtered views and searches load every category they can show.
  useEffect(() => {
    if (!index || progressive) return;
    const cats = [...new Set(filteredMeta.map((m) => m.category))];
    ensureCats(cats);
  }, [index, progressive, filteredMeta, ensureCats]);

  // The unfiltered "All" view starts with the first category; the
  // sentinel below loads the next category as the user scrolls.
  useEffect(() => {
    if (!index || !progressive || startedRef.current) return;
    startedRef.current = true;
    const first = CATEGORY_ORDER[0];
    if (first) ensureCats([first]);
  }, [index, progressive, ensureCats]);

  const pool = useMemo(() => {
    const byKey = new Map<string, UiComponentEntry>();
    for (const cat of CATEGORY_ORDER) {
      for (const e of chunks[cat] ?? []) {
        byKey.set(`${e.category}:${e.slug}`, e);
      }
    }
    const out: UiComponentEntry[] = [];
    for (const m of filteredMeta) {
      const e = byKey.get(`${m.category}:${m.slug}`);
      if (e) out.push(e);
    }
    return out;
  }, [chunks, filteredMeta]);

  const { open } = Route.useSearch();
  useEffect(() => {
    if (!open || !index) return;
    const sep = open.indexOf(":");
    if (sep < 0) return;
    const meta = index.find(
      (e) => e.category === open.slice(0, sep) && e.slug === open.slice(sep + 1),
    );
    if (meta) ensureCats([meta.category]);
  }, [open, index, ensureCats]);

  useEffect(() => {
    if (!open || deepLinkRef.current === open) return;
    const sep = open.indexOf(":");
    if (sep < 0) return;
    for (const cat of CATEGORY_ORDER) {
      const hit = (chunks[cat] ?? []).find(
        (e) => `${e.category}:${e.slug}` === open,
      );
      if (hit) {
        deepLinkRef.current = open;
        setSelected(hit);
        return;
      }
    }
  }, [open, chunks]);

  const loadedCount = Object.keys(chunks).length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (visibleCount < pool.length) {
          setVisibleCount((c) => (c < pool.length ? c + PAGE_SIZE : c));
          return;
        }
        if (progressive) {
          const next = CATEGORY_ORDER.find(
            (c) => !loadedRef.current.has(c) && !inFlightRef.current.has(c),
          );
          if (next) ensureCats([next]);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pool.length, visibleCount, progressive, ensureCats]);

  const visible = pool.slice(0, visibleCount);

  return (
    <PageShell fullWidth>
      <Reveal>
        <div className="text-center">
          <p className="eyebrow">Open-source · MIT licensed</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            <span className="text-gradient">{UI_COMPONENTS_TOTAL}</span> Free UI{" "}
            <span className="text-gradient">components</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-muted-foreground">
            Copy-paste buttons, cards, loaders, navigation, sections, toggles, inputs and
            more from open-source libraries — the Uiverse community, HyperUI and Flowbite.
            Preview live, copy the HTML, JSX or CSS, and paste into any project - free for
            personal and commercial use.
          </p>
        </div>
      </Reveal>

      <Reveal delay={70}>
        <div className="surface-card mt-8 p-4">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components…"
              className="focus-ring w-full rounded-full border border-border bg-surface py-2.5 pl-11 pr-4 text-sm"
              aria-label="Search UI components"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4">
            <button
              type="button"
              onClick={() => setCatFilter("all")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                catFilter === "all"
                  ? "bg-primary font-medium text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted",
              )}
            >
              All · {UI_COMPONENTS_TOTAL}
            </button>
            {UI_COMPONENT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCatFilter(c.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  catFilter === c.id
                    ? "bg-primary font-medium text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {c.label} · {UI_COMPONENT_COUNTS[c.id] ?? 0}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {index === null ? (
        <p className="mt-10 text-center text-muted-foreground">Loading components…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((entry, i) => (
              <Reveal
                key={`${entry.category}:${entry.slug}`}
                delay={Math.min((i % PAGE_SIZE) * 15, 300)}
                className="h-full"
              >
                <button
                  type="button"
                  onClick={() => setSelected(entry)}
                  className="surface-card lift-hover focus-ring group block h-full w-full p-4 text-left transition-transform active:scale-[0.98]"
                  aria-label={`View ${entry.title} code`}
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
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {catLabelById.get(entry.category)} · by {entry.author} · MIT
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-transform group-hover:translate-x-0.5">
                      Click Here <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>

          {pool.length === 0 && filteredMeta.length === 0 && (
            <p className="mt-10 text-center text-muted-foreground">
              No components match “{query}”.
            </p>
          )}
          {pool.length === 0 && filteredMeta.length > 0 && (
            <p className="mt-10 text-center text-muted-foreground">Loading components…</p>
          )}

          {(visibleCount < pool.length ||
            (progressive && loadedCount < CATEGORY_ORDER.length)) && (
            <div ref={sentinelRef} className="mt-10 text-center" aria-hidden="true">
              <span className="text-sm text-muted-foreground">Loading more components…</span>
            </div>
          )}
        </>
      )}

      <p className="mt-10 text-center text-sm text-muted-foreground">
        All components are MIT licensed, by their original authors at Uiverse, HyperUI and
        Flowbite. Copy, tweak and use them in personal and commercial projects.
      </p>

      <GallerySeoSections seo={UI_COMPONENTS_SEO} />

      {selected && <DetailModal entry={selected} onClose={() => setSelected(null)} />}
    </PageShell>
  );
}

export default Page;
