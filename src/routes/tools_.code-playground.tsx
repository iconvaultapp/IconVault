// /tools/code-playground - write HTML, CSS and JS with a live preview that
// compiles as you type, in a sandboxed iframe. Download as a standalone .html
// file. 100% client-side.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code2, Download, Globe } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/code-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/code-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools_/code-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/code-playground";
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
  component: CodePlaygroundTool,
});

const DEFAULT_HTML = `<div class="card">
  <h1>Hello, web!</h1>
  <p>Edit the <b>HTML</b>, <b>CSS</b> and <b>JS</b> tabs - the preview updates live.</p>
  <button id="btn">Click me</button>
  <p id="out"></p>
</div>`;

const DEFAULT_CSS = `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 100%;
  margin: 0;
  background: #f4f1ea;
}
.card {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 12px 32px rgba(0,0,0,.12);
  text-align: center;
  max-width: 420px;
}
h1 { color: #0f766e; margin: 0 0 8px; }
button {
  background: #0f766e;
  color: #fff;
  border: 0;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 15px;
  cursor: pointer;
}
#out { color: #b45309; font-weight: 700; min-height: 1.5em; }`;

const DEFAULT_JS = `let count = 0;
document.getElementById("btn").addEventListener("click", () => {
  count++;
  document.getElementById("out").textContent =
    "Clicked " + count + (count === 1 ? " time" : " times");
});`;

/** Build a standalone document from the three panes. The user's JS may contain
 *  "</script>" - escape it so the document never breaks early. */
export function buildDocument(html: string, css: string, js: string): string {
  const safeJs = js.replace(/<\/script/gi, "<\\/script");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css}</style>
</head>
<body>
${html}
<script>${safeJs}<\/script>
</body>
</html>`;
}

const PANES = [
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "js", label: "JS" },
] as const;

type Pane = (typeof PANES)[number]["id"];

function CodePlaygroundTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("code-playground", isPro);
  const seo = toolSeo;

  const [webHtml, setWebHtml] = useState(DEFAULT_HTML);
  const [webCss, setWebCss] = useState(DEFAULT_CSS);
  const [webJs, setWebJs] = useState(DEFAULT_JS);
  const [pane, setPane] = useState<Pane>("html");
  const [srcDoc, setSrcDoc] = useState(() => buildDocument(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS));

  /** Recompile the preview shortly after the user stops typing. */
  useEffect(() => {
    const t = setTimeout(() => setSrcDoc(buildDocument(webHtml, webCss, webJs)), 450);
    return () => clearTimeout(t);
  }, [webHtml, webCss, webJs]);

  const paneValue = pane === "html" ? webHtml : pane === "css" ? webCss : webJs;
  const setPaneValue = pane === "html" ? setWebHtml : pane === "css" ? setWebCss : setWebJs;

  const copyPane = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(paneValue);
      toast.success(`${pane.toUpperCase()} copied to clipboard.`);
      trial.recordUse();
    } catch {
      toast.error("Could not copy - select the code and copy it manually.");
    }
  };

  const downloadPage = () => {
    if (!trial.canUse) return;
    downloadBlob(
      new Blob([buildDocument(webHtml, webCss, webJs)], { type: "text/html" }),
      "playground-page.html",
    );
    trial.recordUse();
    toast.success("HTML page downloaded.");
  };

  return (
    <ToolPageShell toolId="code-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Code Playground" left={trial.left} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ActionButton busy={false} disabled={!trial.canUse} onClick={copyPane}>
          <Code2 className="h-4 w-4" /> Copy {pane.toUpperCase()}
        </ActionButton>
        <button
          type="button"
          onClick={downloadPage}
          disabled={!trial.canUse}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Download .html
        </button>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - coding and live preview are
            always free and unlimited.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex gap-1.5">
            {PANES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPane(p.id)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition",
                  pane === p.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={paneValue}
            onChange={(e) => setPaneValue(e.target.value)}
            placeholder={
              pane === "html" ? "<!-- Write HTML here… -->" : pane === "css" ? "/* Write CSS here… */" : "// Write JavaScript here…"
            }
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="h-[420px] w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <Globe className="h-4 w-4 text-muted-foreground" /> Live preview - compiles as you type
          </span>
          <iframe
            title="Code playground live preview"
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            className="h-[420px] w-full rounded-xl border border-border bg-white"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Your code runs in an isolated sandbox - nothing here can touch the IconVault page.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
