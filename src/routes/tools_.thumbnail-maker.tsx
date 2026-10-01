// /tools/thumbnail-maker - Canva-like YouTube thumbnail studio:
// 720 fully-editable templates across 20 niches + Fabric.js editor
// (text, uploads, shapes, backgrounds, layers, undo/redo, HD export).

import { createFileRoute } from "@tanstack/react-router";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";
import ThumbnailStudio from "@/components/thumbnail-studio/ThumbnailStudio";

export const Route = createFileRoute("/tools_/thumbnail-maker")({
  head: () => {
    const seo = getToolSeoMeta("thumbnail-maker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ThumbnailTool,
});

function ThumbnailTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("thumbnail-maker", isPro);
  const seo = getToolSeo("thumbnail-maker");
  return (
    <ToolPageShell toolId="thumbnail-maker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Thumbnail Maker" left={trial.left} />
      <ThumbnailStudio isPro={isPro} trial={trial} />
    </ToolPageShell>
  );
}
