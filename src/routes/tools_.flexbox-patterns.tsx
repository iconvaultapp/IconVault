// /tools/flexbox-patterns - 16 production flexbox layout patterns with live
// previews, an adjustable gap slider, and copyable HTML + CSS for each one.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/flexbox-patterns";
import toolSeoMeta from "@/lib/tool-seo-meta-data/flexbox-patterns";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/flexbox-patterns")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/flexbox-patterns";
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
  component: FlexboxPatternsTool,
});

interface Pattern {
  id: string;
  name: string;
  blurb: string;
  gapApplies: boolean;
  html: string;
  css: string;
}

const box = "rounded-lg bg-primary/15 border border-primary/30";
const boxAlt = "rounded-lg bg-muted border border-border";

const PATTERNS: Pattern[] = [
  {
    id: "holy-grail",
    name: "Holy Grail",
    blurb: "Classic header, three columns, footer. The flexbox rite of passage.",
    gapApplies: false,
    html: `<header class="hg-header">Header</header>
<div class="hg-main">
  <nav class="hg-nav">Nav</nav>
  <main class="hg-content">Content</main>
  <aside class="hg-aside">Aside</aside>
</div>
<footer class="hg-footer">Footer</footer>`,
    css: `.holy-grail { display: flex; flex-direction: column; min-height: 100%; }
.hg-main { display: flex; flex: 1; }
.hg-nav, .hg-aside { flex: 0 0 120px; }
.hg-content { flex: 1; }`,
  },
  {
    id: "sticky-footer",
    name: "Sticky Footer",
    blurb: "Footer sits at the bottom even when the page content is short.",
    gapApplies: false,
    html: `<div class="page">
  <header>Header</header>
  <main>Content</main>
  <footer>Footer</footer>
</div>`,
    css: `.page { display: flex; flex-direction: column; min-height: 100%; }
.page main { flex: 1; }`,
  },
  {
    id: "perfect-center",
    name: "Perfect Centering",
    blurb: "Center anything both ways with three declarations.",
    gapApplies: false,
    html: `<div class="center-box"><div class="card">Centered</div></div>`,
    css: `.center-box { display: flex; align-items: center; justify-content: center; }`,
  },
  {
    id: "card-grid",
    name: "Wrapping Card Grid",
    blurb: "Responsive card rows that wrap, no media queries needed.",
    gapApplies: true,
    html: `<div class="card-grid">
  <article>Card 1</article>
  <article>Card 2</article>
  <article>Card 3</article>
</div>`,
    css: `.card-grid { display: flex; flex-wrap: wrap; gap: 16px; }
.card-grid article { flex: 1 1 200px; }`,
  },
  {
    id: "navbar",
    name: "Navbar",
    blurb: "Brand left, links centered, CTA pushed right with margin auto.",
    gapApplies: true,
    html: `<nav class="navbar">
  <a class="brand">Brand</a>
  <div class="links"><a>Docs</a><a>Pricing</a><a>Blog</a></div>
  <a class="cta">Sign up</a>
</nav>`,
    css: `.navbar { display: flex; align-items: center; gap: 16px; }
.navbar .links { display: flex; gap: 12px; margin: 0 auto; }
.navbar .cta { margin-left: auto; }`,
  },
  {
    id: "split-hero",
    name: "Split Hero",
    blurb: "Two equal halves that stack on narrow screens via wrap.",
    gapApplies: true,
    html: `<section class="split">
  <div class="split-copy"><h1>Headline</h1><p>Subcopy</p></div>
  <div class="split-media">Visual</div>
</section>`,
    css: `.split { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; }
.split > * { flex: 1 1 280px; }`,
  },
  {
    id: "media-object",
    name: "Media Object",
    blurb: "Thumbnail plus text, text fills the remaining space.",
    gapApplies: true,
    html: `<div class="media">
  <img src="avatar.jpg" alt="">
  <div class="media-body"><h4>Name</h4><p>Bio line</p></div>
</div>`,
    css: `.media { display: flex; gap: 12px; align-items: flex-start; }
.media-body { flex: 1; min-width: 0; }`,
  },
  {
    id: "sidebar-layout",
    name: "Sidebar Layout",
    blurb: "Fixed-width sidebar, fluid content, full height.",
    gapApplies: false,
    html: `<div class="app-shell">
  <aside class="sidebar">Sidebar</aside>
  <main class="app-main">Content</main>
</div>`,
    css: `.app-shell { display: flex; min-height: 100%; }
.sidebar { flex: 0 0 220px; }
.app-main { flex: 1; min-width: 0; }`,
  },
  {
    id: "equal-columns",
    name: "Equal Columns",
    blurb: "Three columns that stay equal even with uneven content.",
    gapApplies: true,
    html: `<div class="cols">
  <div>Short</div>
  <div>Much longer content here that would stretch a float layout</div>
  <div>Medium length</div>
</div>`,
    css: `.cols { display: flex; gap: 16px; }
.cols > * { flex: 1; }`,
  },
  {
    id: "toolbar",
    name: "Toolbar",
    blurb: "Grouped actions with the danger zone pushed to the far end.",
    gapApplies: true,
    html: `<div class="toolbar">
  <button>Save</button>
  <button>Preview</button>
  <button class="danger">Delete</button>
</div>`,
    css: `.toolbar { display: flex; gap: 8px; align-items: center; }
.toolbar .danger { margin-left: auto; }`,
  },
  {
    id: "form-row",
    name: "Form Row",
    blurb: "Label, input and button on one row; the input takes the space.",
    gapApplies: true,
    html: `<form class="form-row">
  <label>Email</label>
  <input type="email" placeholder="you@site.com">
  <button>Subscribe</button>
</form>`,
    css: `.form-row { display: flex; gap: 8px; align-items: center; }
.form-row input { flex: 1; min-width: 0; }`,
  },
  {
    id: "pricing",
    name: "Pricing Row",
    blurb: "Three tiers, the featured one grows taller and stands out.",
    gapApplies: true,
    html: `<div class="pricing">
  <div class="tier">Basic</div>
  <div class="tier featured">Pro</div>
  <div class="tier">Team</div>
</div>`,
    css: `.pricing { display: flex; gap: 16px; align-items: stretch; }
.pricing .tier { flex: 1; }
.pricing .featured { flex: 1.25; transform: scale(1.03); }`,
  },
  {
    id: "avatar-stack",
    name: "Avatar Stack",
    blurb: "Overlapping avatars with negative margins, count bubble last.",
    gapApplies: false,
    html: `<div class="avatars">
  <img src="a.jpg" alt=""><img src="b.jpg" alt="">
  <img src="c.jpg" alt=""><span class="more">+9</span>
</div>`,
    css: `.avatars { display: flex; align-items: center; }
.avatars > * + * { margin-left: -10px; }
.avatars img, .avatars .more { border: 2px solid #fff; border-radius: 999px; }`,
  },
  {
    id: "chat-layout",
    name: "Chat Layout",
    blurb: "Message area scrolls, input pinned to the bottom.",
    gapApplies: true,
    html: `<div class="chat">
  <div class="messages"><p class="them">Hi</p><p class="me">Hello</p></div>
  <form class="composer"><input><button>Send</button></form>
</div>`,
    css: `.chat { display: flex; flex-direction: column; height: 100%; }
.chat .messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.chat .composer { display: flex; gap: 8px; }
.chat .composer input { flex: 1; }`,
  },
  {
    id: "space-between-col",
    name: "Spaced Column",
    blurb: "Top, middle and bottom blocks in a column with space-between.",
    gapApplies: false,
    html: `<div class="stack">
  <div>Top</div><div>Middle</div><div>Bottom</div>
</div>`,
    css: `.stack { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }`,
  },
  {
    id: "footer-columns",
    name: "Footer Columns",
    blurb: "Link columns that wrap gracefully on small screens.",
    gapApplies: true,
    html: `<footer class="foot">
  <div class="brand">Brand</div>
  <nav>Product links</nav>
  <nav>Company links</nav>
  <nav>Legal links</nav>
</footer>`,
    css: `.foot { display: flex; flex-wrap: wrap; gap: 24px; }
.foot > * { flex: 1 1 160px; }`,
  },
];

