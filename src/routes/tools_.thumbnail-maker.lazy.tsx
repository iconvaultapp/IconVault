// /tools/thumbnail-maker - Canva-like YouTube thumbnail studio:
// 720 fully-editable templates across 20 niches + Fabric.js editor
// (text, uploads, shapes, backgrounds, layers, undo/redo, HD export).

import { createLazyFileRoute } from "@tanstack/react-router";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/thumbnail-maker";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";
import ThumbnailStudio from "@/components/thumbnail-studio/ThumbnailStudio";

export const Route = createLazyFileRoute("/tools_/thumbnail-maker")({
  component: ThumbnailTool,
});

function ThumbnailTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("thumbnail-maker", isPro);
  const seo = toolSeo;
  return (
    <ToolPageShell toolId="thumbnail-maker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Thumbnail Maker" left={trial.left} />
      <ThumbnailStudio isPro={isPro} trial={trial} />
    </ToolPageShell>
  );
}
