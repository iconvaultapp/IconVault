// IconVault Thumbnail Studio - Canva-style editor for YouTube thumbnails.
// Layout mirrors the Canva structure Sameer approved from his screenshot:
// dark top bar (File / Resize / title / undo / export), left icon rail +
// context panel (Templates / Elements / Text / Uploads / Photos / Background),
// floating toolbar above the selected object, dotted canvas area, bottom
// zoom bar, collapsible Layers panel on the right.
// Editor engine: Fabric.js (MIT). History: JSON snapshots.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Undo2, Redo2, Download, Type, Upload, Shapes, Image as ImageIcon,
  Layers, Trash2, Copy, Eye, EyeOff, ChevronUp, ChevronDown, ChevronLeft,
  Lock, Unlock, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Plus,
  FlipHorizontal2, FlipVertical2, Eraser, Wand2, RefreshCw, LayoutTemplate,
  Minus, Search, FilePlus2, Pencil, Check,
} from "lucide-react";
import type { Canvas, FabricObject, FabricImage, Textbox, TPointerEventInfo } from "fabric";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TW, TH, STUDIO_FONTS,
  getFabricTemplate,
  type FabricCanvasJSON,
} from "@/lib/thumbnail-fabric-library";
import { PHOTO_TEMPLATES } from "@/lib/thumbnail-photo-library";
import {
  createStudioCanvas, loadTemplateJSON, loadStudioFonts,
  pushHistory, restoreHistory, exportDesign,
  addStudioText, addStudioShape, addStudioImage, fileToDataURL, setStudioBackground,
  flipActiveObject, applyImageFilter, removeImageBackground, startEraser,
  replaceImageSource, addGfxElement, setBackgroundImage, resizeDesign,
  DESIGN_SIZES,
  type CanvasHistory, type StudioExportFormat, type StudioShapeKind,
  type StudioImageFilter, type EraserSession,
} from "./fabric-helpers";
import { loadBgAi } from "@/lib/bg-ai";
import TemplateGallery from "./TemplateGallery";
import type { TrialState } from "@/lib/tool-trial";

// ---------- constants ----------

type RailId = "templates" | "elements" | "text" | "uploads" | "photos" | "background";

const RAILS: { id: RailId; label: string; icon: React.ReactNode }[] = [
  { id: "templates", label: "Templates", icon: <LayoutTemplate className="h-5 w-5" /> },
  { id: "elements", label: "Elements", icon: <Shapes className="h-5 w-5" /> },
  { id: "text", label: "Text", icon: <Type className="h-5 w-5" /> },
  { id: "uploads", label: "Uploads", icon: <Upload className="h-5 w-5" /> },
  { id: "photos", label: "Photos", icon: <ImageIcon className="h-5 w-5" /> },
  { id: "background", label: "Background", icon: <Layers className="h-5 w-5" /> },
];

const GFX_SECTIONS: { title: string; kind: string; n: number }[] = [
  { title: "Arrows", kind: "arrow", n: 12 },
  { title: "Money", kind: "money", n: 9 },
  { title: "Fire", kind: "fire", n: 7 },
  { title: "Hands", kind: "hand", n: 8 },
  { title: "Devices", kind: "device", n: 10 },
  { title: "Animals", kind: "animal", n: 8 },
  { title: "Abstract", kind: "abstract", n: 6 },
];

const gfxSrc = (kind: string, i: number) =>
  `/thumbs/gfx/gfx_${kind}_${String(i).padStart(2, "0")}.webp`;

const PHOTO_IDS: string[] = [...new Set(
  PHOTO_TEMPLATES.map((m) => m.id.slice(3, m.id.length - m.layout.length - 1)),
)];

const BG_SWATCHES = ["#101018", "#1e1e2a", "#7c2d12", "#0c4a6e", "#14532d", "#581c87", "#831843", "#f59e0b", "#faf7ef", "#e2e8f0", "#fecaca", "#111827"];
const BG_GRADIENTS: [string, string][] = [
  ["#7c3aed", "#db2777"], ["#0891b2", "#22d3ee"], ["#f59e0b", "#ef4444"],
  ["#16a34a", "#84cc16"], ["#1e1b4b", "#7c3aed"], ["#0f172a", "#334155"],
];

const IMAGE_FILTERS: { id: StudioImageFilter; label: string }[] = [
  { id: "none", label: "None" },
  { id: "grayscale", label: "Black & white" },
  { id: "sepia", label: "Sepia" },
  { id: "bright", label: "Brighten" },
];

// ---------- tiny atoms ----------

const PanelLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{children}</p>
);

const IconBtn = ({ title, onClick, disabled, active, children, dark }: {
  title: string; onClick: () => void; disabled?: boolean; active?: boolean; dark?: boolean; children: React.ReactNode;
}) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition",
      dark
        ? "text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-35"
        : "border border-border bg-surface hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-35",
      active && !dark && "border-primary bg-primary-soft text-primary",
      active && dark && "bg-white/15 text-white",
    )}
  >
    {children}
  </button>
);

const FloatBtn = ({ title, onClick, active, disabled, children }: {
  title: string; onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode;
}) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition",
      "text-slate-700 hover:bg-slate-100 disabled:opacity-35",
      active && "bg-violet-100 text-violet-700",
    )}
  >
    {children}
  </button>
);

