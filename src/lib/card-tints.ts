// Pastel panel tints for icon-set cards on the browse page (Sameer
// 2026-10-23, style-grid reference): every set gets its own soft colour,
// hashed from its prefix so the same set always wears the same tint.
export const CARD_TINTS = [
  "#FDEBD7", // peach
  "#E4E5F6", // periwinkle lavender
  "#DFF3E4", // mint
  "#FBE3E0", // blush
  "#E9E4F8", // lilac
  "#DFF2F8", // sky
  "#FCF3D3", // butter
  "#FBE7F1", // rose mist
  "#D9F1EE", // teal mist
  "#FCEFD2", // cream
  "#E3F0E1", // sage
  "#FFE9D6", // apricot
] as const;

export function tintFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return CARD_TINTS[h % CARD_TINTS.length]!;
}