function Demo({ id, gap }: { id: string; gap: number }) {
  const g = { gap: `${gap}px` };
  switch (id) {
    case "holy-grail":
      return (
        <div className="flex h-full min-h-[300px] flex-col text-center text-xs font-bold">
          <div className={cn(box, "p-3")}>Header</div>
          <div className="flex flex-1 gap-2 py-2">
            <div className={cn(boxAlt, "w-[90px] p-3")}>Nav</div>
            <div className={cn(box, "flex-1 p-3")}>Content</div>
            <div className={cn(boxAlt, "w-[90px] p-3")}>Aside</div>
          </div>
          <div className={cn(box, "p-3")}>Footer</div>
        </div>
      );
    case "sticky-footer":
      return (
        <div className="flex h-full min-h-[300px] flex-col text-center text-xs font-bold">
          <div className={cn(box, "p-3")}>Header</div>
          <div className={cn(boxAlt, "flex-1 p-3")}>Content (try: short pages still pin the footer)</div>
          <div className={cn(box, "p-3")}>Footer sticks to bottom</div>
        </div>
      );
    case "perfect-center":
      return (
        <div className="flex h-full min-h-[300px] items-center justify-center">
          <div className={cn(box, "px-8 py-6 text-sm font-bold")}>Dead center</div>
        </div>
      );
    case "card-grid":
      return (
        <div className="flex flex-wrap" style={g}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={cn(box, "min-w-[140px] flex-1 p-4 text-center text-xs font-bold")}>
              Card {i}
            </div>
          ))}
        </div>
      );
    case "navbar":
      return (
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-3 text-sm font-semibold" style={g}>
          <span className="font-extrabold text-primary">Brand</span>
          <div className="mx-auto flex gap-3 text-xs text-muted-foreground">
            <span>Docs</span>
            <span>Pricing</span>
            <span>Blog</span>
          </div>
          <span className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Sign up</span>
        </div>
      );
    case "split-hero":
      return (
        <div className="flex flex-wrap items-center" style={g}>
          <div className="min-w-[200px] flex-1">
            <p className="text-xl font-extrabold">Headline goes here</p>
            <p className="mt-1 text-sm text-muted-foreground">Supporting copy that sells the idea.</p>
          </div>
          <div className={cn(box, "flex h-36 min-w-[200px] flex-1 items-center justify-center text-xs font-bold")}>
            Visual
          </div>
        </div>
      );
    case "media-object":
      return (
        <div className="flex items-start" style={g}>
          <div className={cn(box, "flex h-12 w-12 shrink-0 items-center justify-center text-sm font-extrabold")}>A</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Ava Rivera</p>
            <p className="text-xs text-muted-foreground">The body flexes to fill whatever space the thumbnail leaves.</p>
          </div>
        </div>
      );
    case "sidebar-layout":
      return (
        <div className="flex h-full min-h-[300px] text-xs font-bold">
          <div className={cn(boxAlt, "w-[150px] shrink-0 p-3")}>Sidebar</div>
          <div className={cn(box, "ml-2 flex-1 p-3")}>Content (min-width: 0 keeps it from overflowing)</div>
        </div>
      );
    case "equal-columns":
      return (
        <div className="flex" style={g}>
          <div className={cn(box, "flex-1 p-3 text-center text-xs font-bold")}>Short</div>
          <div className={cn(boxAlt, "flex-1 p-3 text-center text-xs font-bold")}>Much longer content, still equal width</div>
          <div className={cn(box, "flex-1 p-3 text-center text-xs font-bold")}>Medium</div>
        </div>
      );
    case "toolbar":
      return (
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-2 text-xs font-bold" style={g}>
          <span className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">Save</span>
          <span className="rounded-lg border border-border px-3 py-1.5">Preview</span>
          <span className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 text-red-500">Delete</span>
        </div>
      );
    case "form-row":
      return (
        <div className="flex items-center" style={g}>
          <span className="text-sm font-semibold">Email</span>
          <span className="min-w-0 flex-1 truncate rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
            you@site.com
          </span>
          <span className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Subscribe</span>
        </div>
      );
    case "pricing":
      return (
        <div className="flex items-stretch" style={g}>
          <div className={cn(boxAlt, "flex-1 p-4 text-center text-xs font-bold")}>Basic<br />$9</div>
          <div className={cn(box, "flex-[1.25] scale-[1.03] p-4 text-center text-xs font-bold")}>Pro<br />$29</div>
          <div className={cn(boxAlt, "flex-1 p-4 text-center text-xs font-bold")}>Team<br />$99</div>
        </div>
      );
    case "avatar-stack":
      return (
        <div className="flex items-center">
          {["A", "B", "C"].map((l, i) => (
            <div
              key={l}
              className={cn(box, "flex h-10 w-10 items-center justify-center rounded-full text-xs font-extrabold")}
              style={i > 0 ? { marginLeft: -10 } : undefined}
            >
              {l}
            </div>
          ))}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-extrabold"
            style={{ marginLeft: -10 }}
          >
            +9
          </div>
        </div>
      );
    case "chat-layout":
      return (
        <div className="flex h-full min-h-[300px] flex-col" style={g}>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            <div className={cn(boxAlt, "self-start px-3 py-2 text-xs")}>Hi, is this in stock?</div>
            <div className={cn(box, "self-end px-3 py-2 text-xs")}>Yes, shipping today.</div>
            <div className={cn(boxAlt, "self-start px-3 py-2 text-xs")}>Perfect, ordering now.</div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">Type a message…</div>
            <div className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Send</div>
          </div>
        </div>
      );
    case "space-between-col":
      return (
        <div className="flex h-full min-h-[300px] flex-col justify-between text-center text-xs font-bold">
          <div className={cn(box, "p-3")}>Top</div>
          <div className={cn(boxAlt, "p-3")}>Middle</div>
          <div className={cn(box, "p-3")}>Bottom</div>
        </div>
      );
    default:
      return (
        <div className="flex flex-wrap" style={g}>
          <div className={cn(box, "min-w-[120px] flex-[1_1_160px] p-3 text-center text-xs font-bold")}>Brand</div>
          {["Product", "Company", "Legal"].map((t) => (
            <div key={t} className={cn(boxAlt, "min-w-[120px] flex-[1_1_160px] p-3 text-center text-xs font-bold")}>
              {t}
            </div>
          ))}
        </div>
      );
  }
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function FlexboxPatternsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("flexbox-patterns", isPro);
  const seo = toolSeo;

  const [active, setActive] = useState(PATTERNS[0]!);
  const [gap, setGap] = useState(16);
  const [copied, setCopied] = useState(false);

  const code = `<!-- ${active.name} -->\n${active.html}\n\n<style>\n${active.css}\n</style>`;

  const copyCode = async () => {
    if (!trial.canUse) return;
    if (await copyText(code)) {
      trial.recordUse();
      setCopied(true);
      toast.success(`${active.name} code copied`);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed - select the code manually.");
    }
  };

  const downloadAll = () => {
    const all = PATTERNS.map((p) => `/* ===== ${p.name} ===== */\n${p.css}`).join("\n\n");
    downloadBlob(new Blob([all], { type: "text/css" }), "flexbox-patterns.css");
    toast.success("All 16 patterns downloaded");
  };

  return (
    <ToolPageShell toolId="flexbox-patterns" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Flexbox Patterns" left={trial.left} />

      <div className="mb-5 flex flex-wrap gap-2">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
              active.id === p.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <h2 className="font-extrabold">{active.name}</h2>
            </div>
            {active.gapApplies && (
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                Gap
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  className="w-28 accent-primary"
                />
                <span className="w-10 text-right tabular-nums">{gap}px</span>
              </label>
            )}
          </div>
          <div className="min-h-[320px] rounded-xl border border-dashed border-border bg-muted/20 p-5">
            <Demo id={active.id} gap={active.gapApplies ? gap : 8} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{active.blurb}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">Code</h2>
            <div className="flex gap-2">
              <ActionButton busy={false} disabled={!trial.canUse} onClick={copyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy code"}
              </ActionButton>
            </div>
          </div>
          <pre className="max-h-[420px] overflow-auto rounded-xl bg-zinc-950 p-4 text-[12.5px] leading-relaxed text-zinc-200">
            <code>{code}</code>
          </pre>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadAll}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
            >
              <Download className="h-4 w-4" /> Download all 16 as CSS
            </button>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
