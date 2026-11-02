import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import type { AnimatedIconEntry } from "@/lib/animated-icons-data";
import { useAuth } from "@/hooks/useAuth";
import { requestAuth } from "@/lib/download-guard";

// Side code panel for animated-icon detail pages: preview stays on the left,
// the reusable code sits on the right, so users can copy it without downloading.
// Code is fetched from the same static files the Download buttons serve, so the
// bundle stays metadata-only (see animated-icons-data.ts). v68: copy is gated
// behind sign-in for ALL items (founder's 2 Nov QA decision); Pro picks show
// an upgrade prompt instead of code, matching their gated downloads — otherwise
// the panel would give Pro content away for free.

interface Tab {
  id: string;
  label: string;
  // Static text (already in the bundle) or a static file to fetch.
  text?: string;
  url?: string;
  hint?: string;
}

// Epic Spinners ship a standalone HTML demo file. The reusable part is its
// <style> block + body markup, so extract those; fall back to the full file
// when the shape is unexpected.
function extractReusable(html: string): string {
  const style = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1]?.trim();
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim();
  if (style && body) return `<style>\n${style}\n</style>\n\n${body}`;
  if (style) return `<style>\n${style}\n</style>`;
  if (body) return body;
  return html;
}

function tabsFor(item: AnimatedIconEntry): Tab[] {
  const base = `/animated-icons/${item.slug}`;
  if (item.format === "css") {
    const usage = `<link rel="stylesheet" href="${base}/${item.files[0]}">\n${item.markup}`;
    const hint =
      item.pack === "whirl"
        ? "Set --primary / --secondary to recolour."
        : "Set --sk-color / --sk-size to recolour.";
    const tabs: Tab[] = [
      { id: "usage", label: "Usage", text: usage, hint },
      { id: "css", label: "CSS", url: `${base}/${item.files[0]}` },
    ];
    return tabs;
  }
  if (item.format === "html-css") {
    return [
      {
        id: "code",
        label: "HTML + CSS",
        url: `${base}/${item.files[0]}`,
        hint: "The reusable <style> + markup from the standalone demo file. The full file is still available via Download below.",
      },
    ];
  }
  // svg-smil / svg-static (Meteocons, SVG-Loaders): the SVG markup itself is
  // the use code. Lottie JSON is never shown as copyable code (too large for a
  // panel); the Play button streams it for preview playback only.
  const svgFile = item.files.find((f) => f.endsWith(".svg"));
  if (svgFile) {
    return [
      {
        id: "svg",
        label: "SVG",
        url: `${base}/${svgFile}`,
        hint:
          item.pack === "meteocons"
            ? "Paste this SVG inline, or use it as an <img> source. The Lottie JSON version is available via Download below."
            : "Paste this SVG inline, or use it as an <img> source.",
      },
    ];
  }
  return [];
}

export function AnimatedCodePanel({ item }: { item: AnimatedIconEntry }) {
  const { user } = useAuth();
  const tabs = useMemo(() => tabsFor(item), [item]);
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  useEffect(() => {
    setActiveId(tabs[0]?.id ?? "");
    setTexts({});
    setFailed({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);

  useEffect(() => {
    if (!active || item.premium) return undefined;
    if (active.text !== undefined) {
      setTexts((prev) => (prev[active.id] === undefined ? { ...prev, [active.id]: active.text as string } : prev));
      return undefined;
    }
    if (active.url && texts[active.id] === undefined && !failed[active.id]) {
      let cancelled = false;
      fetch(active.url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((raw) => {
          if (cancelled) return;
          const text = item.format === "html-css" ? extractReusable(raw) : raw;
          setTexts((prev) => ({ ...prev, [active.id]: text }));
        })
        .catch(() => {
          if (!cancelled) setFailed((prev) => ({ ...prev, [active.id]: true }));
        });
      return () => {
        cancelled = true;
      };
    }
    return undefined;
  }, [active, item.format, texts, failed]);

  if (tabs.length === 0 || !active) return null;

  // Pro picks: no code on the page at all — not even fetched. The preview above
  // stays visible (previews are free); only the code + copy are Pro-gated.
  if (item.premium) {
    return (
      <section className="flex flex-col rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Code</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This is a curated Pro pick — upgrade to Pro to view and copy the code.
        </p>
        <Link
          to="/pro"
          className="mt-4 inline-flex w-fit items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Upgrade to Pro
        </Link>
      </section>
    );
  }

  const content = texts[active.id];
  const isFailed = failed[active.id] === true;

  const copy = async () => {
    if (!content) return;
    if (!user) {
      requestAuth("Sign in to copy code — it's free.");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Code</h2>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.length > 1 &&
            tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={`rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent ${
                  t.id === active.id ? "bg-primary text-primary-foreground hover:opacity-90" : ""
                }`}
              >
                {t.label}
              </button>
            ))}
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!content}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy code"}
          </button>
        </div>
      </div>
      {active.hint && <p className="mt-2 text-xs text-muted-foreground">{active.hint}</p>}
      <pre className="mt-3 max-h-[420px] flex-1 overflow-auto rounded-xl bg-muted p-4 text-xs">
        <code>
          {isFailed
            ? "Code preview unavailable — use the Download button below."
            : content === undefined
              ? "Loading code…"
              : content}
        </code>
      </pre>
      {item.pack === "spinkit" && (
        <p className="mt-2 text-xs text-muted-foreground">
          SpinKit&apos;s centring helper class (.sk-center) is not duplicated in each file — add it
          once yourself if you need centred spinners.
        </p>
      )}
    </section>
  );
}
