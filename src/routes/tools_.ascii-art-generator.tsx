// /tools/ascii-art-generator - Text to ASCII art with 4 built-in FIGlet-style fonts (pure client-side).

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/ascii-art-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/ascii-art-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ascii-art-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/ascii-art-generator";
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
  component: AsciiArtTool,
});

type FontDef = { label: string; note: string; glyphs: Record<string, string[]> };

const STANDARD: Record<string, string[]> = {
  A: ["  #  ", " # # ", "#####", "#   #", "#   #"],
  B: ["#### ", "#   #", "#### ", "#   #", "#### "],
  C: [" ####", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#### ", "#    ", "#####"],
  F: ["#####", "#    ", "#### ", "#    ", "#    "],
  G: [" ####", "#    ", "# ###", "#   #", " ####"],
  H: ["#   #", "#   #", "#####", "#   #", "#   #"],
  I: ["#####", "  #  ", "  #  ", "  #  ", "#####"],
  J: ["#####", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "###  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#### ", "#    ", "#    "],
  Q: [" ### ", "#   #", "#   #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#### ", "#  # ", "#   #"],
  S: [" ####", "#    ", " ### ", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "# # #", "## ##", "#   #"],
  X: ["#   #", " # # ", "  #  ", " # # ", "#   #"],
  Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "   # ", "  #  ", " #   ", "#####"],
  "0": [" ### ", "#  ##", "# # #", "##  #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "  ## ", " #   ", "#####"],
  "3": ["#### ", "    #", " ### ", "    #", "#### "],
  "4": ["#  # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "#### "],
  "6": [" ### ", "#    ", "#### ", "#   #", " ### "],
  "7": ["#####", "   # ", "  #  ", " #   ", " #   "],
  "8": [" ### ", "#   #", " ### ", "#   #", " ### "],
  "9": [" ### ", "#   #", " ####", "    #", " ### "],
  " ": ["     ", "     ", "     ", "     ", "     "],
  ".": ["   ", "   ", "   ", "   ", " # "],
  ",": ["   ", "   ", "   ", " # ", "#  "],
  "!": [" # ", " # ", " # ", "   ", " # "],
  "?": ["### ", "  # ", " ## ", "   ", " # "],
  ":": ["   ", " # ", "   ", " # ", "   "],
  ";": ["   ", " # ", "   ", " # ", "#  "],
  "'": [" # ", " # ", "   ", "   ", "   "],
  "-": ["     ", "     ", "#####", "     ", "     "],
  _: ["     ", "     ", "     ", "     ", "#####"],
  "+": ["     ", "  #  ", "#####", "  #  ", "     "],
  "=": ["     ", "#####", "     ", "#####", "     "],
  "/": ["    #", "   # ", "  #  ", " #   ", "#    "],
  "\\": ["#    ", " #   ", "  #  ", "   # ", "    #"],
  "(": ["  # ", " #  ", " #  ", " #  ", "  # "],
  ")": [" #  ", "  # ", "  # ", "  # ", " #  "],
  '"': ["# # ", "# # ", "    ", "    ", "    "],
  "&": [" ##  ", "#  # ", " ##  ", "#  # ", " ## #"],
  "@": [" ### ", "#   #", "# ###", "#    ", " ### "],
  "#": [" # # ", "#####", " # # ", "#####", " # # "],
  "%": ["##  #", "##  #", "  #  ", "#  ##", "#  ##"],
  "*": ["     ", "# # #", " ### ", "# # #", "     "],
  $: ["  #  ", " ####", "# #  ", " ####", "  #  "],
};

const SMALL: Record<string, string[]> = {
  A: [" # ", "###", "# #"],
  B: ["## ", "###", "## "],
  C: [" ##", "#  ", " ##"],
  D: ["## ", "# #", "## "],
  E: ["###", "## ", "###"],
  F: ["###", "## ", "#  "],
  G: [" ##", "# #", " ##"],
  H: ["# #", "###", "# #"],
  I: ["###", " # ", "###"],
  J: ["  #", "  #", "## "],
  K: ["# #", "## ", "# #"],
  L: ["#  ", "#  ", "###"],
  M: ["###", "# #", "# #"],
  N: ["# #", "###", "###"],
  O: [" # ", "# #", " # "],
  P: ["## ", "###", "#  "],
  Q: [" # ", "# #", " ##"],
  R: ["## ", "###", "# #"],
  S: [" ##", " # ", "## "],
  T: ["###", " # ", " # "],
  U: ["# #", "# #", "###"],
  V: ["# #", "# #", " # "],
  W: ["# #", "###", "###"],
  X: ["# #", " # ", "# #"],
  Y: ["# #", " # ", " # "],
  Z: ["## ", " # ", "## "],
  "0": ["###", "# #", "###"],
  "1": [" # ", " # ", " # "],
  "2": ["## ", " # ", "###"],
  "3": ["## ", " # ", "## "],
  "4": ["# #", "###", "  #"],
  "5": ["###", "## ", "## "],
  "6": [" ##", "## ", "## "],
  "7": ["###", " # ", " # "],
  "8": [" # ", "###", " # "],
  "9": ["## ", "###", " ##"],
  " ": ["   ", "   ", "   "],
  ".": ["  ", "  ", "# "],
  ",": ["  ", "# ", "# "],
  "!": ["# ", "# ", "# "],
  "?": ["##", " #", "# "],
  "-": ["   ", "###", "   "],
  ":": ["  ", "# ", "  "],
  "'": ["# ", "  ", "  "],
  "+": ["   ", "# #", "   "],
  "/": ["  #", " # ", "#  "],
};

const BANNER: Record<string, string[]> = {
  A: ["   ###   ", "  ## ##  ", " ##   ## ", "##     ##", "#########", "##     ##", "##     ##"],
  B: ["######## ", "##     ##", "##     ##", "######## ", "##     ##", "##     ##", "######## "],
  C: ["  ###### ", " ##    ##", "##       ", "##       ", "##       ", " ##    ##", "  ###### "],
  D: ["######## ", "##     ##", "##     ##", "##     ##", "##     ##", "##     ##", "######## "],
  E: ["#########", "##       ", "##       ", "#######  ", "##       ", "##       ", "#########"],
  F: ["#########", "##       ", "##       ", "#######  ", "##       ", "##       ", "##       "],
  G: ["  ###### ", " ##    ##", "##       ", "##  #####", "##     ##", " ##    ##", "  ##### #"],
  H: ["##     ##", "##     ##", "##     ##", "#########", "##     ##", "##     ##", "##     ##"],
  I: ["#########", "   ##    ", "   ##    ", "   ##    ", "   ##    ", "   ##    ", "#########"],
  J: ["  #######", "     ##  ", "     ##  ", "     ##  ", "     ##  ", "##   ##  ", " #####   "],
  K: ["##     ##", "##    ## ", "##  ##   ", "####     ", "##  ##   ", "##    ## ", "##     ##"],
  L: ["##       ", "##       ", "##       ", "##       ", "##       ", "##       ", "#########"],
  M: ["##     ##", "###   ###", "#### ####", "## ### ##", "##     ##", "##     ##", "##     ##"],
  N: ["##     ##", "###    ##", "####   ##", "## ##  ##", "##  ## ##", "##   ####", "##    ###"],
  O: [" ####### ", "##     ##", "##     ##", "##     ##", "##     ##", "##     ##", " ####### "],
  P: ["######## ", "##     ##", "##     ##", "######## ", "##       ", "##       ", "##       "],
  Q: [" ####### ", "##     ##", "##     ##", "##     ##", "##  ## ##", "##   ####", " ###### #"],
  R: ["######## ", "##     ##", "##     ##", "######## ", "##  ##   ", "##   ##  ", "##     ##"],
  S: [" ####### ", "##     ##", "##       ", " ####### ", "       ##", "##     ##", " ####### "],
  T: ["#########", "   ##    ", "   ##    ", "   ##    ", "   ##    ", "   ##    ", "   ##    "],
  U: ["##     ##", "##     ##", "##     ##", "##     ##", "##     ##", "##     ##", " ####### "],
  V: ["##     ##", "##     ##", "##     ##", "##     ##", " ##   ## ", "  ## ##  ", "   ###   "],
  W: ["##     ##", "##     ##", "##     ##", "##  #  ##", "## ### ##", "#### ####", "###   ###"],
  X: ["##     ##", " ##   ## ", "  ## ##  ", "   ###   ", "  ## ##  ", " ##   ## ", "##     ##"],
  Y: ["##     ##", " ##   ## ", "  ## ##  ", "   ###   ", "   ##    ", "   ##    ", "   ##    "],
  Z: ["#########", "     ##  ", "    ##   ", "   ##    ", "  ##     ", " ##      ", "#########"],
  "0": [" ####### ", "##  ## ##", "## ##  ##", "##  ## ##", "##     ##", "##     ##", " ####### "],
  "1": ["   ##    ", "  ###    ", "   ##    ", "   ##    ", "   ##    ", "   ##    ", " ########"],
  "2": [" ####### ", "##     ##", "      ## ", "    ##   ", "  ##     ", " ##      ", "#########"],
  "3": ["######## ", "      ## ", "      ## ", " ####### ", "      ## ", "      ## ", "######## "],
  "4": ["##     ##", "##     ##", "##     ##", "#########", "      ## ", "      ## ", "      ## "],
  "5": ["#########", "##       ", "######## ", "       ##", "       ##", "##     ##", " ####### "],
  "6": [" ####### ", "##       ", "##       ", "######## ", "##     ##", "##     ##", " ####### "],
  "7": ["#########", "      ## ", "     ##  ", "    ##   ", "   ##    ", "   ##    ", "   ##    "],
  "8": [" ####### ", "##     ##", "##     ##", " ####### ", "##     ##", "##     ##", " ####### "],
  "9": [" ####### ", "##     ##", "##     ##", " ########", "       ##", "       ##", " ####### "],
  " ": ["         ", "         ", "         ", "         ", "         ", "         ", "         "],
};

const BLOCK: Record<string, string[]> = {
  A: [" #### ", "##  ##", "######", "##  ##", "##  ##"],
  B: ["##### ", "##  ##", "##### ", "##  ##", "##### "],
  C: [" #### ", "##    ", "##    ", "##    ", " #### "],
  D: ["##### ", "##  ##", "##  ##", "##  ##", "##### "],
  E: ["######", "##    ", "##### ", "##    ", "######"],
  F: ["######", "##    ", "##### ", "##    ", "##    "],
  G: [" #### ", "##    ", "## ###", "##  ##", " #### "],
  H: ["##  ##", "##  ##", "######", "##  ##", "##  ##"],
  I: ["######", "  ##  ", "  ##  ", "  ##  ", "######"],
  J: ["######", "   ## ", "   ## ", "## ## ", " #### "],
  K: ["##  ##", "## ## ", "####  ", "## ## ", "##  ##"],
  L: ["##    ", "##    ", "##    ", "##    ", "######"],
  M: ["##  ##", "######", "######", "##  ##", "##  ##"],
  N: ["##  ##", "####  ", "####  ", "  ####", "##  ##"],
  O: [" #### ", "##  ##", "##  ##", "##  ##", " #### "],
  P: ["##### ", "##  ##", "##### ", "##    ", "##    "],
  Q: [" #### ", "##  ##", "##  ##", "## ###", " #####"],
  R: ["##### ", "##  ##", "##### ", "## ## ", "##  ##"],
  S: [" #### ", "##    ", " #### ", "    ##", " #### "],
  T: ["######", "  ##  ", "  ##  ", "  ##  ", "  ##  "],
  U: ["##  ##", "##  ##", "##  ##", "##  ##", " #### "],
  V: ["##  ##", "##  ##", " ##  ## ", "  ##  ", "  ##  "],
  W: ["##  ##", "##  ##", "######", "######", "##  ##"],
  X: ["##  ##", " ## ## ", "  ##  ", " ## ## ", "##  ##"],
  Y: ["##  ##", " ## ## ", "  ##  ", "  ##  ", "  ##  "],
  Z: ["######", "   ## ", "  ##  ", " ##   ", "######"],
  "0": [" #### ", "##  ##", "##  ##", "##  ##", " #### "],
  "1": ["  ##  ", " #### ", "  ##  ", "  ##  ", "######"],
  "2": [" #### ", "##  ##", "  ##  ", " ##   ", "######"],
  "3": ["##### ", "    ##", " #### ", "    ##", "##### "],
  "4": ["## ## ", "## ## ", "######", "   ## ", "   ## "],
  "5": ["######", "##    ", "##### ", "    ##", "##### "],
  "6": [" #### ", "##    ", "##### ", "##  ##", " #### "],
  "7": ["######", "   ## ", "  ##  ", " ##   ", " ##   "],
  "8": [" #### ", "##  ##", " #### ", "##  ##", " #### "],
  "9": [" #### ", "##  ##", " #### ", "    ##", " #### "],
  " ": ["      ", "      ", "      ", "      ", "      "],
  ".": ["    ", "    ", "    ", "    ", " ## "],
  "!": [" ## ", " ## ", " ## ", "    ", " ## "],
  "?": ["#### ", "   ##", "  ## ", "    ", " ## "],
  "-": ["      ", "      ", "######", "      ", "      "],
  ":": ["    ", " ## ", "    ", " ## ", "    "],
  "/": ["    ##", "   ## ", "  ##  ", " ##   ", "##    "],
};

const FONTS: Record<string, FontDef> = {
  standard: { label: "Standard", note: "Classic 5-line FIGlet style, best all-rounder.", glyphs: STANDARD },
  small: { label: "Small", note: "Compact 3-line style for short words.", glyphs: SMALL },
  banner: { label: "Banner", note: "Big 7-line display letters for headlines.", glyphs: BANNER },
  block: { label: "Block", note: "Heavy 5-line chunky letters.", glyphs: BLOCK },
};

function glyphWidth(g: string[]): number {
  return g.reduce((m, r) => Math.max(m, r.length), 0);
}

function renderArt(text: string, font: FontDef): { art: string; width: number } {
  const height = Math.max(...Object.values(font.glyphs).map((g) => g.length));
  const lines = text.split("\n").slice(0, 5);
  const out: string[] = [];
  let width = 0;
  for (const line of lines) {
    const glyphs = [...line].slice(0, 40).map((ch) => {
      const up = ch.toUpperCase();
      if (up.length !== 1) return null;
      return font.glyphs[up] ?? null;
    });
    const rows: string[] = [];
    for (let r = 0; r < height; r++) {
      const parts = glyphs.map((g) => {
        if (!g) return " ".repeat(3);
        const w = glyphWidth(g);
        return (g[r] ?? "").padEnd(w, " ");
      });
      const row = parts.join(" ").replace(/\s+$/, "");
      rows.push(row);
      width = Math.max(width, row.length);
    }
    out.push(...rows);
  }
  return { art: out.join("\n"), width };
}

const DEFAULT_FONT: FontDef = { label: "Standard", note: "", glyphs: {} };

function AsciiArtTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ascii-art-generator", isPro);
  const seo = toolSeo;

  const [text, setText] = useState("Hello");
  const [fontKey, setFontKey] = useState("standard");
  const font = FONTS[fontKey] ?? DEFAULT_FONT;

  const { art, width } = useMemo(() => renderArt(text, font), [text, font]);
  const lineCount = art ? art.split("\n").length : 0;

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(art);
      trial.recordUse();
      toast.success("ASCII art copied");
    } catch {
      toast.error("Copy failed");
    }
  };
  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([art], { type: "text/plain" }), "ascii-art.txt");
    trial.recordUse();
    toast.success("ascii-art.txt downloaded");
  };

  return (
    <ToolPageShell toolId="ascii-art-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ASCII Art" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Your text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Type something..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Up to 40 characters per line, 5 lines. Lowercase is rendered as uppercase.</p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Font</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(FONTS).map(([key, f]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFontKey(key)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition",
                    fontKey === key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("block text-sm font-bold", fontKey === key && "text-primary")}>{f.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{f.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse || !art}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:border-primary/50 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            <ActionButton disabled={!trial.canUse || !art} onClick={download}>
              <Download className="h-4 w-4" /> .txt
            </ActionButton>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - fonts are built in, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Preview - {font.label}</h2>
            <span className="text-xs text-muted-foreground">Output size: {width} chars x {lineCount} lines</span>
          </div>
          <div className="overflow-auto rounded-xl bg-muted/40 p-4">
            <pre className="font-mono text-[13px] leading-[1.35]">{art || "Type something to see the art."}</pre>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: paste into a README, code comment or terminal. Use a monospace font or the art will not line up.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
