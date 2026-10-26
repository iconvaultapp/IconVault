import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Search, X } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import RouteError from "@/components/RouteError";
import {
  UI_COMPONENTS,
  UI_COMPONENT_CATEGORIES,
  type UiComponentCategory,
  type UiComponentEntry,
} from "@/lib/ui-components-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ui-components")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search["open"] === "string" ? search["open"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Free UI Components - Copy-Paste Buttons, Cards, Loaders & More | IconVault" },
      {
        name: "description",
        content:
          "1000 free open-source UI components for developers: buttons, cards, loaders, toggles, inputs, checkboxes and more. Preview, copy the HTML, JSX or CSS, and paste into any project. MIT licensed.",
      },
      { property: "og:title", content: "Free UI Components | IconVault" },
      {
        property: "og:description",
        content:
          "1000 free MIT-licensed UI components with live previews. Copy the HTML, JSX or CSS and ship faster.",
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

/** Base page style shared by iframe previews and standalone downloads. */
const BASE_STYLE =
  "html,body{margin:0;min-height:100%;display:grid;place-items:center;padding:8px;box-sizing:border-box}body{font-family:system-ui,sans-serif}";

/** Full standalone document for a component: iframe previews + .html downloads. */
function standaloneDoc(entry: UiComponentEntry): string {
  const style = entry.css
    ? `<style>\n${entry.css}\n</style>`
    : `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>\n<!-- This component uses Tailwind CSS classes: paste it into a Tailwind project, or open this file with internet access for the CDN build. -->`;
  return `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${entry.title}</title>\n<style>${BASE_STYLE}</style>\n${style}\n</head>\n<body>\n${entry.html}\n</body>\n</html>`;
}

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

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

/**
 * Live preview. CSS components render in a sandboxed iframe so their
 * generic class names (.card, .cta, ...) can never leak into the page.
 * Pure-Tailwind components have no custom CSS, so they render inline with
 * the site's own Tailwind build.
 *
 * Fit fix (Sameer 2026-10-26): Uiverse components often have large fixed
 * sizes, so a raw preview overflows its card and shows scrollbars with
 * clipped content. Every preview now measures its content after render and
 * zooms it down to fit the stage (never up), and hides all overflow, so
 * the whole component is always visible inside its card.
 */
/** Fluid preview bounds (Sameer 2026-10-26): the preview area grows to the
 * component's own height instead of clipping it into a fixed box, so the
 * whole component is always visible. Taller than this, it scales down. */
const FLUID_MAX = 480;
const FLUID_MIN = 96;

function IframePreview({
  entry,
  className,
  lazy,
  fluid,
}: {
  entry: UiComponentEntry;
  className?: string | undefined;
  lazy?: boolean | undefined;
  fluid?: boolean | undefined;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [fluidHeight, setFluidHeight] = useState(176);

  const fit = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc || !doc.body) return;
    // Reset first: a previous zoom would corrupt the measurement.
    doc.body.style.setProperty("zoom", "1");
    const stageW = frame.clientWidth;
    const contentW = Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth);
    const contentH = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
    if (!stageW || !contentW || !contentH) return;
    if (fluid) {
      // Fit the width, grow the height to the component (capped).
      const scale = Math.min(1, stageW / contentW, FLUID_MAX / contentH);
      if (Number.isFinite(scale) && scale > 0) {
        doc.body.style.setProperty("zoom", String(scale));
        setFluidHeight(
          Math.min(FLUID_MAX + 2, Math.max(FLUID_MIN, Math.ceil(contentH * scale) + 2)),
        );
      }
    } else {
      const stageH = frame.clientHeight;
      if (!stageH) return;
      const scale = Math.min(1, stageW / contentW, stageH / contentH);
      if (Number.isFinite(scale) && scale > 0) {
        doc.body.style.setProperty("zoom", String(scale));
      }
    }
    doc.documentElement.style.setProperty("overflow", "hidden");
    doc.body.style.setProperty("overflow", "hidden");
  }, [fluid]);

  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  return (
    <iframe
      ref={frameRef}
      title={`${entry.title} preview`}
      sandbox="allow-scripts"
      scrolling="no"
      loading={lazy ? "lazy" : undefined}
      onLoad={fit}
      srcDoc={standaloneDoc(entry)}
      style={fluid ? { height: fluidHeight } : undefined}
      className={cn("w-full overflow-hidden border-0 bg-white", className)}
    />
  );
}

