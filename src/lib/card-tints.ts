// Pastel panel tints for icon-set / category cards (Sameer 2026-10-23,
// reference: style-grid cards where every set sits on its own soft colour).
// The colour is hashed from the set's prefix (or category slug), so a set
// keeps the same tint everywhere it appears and across visits.
export const CARD_TINTS = [
  "#E1E9FD", // periwinkle
  "#ECEAFB", // lavender
  "#FCEFD2", // cream
  "#FBE3E0", // blush
  "#DFF6E6", // mint
  "#DFF2F8", // sky
  "#F2E7FC", // lilac
  "#FFE9D6", // peach
  "#D9F1EE", // teal mist
  "#FCF3D3", // butter
  "#E3F0E1", // sage
  "#FBE7F1", // rose mist
] as const;

export function tintFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return CARD_TINTS[h % CARD_TINTS.length]!;
}