const MenuItem = ({ onClick, children, danger }: {
  onClick: () => void; children: React.ReactNode; danger?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium transition hover:bg-slate-100",
      danger ? "text-red-600" : "text-slate-700",
    )}
  >
    {children}
  </button>
);

// ---------- left panels ----------

function ElementsPanel({ query, setQuery, onAddShape, onAddGfx }: {
  query: string; setQuery: (q: string) => void;
  onAddShape: (k: StudioShapeKind) => void; onAddGfx: (src: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const shapeGroups: { title: string; items: [StudioShapeKind, string][] }[] = [
    { title: "Basic shapes", items: [["rect", "Rectangle"], ["circle", "Circle"], ["triangle", "Triangle"], ["diamond", "Diamond"], ["hexagon", "Hexagon"], ["pentagon", "Pentagon"], ["star", "Star"], ["heart", "Heart"]] },
    { title: "Lines and arrows", items: [["line", "Line"], ["arrow", "Arrow"]] },
    { title: "Badges and stickers", items: [["starburst", "Starburst"], ["pill", "Pill"], ["plus", "Plus"], ["ring", "Ring"]] },
    { title: "Frames", items: [["frame", "Frame"], ["circle-frame", "Circle frame"]] },
  ];
  const shapeHits = shapeGroups
    .map((g) => ({ ...g, items: g.items.filter(([, label]) => !q || label.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length > 0);
  const gfxHits = GFX_SECTIONS.filter((s) => !q || s.title.toLowerCase().includes(q));
  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search elements"
          className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      {shapeHits.map((g) => (
        <div key={g.title}>
          <PanelLabel>{g.title}</PanelLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {g.items.map(([k, label]) => (
              <button
                key={k}
                onClick={() => onAddShape(k)}
                className="rounded-lg border border-border bg-surface px-1 py-2.5 text-[11px] font-semibold transition hover:border-primary/60"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {gfxHits.map((s) => (
        <div key={s.kind}>
          <PanelLabel>{s.title}</PanelLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: s.n }, (_, i) => {
              const src = gfxSrc(s.kind, i + 1);
              return (
                <button
                  key={src}
                  onClick={() => onAddGfx(src)}
                  className="grid aspect-square place-items-center overflow-hidden rounded-lg border border-border bg-surface-2/60 p-1 transition hover:border-primary/60"
                  title={`${s.title} ${i + 1}`}
                >
                  <img src={src} alt={`${s.title} sticker ${i + 1}`} loading="lazy" className="max-h-full max-w-full object-contain" draggable={false} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {shapeHits.length === 0 && gfxHits.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No elements match "{query}".</p>
      )}
    </div>
  );
}

function TextPanel({ onAddText }: { onAddText: (k: "heading" | "sub" | "body") => void }) {
  return (
    <div className="space-y-2">
      <PanelLabel>Add text</PanelLabel>
      {([["heading", "Add a heading", "text-2xl font-black"], ["sub", "Add a subheading", "text-lg font-bold"], ["body", "Add body text", "text-sm"]] as const).map(([k, label, cls]) => (
        <button
          key={k}
          onClick={() => onAddText(k)}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-primary/60"
        >
          <Plus className="h-4 w-4 shrink-0 text-primary" />
          <span className={cn("text-slate-700", cls)}>{label}</span>
        </button>
      ))}
      <p className="pt-2 text-xs text-muted-foreground">Tip: double-click any text on the canvas to edit it directly.</p>
    </div>
  );
}

function UploadsPanel({ uploads, onPick, onAdd }: {
  uploads: string[]; onPick: () => void; onAdd: (url: string) => void;
}) {
  return (
    <div className="space-y-3">
      <PanelLabel>Your images</PanelLabel>
      <button
        onClick={onPick}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-6 text-sm font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
      >
        <Upload className="h-4 w-4" /> Upload image
      </button>
      {uploads.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {uploads.map((u, i) => (
            <button
              key={i}
              onClick={() => onAdd(u)}
              className="aspect-video overflow-hidden rounded-lg border border-border transition hover:border-primary/60"
            >
              <img src={u} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Uploads stay in this session. Click one to add it to the canvas.</p>
    </div>
  );
}

function PhotosPanel({ onAddPhoto, onSetBg }: {
  onAddPhoto: (src: string) => void; onSetBg: (src: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <PanelLabel>AI photos - click to add</PanelLabel>
        <div className="grid grid-cols-2 gap-2">
          {PHOTO_IDS.map((id) => (
            <button
              key={id}
              onClick={() => onAddPhoto(`/thumbs/photos/${id}.webp`)}
              className="group relative aspect-video overflow-hidden rounded-lg border border-border transition hover:border-primary/60"
              title={id.replace(/-/g, " ")}
            >
              <img src={`/thumbs/photos/${id}.webp`} alt={id.replace(/-/g, " ")} loading="lazy" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <PanelLabel>Backgrounds - click to apply</PanelLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 53 }, (_, i) => {
            const src = gfxSrc("bg", i + 1);
            return (
              <button
                key={src}
                onClick={() => onSetBg(src)}
                className="aspect-video overflow-hidden rounded-lg border border-border transition hover:border-primary/60"
                title={`Background ${i + 1}`}
              >
                <img src={src} alt={`Background ${i + 1}`} loading="lazy" className="h-full w-full object-cover" draggable={false} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BackgroundPanel({ onSolid, onGradient }: {
  onSolid: (c: string) => void; onGradient: (a: string, b: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <PanelLabel>Solid</PanelLabel>
        <div className="grid grid-cols-6 gap-2">
          {BG_SWATCHES.map((c) => (
            <button key={c} title={c} onClick={() => onSolid(c)} className="h-9 rounded-lg border border-border transition hover:scale-105" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div>
        <PanelLabel>Gradient</PanelLabel>
        <div className="grid grid-cols-3 gap-2">
          {BG_GRADIENTS.map(([a, b], i) => (
            <button key={i} onClick={() => onGradient(a, b)} className="h-12 rounded-lg border border-border transition hover:scale-[1.03]" style={{ background: `linear-gradient(180deg, ${a}, ${b})` }} />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Or pick any image under Photos to use as the background.</p>
    </div>
  );
}

// ---------- the Canva-style editor ----------

export default function CanvaEditor({ templateId, isPro, trial, onBack, onProNeeded }: {
  templateId: string;
  isPro: boolean;
  trial: TrialState;
  onBack: () => void;
  onProNeeded: () => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const historyRef = useRef<CanvasHistory>({ entries: [], index: -1 });
  const debounceRef = useRef(0);
  const scaleRef = useRef(0.4);
  const eraserSizeRef = useRef(60);
  const eraserCleanupRef = useRef<(() => void) | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const [scale, setScale] = useState(0.4);
  const [autoFit, setAutoFit] = useState(true);
  const [designW, setDesignW] = useState(TW);
  const [designH, setDesignH] = useState(TH);
  const [title, setTitle] = useState(() => getFabricTemplate(templateId)?.meta.name ?? "Untitled design");
  const [rail, setRail] = useState<RailId>("text");
  const [tick, setTick] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [uploads, setUploads] = useState<string[]>([]);
  const [eraser, setEraser] = useState<{ session: EraserSession; size: number } | null>(null);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [meta, setMeta] = useState(() => getFabricTemplate(templateId)?.meta ?? null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const syncHist = useCallback(() => {
    const h = historyRef.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.entries.length - 1);
  }, []);
  const pushHist = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    historyRef.current = pushHistory(historyRef.current, c);
    syncHist();
  }, [syncHist]);
  const pushHistSoon = useCallback(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => pushHist(), 600);
  }, [pushHist]);

  const setScaleBoth = useCallback((s: number) => {
    scaleRef.current = s;
    setScale(s);
  }, []);

  // init canvas
  useEffect(() => {
    let dead = false;
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;
    (async () => {
      const canvas = createStudioCanvas(canvasEl);
      fabricRef.current = canvas;
      const t = getFabricTemplate(templateId);
      if (t) await loadTemplateJSON(canvas, t.json);
      if (dead) { canvas.dispose(); fabricRef.current = null; return; }
      historyRef.current = pushHistory({ entries: [], index: -1 }, canvas);
      syncHist();
      canvas.on("selection:created", () => { refresh(); });
      canvas.on("selection:updated", () => { refresh(); });
      canvas.on("selection:cleared", () => { refresh(); });
      canvas.on("object:modified", () => { pushHist(); refresh(); });
                        canvas.on("text:editing:exited", () => pushHist());
      refresh();
    })();
    return () => { dead = true; fabricRef.current?.dispose(); fabricRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fit to area
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!autoFit) return;
      const w = el.clientWidth - 72;
      const h = el.clientHeight - 72;
      const s = Math.max(0.12, Math.min(1.4, w / designW, h / designH));
      setScaleBoth(s);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoFit, designW, designH, setScaleBoth]);

  const undo = useCallback(async () => {
    const c = fabricRef.current;
    const h = historyRef.current;
    if (!c || h.index <= 0) return;
    const next = h.index - 1;
    await restoreHistory(c, h, next);
    historyRef.current = { ...h, index: next };
    syncHist(); refresh();
  }, [syncHist, refresh]);

  const redo = useCallback(async () => {
    const c = fabricRef.current;
    const h = historyRef.current;
    if (!c || h.index >= h.entries.length - 1) return;
    const next = h.index + 1;
    await restoreHistory(c, h, next);
    historyRef.current = { ...h, index: next };
    syncHist(); refresh();
  }, [syncHist, refresh]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = fabricRef.current;
      if (!c) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      // While a canvas text object is being edited, Space must never scroll
      // the page. Fabric edits through a hidden textarea: when it has focus
      // the space is inserted normally (leave the event alone); when focus
      // slipped to the page, swallow the keypress so the page doesn't jump.
      if (e.key === " ") {
        const editing = (c.getActiveObject() as { isEditing?: boolean } | null)?.isEditing;
        if (editing && tag !== "TEXTAREA" && tag !== "INPUT" && tag !== "SELECT") {
          e.preventDefault();
        }
      }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) void redo(); else void undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void duplicateActive();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const a = c.getActiveObject() as (FabricObject & { isEditing?: boolean; name?: string }) | null;
        if (a && !a.isEditing && a.name !== "bg") {
          c.remove(a); c.discardActiveObject(); c.requestRenderAll();
          pushHist(); refresh();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo]);

  const patchActive = (patch: Record<string, unknown>, hist: "now" | "soon" | "none" = "now") => {
    const c = fabricRef.current;
    const a = c?.getActiveObject();
    if (!c || !a) return;
    a.set(patch as Partial<FabricObject>);
    a.setCoords();
    c.requestRenderAll();
    refresh();
    if (hist === "now") pushHist();
    else if (hist === "soon") pushHistSoon();
  };

  const deleteActive = () => {
    const c = fabricRef.current;
    const a = c?.getActiveObject() as (FabricObject & { name?: string }) | null;
    if (!c || !a || a.name === "bg") return;
    c.remove(a); c.discardActiveObject(); c.requestRenderAll();
    pushHist(); refresh();
  };

  const duplicateActive = async () => {
    const c = fabricRef.current;
    const a = c?.getActiveObject();
    if (!c || !a) return;
    const clone = await a.clone();
    clone.set({ left: (clone.left ?? 0) + 24, top: (clone.top ?? 0) + 24 });
    c.add(clone); c.setActiveObject(clone); c.requestRenderAll();
    pushHist(); refresh();
  };

  const doAdd = (fn: () => void) => { fn(); pushHist(); refresh(); };

  const doExport = (fmt: StudioExportFormat) => {
    const c = fabricRef.current;
    if (!c) return;
    if (!trial.canUse) {
      toast.error("You've used your 5 free exports.", {
        description: "Go Pro for unlimited HD exports.",
      });
      return;
    }
    trial.recordUse();
    void exportDesign(c, fmt, 2);
    refresh();
  };

  const EXPORT_FORMATS: { id: StudioExportFormat; label: string; hint: string }[] = [
    { id: "png", label: "PNG", hint: "HD image" },
    { id: "jpeg", label: "JPG", hint: "Smaller file" },
    { id: "webp", label: "WebP", hint: "Tiny modern file" },
    { id: "pdf", label: "PDF", hint: "Print / share" },
  ];

  // ---------- image ops ----------

  const activeImage = () => {
    const c = fabricRef.current;
    const a = c?.getActiveObject() as FabricImage | null;
    return a && a.type === "image" ? a : null;
  };

  const runBgRemover = async () => {
    const c = fabricRef.current;
    const img = activeImage();
    if (!c || !img) return;
    setBgBusy(true);
    const toastId = "bg-remover";
    toast.loading("Starting background remover...", { id: toastId });
    try {
      const frac = await removeImageBackground(img, (stage, f) => {
        toast.loading(f > 0 ? `${stage} ${Math.round(f * 100)}%` : `${stage}...`, { id: toastId });
      });
      if (frac < 0) {
        toast.error("Background not removed", {
          id: toastId,
          description: "The image could not be processed. Try the Eraser brush instead.",
        });
      } else {
        toast.success(`Background removed (${Math.round(frac * 100)}% cleared)`, { id: toastId });
        c.requestRenderAll();
        pushHist(); refresh();
      }
    } finally {
      setBgBusy(false);
    }
  };

  const startEraserMode = () => {
    const c = fabricRef.current;
    const img = activeImage();
    if (!c || !img) {
      toast.error("Select an image first, then use the Eraser.");
      return;
    }
    const session = startEraser(img);
    if (!session) {
      toast.error("Couldn't start the eraser on this image.");
      return;
    }
    img.set({ lockMovementX: true, lockMovementY: true, lockRotation: true, lockScalingX: true, lockScalingY: true, hasControls: false });
    c.selection = false;
    c.defaultCursor = "crosshair";
    c.requestRenderAll();
    let drawing = false;
    const down = (opt: TPointerEventInfo) => {
      drawing = true;
      session.paint(opt.scenePoint.x, opt.scenePoint.y, eraserSizeRef.current);
      c.requestRenderAll();
    };
    const move = (opt: TPointerEventInfo) => {
      if (!drawing) return;
      session.paint(opt.scenePoint.x, opt.scenePoint.y, eraserSizeRef.current);
      c.requestRenderAll();
    };
    const up = () => {
      if (!drawing) return;
      drawing = false;
      session.end();
      pushHist(); refresh();
    };
    c.on("mouse:down", down);
    c.on("mouse:move", move);
    c.on("mouse:up", up);
    eraserCleanupRef.current = () => {
      c.off("mouse:down", down);
      c.off("mouse:move", move);
      c.off("mouse:up", up);
    };
    setEraser({ session, size: eraserSizeRef.current });
  };

  const endEraserMode = () => {
    eraserCleanupRef.current?.();
    eraserCleanupRef.current = null;
    const c = fabricRef.current;
    const img = eraser?.session.img;
    if (c && img) {
      img.set({ lockMovementX: false, lockMovementY: false, lockRotation: false, lockScalingX: false, lockScalingY: false, hasControls: true });
      c.selection = true;
      c.defaultCursor = "default";
      c.setActiveObject(img);
      c.requestRenderAll();
    }
    setEraser(null);
    refresh();
  };

  const onReplaceFile = async (f: File | undefined) => {
    if (!f) return;
    const c = fabricRef.current;
    const img = activeImage();
    if (!c || !img) return;
    try {
      const url = await fileToDataURL(f);
      await replaceImageSource(img, url);
      c.requestRenderAll();
      pushHist(); refresh();
      toast.success("Image replaced");
    } catch {
      toast.error("Couldn't read that file.");
    }
  };

  const onUploadFile = async (f: File | undefined) => {
    if (!f) return;
    const c = fabricRef.current;
    if (!c) return;
    try {
      const url = await fileToDataURL(f);
      setUploads((u) => [url, ...u].slice(0, 24));
      await addStudioImage(c, url);
      pushHist(); refresh();
    } catch {
      toast.error("Couldn't read that file.");
    }
  };

  const doResize = (w: number, h: number, label: string) => {
    const c = fabricRef.current;
    if (!c) return;
    resizeDesign(c, w, h);
    setDesignW(w);
    setDesignH(h);
    setAutoFit(true);
    setResizeOpen(false);
    pushHist(); refresh();
    toast.success(`Resized to ${label} (${w} x ${h})`);
  };

  const toggleLock = () => {
    const c = fabricRef.current;
    const a = c?.getActiveObject() as (FabricObject & { __locked?: boolean }) | null;
    if (!c || !a) return;
    const locked = !a.__locked;
    a.__locked = locked;
    a.set({
      lockMovementX: locked, lockMovementY: locked,
      lockRotation: locked, lockScalingX: locked, lockScalingY: locked,
      hasControls: !locked,
    });
    c.requestRenderAll();
    pushHist(); refresh();
  };

  const openTemplateInEditor = async (id: string) => {
    const c = fabricRef.current;
    const t = getFabricTemplate(id);
    if (!c || !t) return;
    await loadTemplateJSON(c, t.json);
    setMeta(t.meta);
    setTitle(t.meta.name);
    setDesignW(TW);
    setDesignH(TH);
    setAutoFit(true);
    pushHist(); refresh();
    toast.success(`Loaded "${t.meta.name}"`);
  };

  // ---------- derived ----------

  const canvas = fabricRef.current;
  const active = (canvas?.getActiveObject() ?? null) as (FabricObject & {
    text?: string; fontFamily?: string; fontSize?: number; fontWeight?: string | number;
    fontStyle?: string; textAlign?: string; fill?: string; name?: string;
    flipX?: boolean; flipY?: boolean; __locked?: boolean;
  }) | null;
  void tick;
  const isText = !!active && (active.type === "textbox" || active.type === "i-text" || active.type === "text");

  const isImage = !!active && active.type === "image";
  const isLocked = !!active?.__locked;

  // Warm up the AI background-removal model while the user looks at the
  // selected image, so the first BG Remover click feels instant. The download
  // is cached by the browser, and nothing runs until the user clicks it.
  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    const warm = () => {
      if (!cancelled) void loadBgAi();
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(warm);
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(id);
      };
    }
    const t = setTimeout(warm, 2500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isImage]);

  const layers = useMemo(() => {
    void tick;
    const c = fabricRef.current;
    if (!c) return [];
    return [...c.getObjects()].reverse();
  }, [tick]);

  const toHex = (fill: unknown): string => {
    if (typeof fill === "string" && /^#[0-9a-fA-F]{6}$/.test(fill)) return fill;
    if (typeof fill === "string" && /^#[0-9a-fA-F]{3}$/.test(fill)) {
      return "#" + fill.slice(1).split("").map((ch) => ch + ch).join("");
    }
    return "#ffffff";
  };

  const zoomPct = Math.round(scale * 100);
  const closeAllMenus = () => { setFileOpen(false); setResizeOpen(false); setDlOpen(false); setFilterOpen(false); };

  return (
    <div className="flex h-[78vh] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-background">
      {/* ===== top bar ===== */}
      <div className="flex h-12 shrink-0 items-center gap-1 bg-[#0e0e14] px-2 text-white">
        <button onClick={onBack} title="Back to templates" className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative">
          <button onClick={() => { closeAllMenus(); setFileOpen((o) => !o); }} className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
            File
          </button>
          {fileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFileOpen(false)} />
              <div className="absolute left-0 z-50 mt-1 w-56 overflow-hidden rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/10">
                <MenuItem onClick={() => { setFileOpen(false); titleRef.current?.focus(); titleRef.current?.select(); }}>
                  <Pencil className="h-4 w-4" /> Rename design
                </MenuItem>
                <MenuItem onClick={() => { setFileOpen(false); doExport("png"); }}>
                  <Download className="h-4 w-4" /> Download PNG
                </MenuItem>
                <MenuItem onClick={() => { setFileOpen(false); onBack(); }}>
                  <FilePlus2 className="h-4 w-4" /> New design
                </MenuItem>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button onClick={() => { closeAllMenus(); setResizeOpen((o) => !o); }} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
            Resize <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {resizeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setResizeOpen(false)} />
              <div className="absolute left-0 z-50 mt-1 w-60 overflow-hidden rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/10">
                {DESIGN_SIZES.map((s) => (
                  <MenuItem key={s.label} onClick={() => doResize(s.w, s.h, s.label)}>
                    <span className="flex-1">{s.label}</span>
                    <span className="text-[11px] text-slate-400">{s.w} x {s.h}</span>
                    {designW === s.w && designH === s.h && <Check className="h-4 w-4 text-violet-600" />}
                  </MenuItem>
                ))}
              </div>
            </>
          )}
        </div>
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mx-2 hidden min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-center text-[13px] font-semibold text-white/90 outline-none transition hover:bg-white/5 focus:bg-white/10 md:block"
          aria-label="Design title"
        />
        <div className="ml-auto flex items-center gap-0.5">
          <IconBtn dark title="Undo (Ctrl+Z)" onClick={() => void undo()} disabled={!canUndo}><Undo2 className="h-4 w-4" /></IconBtn>
          <IconBtn dark title="Redo (Ctrl+Shift+Z)" onClick={() => void redo()} disabled={!canRedo}><Redo2 className="h-4 w-4" /></IconBtn>
          <button
            onClick={() => setAutoFit(true)}
            title="Fit to screen"
            className="hidden rounded-lg px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white sm:block"
          >
            {zoomPct}%
          </button>
          <div className="relative ml-1">
            <button
              onClick={() => { closeAllMenus(); setDlOpen((o) => !o); }}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-violet-500"
            >
              <Download className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {dlOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDlOpen(false)} />
                <div className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/10">
                  {EXPORT_FORMATS.map((f) => (
                    <MenuItem key={f.id} onClick={() => { setDlOpen(false); doExport(f.id); }}>
                      <span className="flex-1 font-bold text-slate-800">{f.label}</span>
                      <span className="text-[11px] text-slate-400">{f.hint}</span>
                    </MenuItem>
                  ))}
                  <div className="border-t border-slate-100 px-3.5 py-2 text-[11px] text-slate-400">
                    {trial.left > 0 ? `${trial.left} of ${trial.limit} free HD exports left` : "Free exports used up - Go Pro for unlimited"}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== body ===== */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* icon rail */}
        <div className="flex shrink-0 flex-row gap-0.5 overflow-x-auto border-b border-border bg-surface p-1.5 md:w-[68px] md:flex-col md:items-stretch md:overflow-visible md:border-b-0 md:border-r md:py-2">
          {RAILS.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768 && r.id === rail) {
                  setMobilePanel((o) => !o);
                } else {
                  setRail(r.id);
                  setMobilePanel(true);
                }
              }}
              className={cn(
                "flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition",
                rail === r.id ? "bg-violet-100 text-violet-700" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>

        {/* context panel */}
        <div className={cn(
          "w-full shrink-0 flex-col border-b border-border",
          mobilePanel ? "flex max-h-[36vh]" : "hidden",
          "md:flex md:max-h-none md:w-72 md:border-b-0 md:border-r",
        )}>
          <div className="border-b border-border px-3 py-2.5">
            <h3 className="text-sm font-extrabold">{RAILS.find((r) => r.id === rail)?.label}</h3>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {rail === "templates" && (
              <TemplateGallery compact isPro={isPro} onOpen={(id) => void openTemplateInEditor(id)} onProNeeded={onProNeeded} />
            )}
            {rail === "elements" && (
              <ElementsPanel
                query={query} setQuery={setQuery}
                onAddShape={(k) => doAdd(() => fabricRef.current && addStudioShape(fabricRef.current, k))}
                onAddGfx={(src) => { const c = fabricRef.current; if (c) void addGfxElement(c, src).then(() => { pushHist(); refresh(); }); }}
              />
            )}
            {rail === "text" && (
              <TextPanel onAddText={(k) => doAdd(() => fabricRef.current && addStudioText(fabricRef.current, k))} />
            )}
            {rail === "uploads" && (
              <>
                <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onUploadFile(e.target.files?.[0]); e.target.value = ""; }} />
                <UploadsPanel
                  uploads={uploads}
                  onPick={() => uploadRef.current?.click()}
                  onAdd={(url) => doAdd(() => fabricRef.current && void addStudioImage(fabricRef.current, url))}
                />
              </>
            )}
            {rail === "photos" && (
              <PhotosPanel
                onAddPhoto={(src) => doAdd(() => fabricRef.current && void addStudioImage(fabricRef.current, src))}
                onSetBg={(src) => { const c = fabricRef.current; if (c) void setBackgroundImage(c, src).then(() => { pushHist(); refresh(); }); }}
              />
            )}
            {rail === "background" && (
              <BackgroundPanel
                onSolid={(c) => { const cv = fabricRef.current; if (cv) { setStudioBackground(cv, "solid", c); pushHist(); refresh(); } }}
                onGradient={(a, b) => { const cv = fabricRef.current; if (cv) { setStudioBackground(cv, "gradient", a, b); pushHist(); refresh(); } }}
              />
            )}
          </div>
        </div>

        {/* canvas area */}
        <div
          ref={areaRef}
          className="relative min-h-[320px] min-w-0 flex-1 overflow-auto"
          style={{
            backgroundColor: "#ececf1",
            backgroundImage: "radial-gradient(circle, #c7c7d2 1px, transparent 1.2px)",
            backgroundSize: "22px 22px",
          }}
        >
          {/* object toolbar - pinned to the top of the canvas area, like Sameer marked */}
          {active && !eraser && (
            <div className="sticky top-3 z-30 mx-auto -mb-10 w-fit max-w-[calc(100%-24px)] px-3">
              <div className="flex items-center gap-0.5 overflow-x-auto rounded-xl bg-white px-1.5 py-1 shadow-[0_6px_24px_rgba(0,0,0,0.22)] ring-1 ring-black/10">
                {isText && (
                  <>
                    <select
                      value={active.fontFamily ?? "Anton"}
                      onChange={(e) => patchActive({ fontFamily: e.target.value })}
                      className="h-8 max-w-[110px] shrink-0 rounded-lg bg-transparent px-1 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100"
                      title="Font"
                    >
                      {STUDIO_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <FloatBtn title="Smaller" onClick={() => patchActive({ fontSize: Math.max(12, (active.fontSize ?? 60) - 6) }, "soon")}><Minus className="h-3.5 w-3.5" /></FloatBtn>
                    <span className="w-8 shrink-0 text-center text-[11px] font-bold text-slate-600">{Math.round(active.fontSize ?? 0)}</span>
                    <FloatBtn title="Bigger" onClick={() => patchActive({ fontSize: Math.min(400, (active.fontSize ?? 60) + 6) }, "soon")}><Plus className="h-3.5 w-3.5" /></FloatBtn>
                    <FloatBtn title="Bold" active={active.fontWeight === "800" || active.fontWeight === "700" || active.fontWeight === 700} onClick={() => patchActive({ fontWeight: active.fontWeight === "800" || active.fontWeight === 700 ? "400" : "800" })}><Bold className="h-3.5 w-3.5" /></FloatBtn>
                    <FloatBtn title="Italic" active={active.fontStyle === "italic"} onClick={() => patchActive({ fontStyle: active.fontStyle === "italic" ? "normal" : "italic" })}><Italic className="h-3.5 w-3.5" /></FloatBtn>
                    <FloatBtn title="Align" onClick={() => {
                      const order = ["left", "center", "right"] as const;
                      const cur = (active.textAlign as "left" | "center" | "right" | undefined) ?? "center";
                      patchActive({ textAlign: order[(order.indexOf(cur) + 1) % order.length] });
                    }}>
                      {active.textAlign === "left" ? <AlignLeft className="h-3.5 w-3.5" /> : active.textAlign === "right" ? <AlignRight className="h-3.5 w-3.5" /> : <AlignCenter className="h-3.5 w-3.5" />}
                    </FloatBtn>
                    <label title="Text color" className="relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-slate-100">
                      <span className="h-4 w-4 rounded-full ring-1 ring-black/20" style={{ background: toHex(active.fill) }} />
                      <input type="color" value={toHex(active.fill)} onChange={(e) => patchActive({ fill: e.target.value }, "soon")} className="absolute inset-0 cursor-pointer opacity-0" />
                    </label>
                    <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />
                  </>
                )}
                {isImage && (
                  <>
                    <input ref={replaceRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onReplaceFile(e.target.files?.[0]); e.target.value = ""; }} />
                    <FloatBtn title="Replace image" onClick={() => replaceRef.current?.click()}><RefreshCw className="h-3.5 w-3.5" /><span className="hidden lg:inline">Replace</span></FloatBtn>
                    <FloatBtn title="Remove background" onClick={() => void runBgRemover()} disabled={bgBusy}>
                      <Wand2 className={cn("h-3.5 w-3.5", bgBusy && "animate-spin")} /><span className="hidden lg:inline">{bgBusy ? "Working" : "BG Remover"}</span>
                    </FloatBtn>
                    <FloatBtn title="Eraser brush" onClick={startEraserMode}><Eraser className="h-3.5 w-3.5" /><span className="hidden lg:inline">Eraser</span></FloatBtn>
                    <FloatBtn title="Flip horizontal" onClick={() => { const c = fabricRef.current; if (c) { flipActiveObject(c, "x"); pushHist(); refresh(); } }}><FlipHorizontal2 className="h-3.5 w-3.5" /></FloatBtn>
                    <FloatBtn title="Flip vertical" onClick={() => { const c = fabricRef.current; if (c) { flipActiveObject(c, "y"); pushHist(); refresh(); } }}><FlipVertical2 className="h-3.5 w-3.5" /></FloatBtn>
                    <div className="relative shrink-0">
                      <FloatBtn title="Filters" onClick={() => setFilterOpen((o) => !o)}>
                        <span className="hidden lg:inline">Filters</span><ChevronDown className="h-3.5 w-3.5" />
                      </FloatBtn>
                      {filterOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                          <div className="absolute bottom-10 left-0 z-50 w-44 overflow-hidden rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/10">
                            {IMAGE_FILTERS.map((f) => (
                              <MenuItem key={f.id} onClick={() => {
                                const img = activeImage();
                                const c = fabricRef.current;
                                if (img && c) { applyImageFilter(img, f.id); c.requestRenderAll(); pushHist(); refresh(); }
                                setFilterOpen(false);
                              }}>
                                <span className="flex-1">{f.label}</span>
                              </MenuItem>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />
                  </>
                )}
                <FloatBtn title="Duplicate (Ctrl+D)" onClick={() => void duplicateActive()}><Copy className="h-3.5 w-3.5" /></FloatBtn>
                <FloatBtn title="Bring forward" onClick={() => { const c = fabricRef.current; if (c && active) { c.bringObjectForward(active); c.requestRenderAll(); pushHist(); refresh(); } }}><ChevronUp className="h-3.5 w-3.5" /></FloatBtn>
                <FloatBtn title="Send backward" onClick={() => { const c = fabricRef.current; if (c && active) { c.sendObjectBackwards(active); c.requestRenderAll(); pushHist(); refresh(); } }}><ChevronDown className="h-3.5 w-3.5" /></FloatBtn>
                <FloatBtn title={isLocked ? "Unlock" : "Lock"} active={isLocked} onClick={toggleLock}>
                  {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </FloatBtn>
                <FloatBtn title="Delete (Del)" onClick={deleteActive}><Trash2 className="h-3.5 w-3.5" /></FloatBtn>
              </div>
            </div>
          )}

          <div className="flex min-h-full items-center justify-center p-9">
            <div className="relative" style={{ width: designW * scale, height: designH * scale }}>
              <div
                style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: designW, height: designH }}
                className="overflow-hidden rounded-[4px] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.22)] ring-1 ring-black/15"
              >
                <canvas ref={canvasElRef} />
              </div>

              {/* eraser bar */}
              {eraser && (
                <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
                  <div className="flex items-center gap-2 rounded-xl bg-[#0e0e14] px-3 py-2 text-white shadow-2xl">
                    <Eraser className="h-4 w-4" />
                    <span className="text-xs font-bold">Eraser</span>
                    <input
                      type="range" min={8} max={160} value={eraser.size}
                      onChange={(e) => { const s = Number(e.target.value); eraserSizeRef.current = s; setEraser({ ...eraser, size: s }); }}
                      className="w-28 accent-violet-500"
                      title="Brush size"
                    />
                    <span className="w-8 text-center text-[11px] text-white/70">{eraser.size}</span>
                    <button onClick={endEraserMode} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold hover:bg-violet-500">
                      <Check className="h-3.5 w-3.5" /> Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* right panel: layers */}
        {rightOpen ? (
          <div className="hidden w-60 shrink-0 flex-col border-l border-border bg-surface lg:flex">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <h3 className="text-sm font-extrabold">Layers</h3>
              <button onClick={() => setRightOpen(false)} title="Hide panel" className="rounded-lg p-1 text-muted-foreground hover:bg-surface-2">
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
              {isText && (
                <div className="mb-3">
                  <PanelLabel>Edit text</PanelLabel>
                  <textarea
                    value={active.text ?? ""}
                    onChange={(e) => patchActive({ text: e.target.value }, "soon")}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary"
                  />
                  <div className="mt-2">
                    <PanelLabel>Opacity - {Math.round(((active.opacity ?? 1) as number) * 100)}%</PanelLabel>
                    <input type="range" min={10} max={100} value={Math.round(((active.opacity ?? 1) as number) * 100)} onChange={(e) => patchActive({ opacity: Number(e.target.value) / 100 }, "soon")} className="w-full accent-violet-600" />
                  </div>
                </div>
              )}
              {isImage && (
                <div className="mb-3">
                  <PanelLabel>Opacity - {Math.round(((active.opacity ?? 1) as number) * 100)}%</PanelLabel>
                  <input type="range" min={10} max={100} value={Math.round(((active.opacity ?? 1) as number) * 100)} onChange={(e) => patchActive({ opacity: Number(e.target.value) / 100 }, "soon")} className="w-full accent-violet-600" />
                </div>
              )}
              {!active && (
                <p className="px-1 py-2 text-xs text-muted-foreground">Click any object on the canvas to edit it here.</p>
              )}
              <PanelLabel>All layers</PanelLabel>
              <div className="space-y-1">
                {layers.map((o, i) => {
                  const nm = (o as { name?: string }).name;
                  if (nm === "bg") return null;
                  const label = nm ? nm.replace(/-/g, " ") : o.type;
                  const isSel = o === active;
                  return (
                    <div key={i} className={cn("flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs", isSel ? "border-violet-500 bg-violet-50" : "border-border bg-background")}>
                      <button onClick={() => { fabricRef.current?.setActiveObject(o); fabricRef.current?.requestRenderAll(); refresh(); }} className="flex-1 truncate text-left font-semibold capitalize">
                        {label}
                      </button>
                      <button title={o.visible ? "Hide" : "Show"} onClick={() => { o.visible = !o.visible; fabricRef.current?.requestRenderAll(); pushHist(); refresh(); }} className="text-muted-foreground hover:text-foreground">
                        {o.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setRightOpen(true)}
            title="Show layers"
            className="hidden w-10 shrink-0 items-start justify-center border-l border-border bg-surface pt-3 text-muted-foreground hover:text-foreground lg:flex"
          >
            <Layers className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ===== bottom bar ===== */}
      <div className="flex h-10 shrink-0 items-center gap-3 border-t border-border bg-surface px-3">
        <button onClick={() => { setAutoFit(false); setScaleBoth(Math.max(0.12, scale - 0.1)); }} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2" title="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="range" min={12} max={150} value={zoomPct}
          onChange={(e) => { setAutoFit(false); setScaleBoth(Number(e.target.value) / 100); }}
          className="w-32 accent-violet-600 sm:w-44"
          aria-label="Zoom"
        />
        <button onClick={() => { setAutoFit(false); setScaleBoth(Math.min(1.5, scale + 0.1)); }} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2" title="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setAutoFit(true)} className="text-xs font-bold text-muted-foreground hover:text-foreground" title="Fit to screen">
          {zoomPct}%
        </button>
        <div className="ml-auto flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
          <span>{designW} x {designH}px</span>
          <span className="hidden sm:inline">Page 1 / 1</span>
        </div>
      </div>
    </div>
  );
}
