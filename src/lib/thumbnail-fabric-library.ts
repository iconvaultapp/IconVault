// IconVault Thumbnail Studio - photo + GFX Fabric.js template library.
//
// 650 fully-editable templates:
//  - 150 photo templates = 30 original AI-generated photos x 5 creator styles
//    (Shock Split, Cinematic, Creator Split, Circle Spotlight, Sticker Pop).
//  - 500 trending GFX templates = 12 layout archetypes x 15 niches, built
//    from the curated GFX asset pack in public/thumbs/gfx/ (backgrounds,
//    arrows, cutouts, fire, money, devices and more).
// Templates are MATERIALIZED on demand (tiny code, no giant JSON bundle):
// each template is a real Fabric v7 canvas JSON object tree, so every text,
// shape, color and image stays editable in the Canva-like editor.
// The 150 photo templates ship with original AI generations in
// public/thumbs/photos/ - no third-party assets, nothing to license.
// GFX templates skip real-person photos, game characters, brand logos and
// weapons from the source pack.

import { PHOTO_TEMPLATES, PHOTO_NICHES, getPhotoTemplate, getPhotoStyleVariants } from "./thumbnail-photo-library";
import { GFX_TEMPLATES, getGfxTemplate, getGfxStyleVariants } from "./thumbnail-gfx-library";

export const TW = 1280;
export const TH = 720;

export interface FabricTemplateMeta {
  id: string;
  name: string;
  niche: string;
  nicheLabel: string;
  layout: string;
  layoutLabel: string;
  variant: number;
  isPro: boolean;
  tags: string[];
}

export interface FabricCanvasJSON {
  version: string;
  objects: Record<string, unknown>[];
}

export const FABRIC_NICHES = PHOTO_NICHES.map((n) => ({ id: n.id, label: n.label }));

export const STUDIO_FONTS = [
  "Anton",
  "Archivo Black",
  "Bebas Neue",
  "Montserrat",
  "Poppins",
  "Oswald",
  "Playfair Display",
  "Inter",
];

export const FABRIC_TEMPLATES: FabricTemplateMeta[] = [...PHOTO_TEMPLATES, ...GFX_TEMPLATES];

export const FABRIC_TEMPLATE_COUNT = FABRIC_TEMPLATES.length; // 650

export function getFabricTemplate(id: string): { meta: FabricTemplateMeta; json: FabricCanvasJSON } | null {
  return getPhotoTemplate(id) ?? getGfxTemplate(id);
}

/** Style variants for the editor "Styles" tab (photo templates have 5, GFX have none). */
export function getTemplateStyleVariants(id: string): FabricTemplateMeta[] {
  if (id.startsWith("ph-")) return getPhotoStyleVariants(id);
  return getGfxStyleVariants(id);
}

export function searchFabricTemplates(q: string): FabricTemplateMeta[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return FABRIC_TEMPLATES;
  return FABRIC_TEMPLATES.filter(
    (m) =>
      m.name.toLowerCase().includes(needle) ||
      m.niche.toLowerCase().includes(needle) ||
      m.nicheLabel.toLowerCase().includes(needle) ||
      m.layoutLabel.toLowerCase().includes(needle) ||
      m.tags.some((t) => t.includes(needle)),
  );
}