function InlinePreview({
  entry,
  className,
  fluid,
}: {
  entry: UiComponentEntry;
  className?: string | undefined;
  fluid?: boolean | undefined;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [fluidHeight, setFluidHeight] = useState(176);

  const fit = useCallback(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content) return;
    // Reset first: a previous zoom would corrupt the measurement.
    content.style.setProperty("zoom", "1");
    void content.offsetWidth;
    const stageW = stage.clientWidth;
    const contentW = content.scrollWidth;
    const contentH = content.scrollHeight;
    if (!stageW || !contentW || !contentH) return;
    if (fluid) {
      const next = Math.min(1, stageW / contentW, FLUID_MAX / contentH);
      if (Number.isFinite(next) && next > 0) {
        setScale(next);
        setFluidHeight(
          Math.min(FLUID_MAX + 2, Math.max(FLUID_MIN, Math.ceil(contentH * next) + 2)),
        );
      }
    } else {
      const stageH = stage.clientHeight;
      if (!stageH) return;
      const next = Math.min(1, stageW / contentW, stageH / contentH);
      if (Number.isFinite(next) && next > 0) setScale(next);
    }
  }, [fluid]);

  useEffect(() => {
    fit();
    const timer = setTimeout(fit, 100);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", fit);
    };
  }, [fit, entry]);

  return (
    <div
      ref={stageRef}
      style={fluid ? { height: fluidHeight } : undefined}
      className={cn("grid place-items-center overflow-hidden bg-white", className)}
    >
      <div
        ref={contentRef}
        style={{ zoom: scale }}
        // Curated static strings from the bundled data file, never user input.
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />
    </div>
  );
}

function ComponentPreview({
  entry,
  className,
  lazy,
  fluid,
}: {
  entry: UiComponentEntry;
  className?: string;
  lazy?: boolean;
  fluid?: boolean;
}) {
  if (!entry.css) return <InlinePreview entry={entry} className={className} fluid={fluid} />;
  return <IframePreview entry={entry} className={className} lazy={lazy} fluid={fluid} />;
}

/**
 * Speed (Sameer 2026-10-26): grid previews mount only when their card is
 * near the viewport. 24 simultaneous iframes, each parsing its own CSS and
 * running animations, were this page's real cost; below-fold cards now stay
 * a plain placeholder until scrolled near. The modal preview stays eager.
 */
function LazyPreview({ entry }: { entry: UiComponentEntry }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      {mounted ? (
        <ComponentPreview entry={entry} lazy fluid />
      ) : (
        <div className="h-44 w-full bg-white" aria-hidden="true" />
      )}
    </div>
  );
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
    };
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
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm [animation-duration:150ms]"
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
              Free UI component · MIT license · by {entry.author}
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

        <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-inset ring-border/60">
          <ComponentPreview entry={entry} className="min-h-64 p-6" />
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
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, catFilter]);

  const { open } = Route.useSearch();
  useEffect(() => {
    if (!open) return;
    const sep = open.indexOf(":");
    if (sep < 0) return;
    const entry = UI_COMPONENTS.find(
      (e) => e.category === open.slice(0, sep) && e.slug === open.slice(sep + 1),
    );
    if (entry) setSelected(entry);
  }, [open ]);

  const catCounts = useMemo(() => {
    const counts = new Map<UiComponentCategory, number>();
    for (const e of UI_COMPONENTS) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return counts;
  }, []);

  const catLabelById = useMemo(
    () => new Map(UI_COMPONENT_CATEGORIES.map((c) => [c.id, c.label] as const)),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return UI_COMPONENTS.filter((e) => {
      if (catFilter !== "all" && e.category !== catFilter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.author.toLowerCase().includes(q) ||
        (catLabelById.get(e.category) ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, catFilter, catLabelById]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => (c < filtered.length ? c + PAGE_SIZE : c));
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <PageShell fullWidth>
      <Reveal>
        <div className="text-center">
          <p className="eyebrow">{UI_COMPONENTS.length} free UI components</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Free UI <span className="text-gradient">components</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-muted-foreground">
            Copy-paste buttons, cards, loaders, toggles, inputs and more from the open-source
            Uiverse community. Preview live, copy the HTML, JSX or CSS, and paste into any
            project - free for personal and commercial use.
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
              All · {UI_COMPONENTS.length}
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
                {c.label} · {catCounts.get(c.id) ?? 0}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

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
              className="surface-card lift-hover focus-ring group block h-full w-full p-4 text-left"
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
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {catLabelById.get(entry.category)} · by {entry.author} · MIT
              </span>
            </button>
          </Reveal>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          No components match “{query}”.
        </p>
      )}

      {visibleCount < filtered.length && (
        <div ref={sentinelRef} className="mt-10 text-center" aria-hidden="true">
          <span className="text-sm text-muted-foreground">Loading more components…</span>
        </div>
      )}

      <p className="mt-10 text-center text-sm text-muted-foreground">
        All components are MIT licensed, by their Uiverse community authors. Copy, tweak and
        use them in personal and commercial projects.
      </p>

      {selected && <DetailModal entry={selected} onClose={() => setSelected(null)} />}
    </PageShell>
  );
}

export default Page;
