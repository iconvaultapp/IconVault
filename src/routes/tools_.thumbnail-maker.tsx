// /tools/thumbnail-maker - Canva-like YouTube thumbnail studio:
// 720 fully-editable templates across 20 niches + Fabric.js editor
// (text, uploads, shapes, backgrounds, layers, undo/redo, HD export).

import { createFileRoute } from "@tanstack/react-router";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/thumbnail-maker";
import toolSeoMeta from "@/lib/tool-seo-meta-data/thumbnail-maker";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";
import ThumbnailStudio from "@/components/thumbnail-studio/ThumbnailStudio";

export const Route = createFileRoute("/tools_/thumbnail-maker")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/thumbnail-maker";
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
