// /tools/selection-range-playground - Select text in the sample article,
// then inspect the live Selection and Range objects: anchor/focus nodes,
// container paths with offsets, rects drawn as overlays, and the DOM tree
// they sit in. Copyable Range API code; trial use is recorded on copy.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Crosshair, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/selection-range-playground")({
  head: () => {
    const seo = getToolSeoMeta("selection-range-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SelectionRangeTool,
});

interface RectBox { x: number; y: number; w: number; h: number }
interface RangeInfo {
  index: number;
  startPath: string;
  startOffset: number;
  endPath: string;
  endOffset: number;
  collapsed: boolean;
  text: string;
  ancestor: string;
  rectCount: number;
}

/** Build a readable path like: div.sample > p(1) > b > #text(0) */
function nodePath(node: Node | null, root: Node | null): string {
  if (!node) return "?";
  const parts: string[] = [];
  let cur: Node | null = node;
  while (cur && cur !== root && cur.parentNode) {
    const parent = cur.parentNode as ParentNode;
    const siblings = Array.from(parent.childNodes).filter((n) => n.nodeName === cur!.nodeName);
    const idx = siblings.indexOf(cur as ChildNode);
    let label: string;
    if (cur.nodeType === Node.TEXT_NODE) label = `#text${siblings.length > 1 ? `(${idx})` : ""}`;
    else {
      const el = cur as Element;
      label = el.tagName.toLowerCase();
      if (el.id) label += `#${el.id}`;
      else if (siblings.length > 1) label += `(${idx})`;
    }
    parts.unshift(label);
    cur = parent;
  }
  return parts.join(" > ") || "(root)";
}

function SelectionRangeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("selection-range-playground", isPro);
  const seo = getToolSeo("selection-range-playground");

  const articleRef = useRef<HTMLDivElement>(null);
  const [ranges, setRanges] = useState<RangeInfo[]>([]);
  const [rects, setRects] = useState<RectBox[]>([]);
  const [selSummary, setSelSummary] = useState("");
  const [copied, setCopied] = useState(false);

  const inspect = useCallback(() => {
    const sel = window.getSelection();
    const root = articleRef.current;
    if (!sel || !root) return;
    if (sel.rangeCount === 0) {
      toast.info("No selection. Drag across the sample text first.");
      return;
    }
    const infos: RangeInfo[] = [];
    const boxes: RectBox[] = [];
    const rootRect = root.getBoundingClientRect();
    for (let i = 0; i < sel.rangeCount; i++) {
      const r = sel.getRangeAt(i);
      infos.push({
        index: i,
        startPath: nodePath(r.startContainer, root),
        startOffset: r.startOffset,
        endPath: nodePath(r.endContainer, root),
        endOffset: r.endOffset,
        collapsed: r.collapsed,
        text: r.toString().slice(0, 90),
        ancestor: nodePath(r.commonAncestorContainer, root),
        rectCount: r.getClientRects().length,
      });
      for (const rc of Array.from(r.getClientRects())) {
        boxes.push({ x: rc.left - rootRect.left, y: rc.top - rootRect.top, w: rc.width, h: rc.height });
      }
    }
    setRanges(infos);
    setRects(boxes);
    setSelSummary(
      `anchor: ${nodePath(sel.anchorNode, root)} @${sel.anchorOffset} | focus: ${nodePath(sel.focusNode, root)} @${sel.focusOffset} | direction: ${sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset ? "caret" : sel.toString().length > 0 ? "forward/backward (compare anchor vs focus)" : "none"}`,
    );
  }, []);

  const selectAllInArticle = () => {
    const root = articleRef.current;
    if (!root) return;
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(root);
    sel?.removeAllRanges();
    sel?.addRange(r);
    inspect();
  };

  const collapseToStart = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      toast.info("Make a selection first.");
      return;
    }
    sel.collapseToStart();
    inspect();
  };

  const expandToWord = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      toast.info("Place the caret inside a word first.");
      return;
    }
    sel.modify("extend", "backward", "word");
    sel.modify("extend", "forward", "word");
    inspect();
  };

  const clearOverlays = () => {
    setRects([]);
    setRanges([]);
    setSelSummary("");
    window.getSelection()?.removeAllRanges();
  };

  const code = `// Inspect the live selection
const sel = window.getSelection();
for (let i = 0; i < sel.rangeCount; i++) {
  const r = sel.getRangeAt(i);
  console.log("start:", r.startContainer, r.startOffset);
  console.log("end:", r.endContainer, r.endOffset);
  console.log("collapsed:", r.collapsed, "text:", r.toString());
  console.log("rects:", r.getClientRects().length);
}

// Programmatic selection: select word under the caret
sel.collapseToStart();
sel.modify("extend", "backward", "word");
sel.modify("extend", "forward", "word");

// Select all inside an element
const range = document.createRange();
range.selectNodeContents(document.querySelector("#article"));
sel.removeAllRanges();
sel.addRange(range);`;

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      trial.recordUse();
      toast.success("Range code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="selection-range-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Selection and Range Playground" left={trial.left} />

      <div className="mb-5 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="font-bold">How to play</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag across the sample article to make a selection (try spanning bold and italic text),
          then press <strong className="text-foreground">Inspect selection</strong>. The tool maps
          every range to its DOM containers, offsets and screen rects.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Sample article <span className="font-mono font-normal text-muted-foreground">#article</span></h2>
            <div className="relative">
              <div ref={articleRef} id="article" className="select-text rounded-xl bg-muted/30 p-5 text-[15px] leading-relaxed">
                <p>
                  The <b>quick brown fox</b> jumps over the <i>lazy dog</i>. Ranges can start inside
                  one text node and end inside another.
                </p>
                <p className="mt-3">
                  Nested <b>bold with <i>italic inside</i> it</b> shows how the common ancestor
                  climbs to the nearest shared element.
                </p>
                <ul className="mt-3 list-disc pl-6">
                  <li>First list item</li>
                  <li>Second item with <b>bold</b></li>
                </ul>
              </div>
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                {rects.map((b, i) => (
                  <div
                    key={i}
                    className="absolute rounded-sm border-2 border-teal-500 bg-teal-500/15"
                    style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={inspect}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90"
              >
                <Crosshair className="h-4 w-4" /> Inspect selection
              </button>
              <button type="button" onClick={selectAllInArticle} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:border-primary/60">
                Select all in #article
              </button>
              <button type="button" onClick={collapseToStart} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:border-primary/60">
                Collapse to start
              </button>
              <button type="button" onClick={expandToWord} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:border-primary/60">
                Expand caret to word
              </button>
              <button
                type="button"
                onClick={clearOverlays}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:border-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>

          {selSummary && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-bold">Selection summary</h2>
              <p className="rounded-xl bg-muted/40 p-3 font-mono text-xs leading-relaxed">{selSummary}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Range debugger</h2>
            {ranges.length === 0 ? (
              <p className="rounded-xl bg-muted/40 p-6 text-center text-xs text-muted-foreground">
                Inspect a selection to see each range's containers, offsets and rects.
              </p>
            ) : (
              <div className="max-h-[380px] space-y-3 overflow-y-auto">
                {ranges.map((r) => (
                  <div key={r.index} className="rounded-xl border border-border bg-muted/30 p-4 text-xs">
                    <p className="mb-2 font-mono font-bold text-primary">range[{r.index}] {r.collapsed ? "(collapsed caret)" : ""}</p>
                    <div className="space-y-1.5 font-mono leading-relaxed">
                      <p><span className="text-muted-foreground">start:</span> {r.startPath} <span className="font-bold">@ {r.startOffset}</span></p>
                      <p><span className="text-muted-foreground">end:</span> {r.endPath} <span className="font-bold">@ {r.endOffset}</span></p>
                      <p><span className="text-muted-foreground">commonAncestor:</span> {r.ancestor}</p>
                      <p><span className="text-muted-foreground">rects:</span> {r.rectCount} <span className="text-muted-foreground">(overlay drawn above)</span></p>
                      {r.text && <p><span className="text-muted-foreground">text:</span> "{r.text}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Offsets mean different things per node type: a character index inside a text node,
              or a child index inside an element. The path shows exactly which.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Range API cheat sheet</h2>
              <button
                type="button"
                onClick={copy}
                disabled={!trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{code}</pre>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
