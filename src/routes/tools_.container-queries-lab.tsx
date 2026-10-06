// /tools/container-queries-lab - Resize a container with a slider, write
// @container rules, and watch the card inside restyle live. 100% client-side;
// trial use is recorded when the code is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Box, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/container-queries-lab";
import toolSeoMeta from "@/lib/tool-seo-meta-data/container-queries-lab";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/container-queries-lab")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/container-queries-lab";
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
  component: ContainerQueriesTool,
});

const DEFAULT_RULES = `@container demo (min-width: 460px) {
  .cq-card {
    flex-direction: row;
    align-items: center;
  }
  .cq-art {
    width: 168px;
    height: 128px;
    flex-shrink: 0;
  }
  .cq-title {
    font-size: 20px;
  }
}

@container demo (max-width: 459px) {
  .cq-btn {
    width: 100%;
  }
}`;

const BASE_CSS = `
.cq-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  transition: all 0.25s ease;
}
.cq-art {
  width: 100%;
  height: 120px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f766e, #14b8a6 60%, #5eead4);
}
.cq-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}
.cq-text {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
}
.cq-btn {
  background: #0f766e;
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 10px 22px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}`;

function ContainerQueriesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("container-queries-lab", isPro);
  const seo = toolSeo;

  const [width, setWidth] = useState(560);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [copied, setCopied] = useState(false);
  const [supported] = useState(
    () => typeof CSS !== "undefined" && CSS.supports("container-type: inline-size"),
  );

  const generated = useMemo(
    () => `/* 1. Mark an element as a query container */\n.card-wrap {\n  container-type: inline-size;\n  container-name: demo;\n}\n\n/* 2. Style descendants based on the CONTAINER width, not the viewport */\n${rules.trim()}\n`,
    [rules],
  );

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      trial.recordUse();
      toast.success("Container query code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="container-queries-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Container Queries Lab" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <Box className="h-4 w-4 text-primary" />
        <span className="font-semibold">Browser support:</span>
        <span
          className={
            supported
              ? "rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-600"
              : "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600"
          }
        >
          {supported ? "Container queries work in this browser" : "Not supported in this browser"}
        </span>
        <span className="text-xs text-muted-foreground">
          Container queries ship in Chrome 105+, Edge 105+, Safari 16+ and Firefox 110+. Unlike
          media queries, they respond to the parent container, not the viewport.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">Container width</span>
              <span className="tabular-nums text-muted-foreground">{width}px</span>
            </div>
            <input
              type="range"
              min={220}
              max={720}
              step={10}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Drag the slider and watch the card restyle at the 460px container breakpoint.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground/80">@container rules</span>
              <button
                type="button"
                onClick={() => setRules(DEFAULT_RULES)}
                className="text-xs font-bold text-primary hover:underline"
              >
                Reset
              </button>
            </div>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              spellCheck={false}
              rows={18}
              className="w-full rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={copy}
            disabled={!trial.canUse}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy generated code"}
          </button>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-bold">Live demo</h2>
            <div className="overflow-x-auto rounded-xl bg-muted/40 p-6">
              <div className="mx-auto" style={{ width: `${width}px`, maxWidth: "100%" }}>
                <div
                  className="rounded-xl border-2 border-dashed border-primary/40 p-3"
                  style={{ containerType: "inline-size", containerName: "demo" }}
                >
                  <style>{BASE_CSS}</style>
                  <style>{rules}</style>
                  <div className="cq-card">
                    <div className="cq-art" />
                    <div className="min-w-0">
                      <h3 className="cq-title">Container-aware card</h3>
                      <p className="cq-text">
                        This card restyles when its container (the dashed box) crosses 460px,
                        wherever it sits on the page. The viewport width does not matter.
                      </p>
                      <button type="button" className="cq-btn">Learn more</button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
                  container width: {width}px
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Generated code</h2>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
              {generated}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
