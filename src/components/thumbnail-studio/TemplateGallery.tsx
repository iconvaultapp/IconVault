// Template gallery for the Thumbnail Studio: search, niche filter,
// lazy-rendered Fabric previews, Free/Pro gating.

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Lock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FABRIC_NICHES,
  FABRIC_TEMPLATES,
  getFabricTemplate,
  searchFabricTemplates,
  type FabricTemplateMeta,
} from "@/lib/thumbnail-fabric-library";
import { renderTemplatePreview, onPreviewUpdate } from "./fabric-helpers";

function TemplateCard({
  meta,
  locked,
  onOpen,
  compact,
}: {
  meta: FabricTemplateMeta;
  locked: boolean;
  onOpen: () => void;
  compact?: boolean | undefined;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dead = false;
    // Re-render with real studio fonts when they arrive (first paint uses
    // fallback fonts so the gallery never waits on the font CDN).
    const unsub = onPreviewUpdate(meta.id, (url) => {
      if (!dead) setSrc(url);
    });
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect();
          const t = getFabricTemplate(meta.id);
          if (t) renderTemplatePreview(meta.id, t.json).then((url) => !dead && setSrc(url));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      dead = true;
      io.disconnect();
      unsub();
    };
  }, [meta.id]);

  if (compact) {
    return (
      <button
        ref={ref}
        onClick={onOpen}
        title={meta.name}
        className="group relative overflow-hidden rounded-lg border border-border bg-surface text-left transition hover:border-primary/60 hover:shadow-md"
      >
        <div className="aspect-video w-full bg-surface-2">
          {src ? (
            <img src={src} alt={meta.name} className="h-full w-full object-cover" loading="lazy" draggable={false} />
          ) : (
            <div className="h-full w-full animate-pulse bg-surface-2" />
          )}
        </div>
        {meta.isPro && (
          <span className="absolute right-1 top-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
            PRO
          </span>
        )}
        <p className="truncate px-1.5 py-1 text-[10px] font-medium text-foreground/80">{meta.name}</p>
        {locked && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100">
            <Lock className="h-4 w-4 text-white" />
          </div>
        )}
      </button>
    );
  }
  return (
    <button
      ref={ref}
      onClick={onOpen}
      className="group relative overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:border-primary/50 hover:shadow-lg"
    >
      <div className="aspect-video w-full bg-surface-2">
        {src ? (
          <img src={src} alt={meta.name} className="h-full w-full object-cover" loading="lazy" draggable={false} />
        ) : (
          <div className="h-full w-full animate-pulse bg-surface-2" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="truncate text-[13px] font-medium">{meta.name}</p>
        {meta.isPro ? (
          <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", locked ? "bg-amber-100 text-amber-700" : "bg-primary-soft text-primary")}>
            {locked ? <Lock className="h-3 w-3" /> : <Crown className="h-3 w-3" />} PRO
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">FREE</span>
        )}
      </div>
      {locked && (
        <div className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-700">
            <Crown className="h-3.5 w-3.5" /> Unlock Pro
          </span>
        </div>
      )}
    </button>
  );
}

export default function TemplateGallery({
  isPro,
  onOpen,
  onProNeeded,
  compact,
}: {
  isPro: boolean;
  onOpen: (id: string) => void;
  onProNeeded: () => void;
  compact?: boolean | undefined;
}) {
  const [q, setQ] = useState("");
  const [niche, setNiche] = useState("all");
  const [tier, setTier] = useState<"all" | "free" | "pro">("all");

  // Pagination: 50 at a time normally, 25 when searching, +15 per "Load more".
  // Keeps the page fast: only visible cards spin up a Fabric preview render.
  const PAGE = 50;
  const SEARCH_PAGE = 25;
  const MORE = 15;
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => {
    setVisible(q.trim() ? SEARCH_PAGE : PAGE);
  }, [q, niche, tier]);

  const list = useMemo(() => {
    let l = searchFabricTemplates(q);
    if (niche !== "all") l = l.filter((m) => m.niche === niche);
    if (tier === "free") l = l.filter((m) => !m.isPro);
    if (tier === "pro") l = l.filter((m) => m.isPro);
    return l;
  }, [q, niche, tier]);
  const shown = list.slice(0, visible);

  const open = (m: FabricTemplateMeta) => {
    if (m.isPro && !isPro) onProNeeded();
    else onOpen(m.id);
  };

  return (
    <div>
      <div className={compact ? "mb-3 flex flex-col gap-2" : "mb-4 flex flex-col gap-3"}>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={compact ? "Search templates..." : "Search 650 templates - try 'gaming', 'travel', 'food'..."}
            className={compact
              ? "w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
              : "w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"}
          />
        </div>
        <div className={compact ? "flex items-center gap-1.5 overflow-x-auto pb-1" : "flex flex-wrap items-center gap-2"}>
          <button onClick={() => setNiche("all")} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", niche === "all" ? "bg-primary text-white" : "bg-surface-2 text-foreground/70 hover:bg-surface-3")}>
            All niches
          </button>
          {FABRIC_NICHES.map((n) => (
            <button key={n.id} onClick={() => setNiche(n.id)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", niche === n.id ? "bg-primary text-white" : "bg-surface-2 text-foreground/70 hover:bg-surface-3")}>
              {n.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{list.length} of {FABRIC_TEMPLATES.length} templates</span>
          <div className="ml-auto flex gap-1 rounded-full bg-surface-2 p-1">
            {(["all", "free", "pro"] as const).map((t) => (
              <button key={t} onClick={() => setTier(t)} className={cn("rounded-full px-3 py-1 font-semibold capitalize", tier === t ? "bg-white shadow text-foreground" : "text-muted-foreground")}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No templates match. Try another search.</p>
      ) : (
        <>
          <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"}>
            {shown.map((m) => (
              <TemplateCard key={m.id} meta={m} locked={m.isPro && !isPro} onOpen={() => open(m)} compact={compact} />
            ))}
          </div>
          {visible < list.length && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setVisible((v) => v + MORE)}
                className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow transition hover:opacity-90"
              >
                Load more ({list.length - visible} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
