// /tools/drag-drop-playground - Real HTML5 drag and drop lab: sortable list,
// file drop with previews, effectAllowed control and a DataTransfer event inspector.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown, FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/drag-drop-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/drag-drop-playground";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/drag-drop-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/drag-drop-playground";
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.metaDescription },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: seo.title },
        { name: "twitter:description", content: seo.metaDescription },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: DnDTool,
});

type Ev = { t: string; name: string; detail: string };
type DroppedFile = { name: string; size: number; type: string; url: string | null };

const STARTERS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
const EFFECTS = ["none", "copy", "move", "link", "copyMove", "copyLink", "linkMove", "all"] as const;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function DnDTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("drag-drop-playground", isPro);
  const seo = toolSeo;

  const [items, setItems] = useState<string[]>(STARTERS);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [effect, setEffect] = useState<(typeof EFFECTS)[number]>("move");
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [zoneOver, setZoneOver] = useState(false);
  const [events, setEvents] = useState<Ev[]>([]);
  const dragIdxRef = useRef<number | null>(null);

  const log = useCallback((name: string, e: React.DragEvent) => {
    const dt = e.dataTransfer;
    const detail = `types=[${[...dt.types].join(", ") || "-"}] effectAllowed=${dt.effectAllowed} dropEffect=${dt.dropEffect} files=${dt.files.length}`;
    setEvents((p) => [...p.slice(-60), { t: new Date().toLocaleTimeString(), name, detail }]);
  }, []);

  // ---- sortable list ----
  const onItemDragStart = (e: React.DragEvent, i: number) => {
    dragIdxRef.current = i;
    setDragIdx(i);
    e.dataTransfer.effectAllowed = effect;
    e.dataTransfer.setData("text/plain", items[i] ?? "");
    e.dataTransfer.setData("application/x-dnd-index", String(i));
    log("dragstart", e);
  };

  const onItemDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setOverIdx(i);
    log("dragover", e);
  };

  const onItemDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    log("drop", e);
    const from = dragIdxRef.current;
    if (from === null || from === i) {
      setOverIdx(null);
      setDragIdx(null);
      dragIdxRef.current = null;
      return;
    }
    setItems((p) => {
      const next = [...p];
      const [moved] = next.splice(from, 1);
      if (moved === undefined) return p;
      next.splice(i, 0, moved);
      return next;
    });
    setOverIdx(null);
    setDragIdx(null);
    dragIdxRef.current = null;
    toast.success("List reordered");
  };

  const onItemDragEnd = (e: React.DragEvent) => {
    log("dragend", e);
    setDragIdx(null);
    setOverIdx(null);
    dragIdxRef.current = null;
  };

  // ---- file drop zone ----
  const acceptFiles = useCallback(
    (list: FileList | File[]) => {
      if (!trial.canUse) return;
      const arr = [...list];
      const mapped: DroppedFile[] = arr.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type || "unknown",
        url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      }));
      setFiles((p) => [...mapped, ...p].slice(0, 24));
      trial.recordUse();
      toast.success(`${arr.length} file${arr.length === 1 ? "" : "s"} dropped`);
    },
    [trial],
  );

  const onZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setZoneOver(false);
    log("drop", e);
    if (e.dataTransfer.files.length > 0) acceptFiles(e.dataTransfer.files);
  };

  return (
    <ToolPageShell toolId="drag-drop-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Drag & Drop" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Sortable list</h3>
            </div>
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li
                  key={item}
                  draggable
                  onDragStart={(e) => onItemDragStart(e, i)}
                  onDragOver={(e) => onItemDragOver(e, i)}
                  onDrop={(e) => onItemDrop(e, i)}
                  onDragEnd={onItemDragEnd}
                  className={cn(
                    "cursor-grab rounded-xl border px-4 py-3 text-sm font-bold transition active:cursor-grabbing",
                    dragIdx === i
                      ? "border-primary bg-primary/10 opacity-60"
                      : overIdx === i
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-medium text-foreground/80">effectAllowed</p>
              <select
                value={effect}
                onChange={(e) => setEffect(e.target.value as (typeof EFFECTS)[number])}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
              >
                {EFFECTS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Try "none": the drop is refused and the browser shows the forbidden cursor.
              </p>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setZoneOver(true); log("dragover", e); }}
            onDragLeave={() => setZoneOver(false)}
            onDrop={onZoneDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition",
              zoneOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">Drop files here</p>
            <p className="mt-1 text-xs text-muted-foreground">Files stay on your device, names and previews only</p>
            {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of 5 free drops left.</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Dropped files ({files.length})</h3>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">Drop files on the zone to inspect their DataTransfer payload.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                    {f.url ? (
                      <img src={f.url} alt={f.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold text-muted-foreground">
                        {f.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{f.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{f.type} - {fmtBytes(f.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">DataTransfer event inspector</h3>
              <button
                type="button"
                onClick={() => setEvents([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            <div className="h-64 space-y-1.5 overflow-y-auto rounded-xl bg-background p-3 font-mono text-xs">
              {events.length === 0 && <p className="text-muted-foreground">Drag the list items or files above: every drag event lands here with its live DataTransfer state.</p>}
              {events.map((e, i) => (
                <p key={i}>
                  <span className="font-bold text-primary">{e.name}</span>{" "}
                  <span className="text-muted-foreground">[{e.t}]</span>{" "}
                  <span className="text-foreground/80">{e.detail}</span>
                </p>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Notice that <span className="font-mono">types</span> only lists <span className="font-mono">Files</span> during file drags, and that <span className="font-mono">dropEffect</span> follows the cursor position while <span className="font-mono">effectAllowed</span> is set by the drag source.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
