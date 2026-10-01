// 200 professional YouTube thumbnail templates - pure data, rendered by the
// engine in thumbnail-templates.ts. Styled after high-CTR reference designs:
// bold condensed typography, vibrant gradients, sunbursts, halftone,
// arrows, badges and split layouts.

import type {
  BadgeKind,
  BgSpec,
  Decoration,
  PatternKind,
  TemplateCategory,
  TextPos,
  ThumbnailTemplate,
} from "./thumbnail-templates";

function T(
  id: string,
  name: string,
  category: TemplateCategory,
  bg: BgSpec,
  o: {
    pattern?: PatternKind;
    patternColor?: string;
    badge?: BadgeKind;
    badgeColor?: string;
    badgeTextColor?: string;
    textPos?: TextPos;
    headlineScale?: number;
    textColor: string;
    strokeColor: string;
    accent: string;
    iconSide?: "left" | "right" | "center" | "none";
    iconSize?: number;
    decorations?: Decoration[];
  },
): ThumbnailTemplate {
  return { id, name, category, bg, ...o };
}

export const TEMPLATES: ThumbnailTemplate[] = [
  // ------------------------------------------------------------------
  // Shock & Clickbait (14)
  // ------------------------------------------------------------------
  T("cb-red-circle", "Red Circle Shock", "clickbait", { type: "solid", color: "#0a0a0a" }, {
    badge: "pill", badgeColor: "#facc15", badgeTextColor: "#111111",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#ef4444",
    iconSide: "right",
    decorations: [
      { kind: "circle", x: 0.78, y: 0.42, r: 0.11, color: "#ef4444", width: 16 },
      { kind: "arrow", x: 0.62, y: 0.72, rotation: -30, scale: 1.1, color: "#facc15" },
    ],
  }),
  T("cb-giant-question", "Giant Question", "clickbait", { type: "gradient", c1: "#dc2626", c2: "#7f1d1d", angle: 120 }, {
    textPos: "center", headlineScale: 1.15, textColor: "#ffffff", strokeColor: "#450a0a",
    accent: "#facc15", iconSide: "none",
    decorations: [
      { kind: "question", x: 0.85, y: 0.25, scale: 0.9, color: "#facc15" },
      { kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#facc15" },
    ],
  }),
  T("cb-alert-blast", "Alert Blast", "clickbait", { type: "solid", color: "#facc15" }, {
    pattern: "stripes", patternColor: "rgba(0,0,0,0.08)",
    badge: "stamp", badgeColor: "#dc2626", badgeTextColor: "#ffffff",
    textPos: "left", textColor: "#111111", strokeColor: "#111111", accent: "#dc2626",
    iconSide: "right",
    decorations: [{ kind: "exclaim", x: 0.82, y: 0.3, scale: 1, color: "#dc2626" }],
  }),
  T("cb-starburst", "Starburst Reveal", "clickbait", { type: "gradient", c1: "#1d4ed8", c2: "#0f172a", angle: 135 }, {
    pattern: "rays", patternColor: "rgba(250,204,21,0.16)",
    badge: "pill", badgeColor: "#facc15", badgeTextColor: "#111111",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.86, y: 0.22, r: 0.09, color: "#facc15" }],
  }),
  T("cb-secret-arrow", "Secret Arrow", "clickbait", { type: "gradient", c1: "#4c1d95", c2: "#1e1b4b", angle: 140 }, {
    badge: "ribbon", badgeColor: "#facc15", badgeTextColor: "#111111",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [
      { kind: "arrow", x: 0.68, y: 0.3, rotation: 35, scale: 1.2, color: "#facc15" },
      { kind: "circle", x: 0.84, y: 0.62, r: 0.08, color: "#facc15", width: 12 },
    ],
  }),
  T("cb-mystery-glow", "Mystery Glow", "clickbait", { type: "solid", color: "#050505" }, {
    textPos: "center", textColor: "#facc15", strokeColor: "#000000", accent: "#a855f7",
    iconSide: "none",
    decorations: [
      { kind: "question", x: 0.5, y: 0.28, scale: 1.1, color: "#ffffff" },
      { kind: "glow", x: 0.5, y: 0.3, r: 0.35, color: "#a855f7" },
    ],
  }),
  T("cb-pop-halftone", "Pop Halftone", "clickbait", { type: "gradient", c1: "#f97316", c2: "#dc2626", angle: 100 }, {
    pattern: "halftone", patternColor: "rgba(0,0,0,0.18)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "exclaim", x: 0.85, y: 0.28, scale: 1.1, color: "#facc15" }],
  }),
  T("cb-drama-underline", "Drama Underline", "clickbait", { type: "gradient", c1: "#991b1b", c2: "#450a0a", angle: 135 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#991b1b",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "underline", color: "#facc15", width: 16 },
      { kind: "arrow", x: 0.2, y: 0.25, rotation: 160, scale: 0.8, color: "#facc15" },
    ],
  }),
  T("cb-neon-arena", "Neon Arena", "clickbait", { type: "gradient", c1: "#312e81", c2: "#0f172a", angle: 140 }, {
    badge: "stamp", badgeColor: "#22d3ee", badgeTextColor: "#0f172a",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#22d3ee",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.7, y: 0.4, r: 0.4, color: "#22d3ee" }],
  }),
  T("cb-vs-battle", "VS Battle", "clickbait", { type: "gradient", c1: "#991b1b", c2: "#1e3a8a", angle: 90 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#ef4444",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#1e3a8a", ratio: 0.5, diagonal: true },
      { kind: "vs", x: 0.5, y: 0.5, scale: 1 },
    ],
  }),
  T("cb-cyber-grid", "Cyber Grid", "clickbait", { type: "solid", color: "#0b1e3a" }, {
    pattern: "grid", patternColor: "rgba(34,211,238,0.25)",
    badge: "pill", badgeColor: "#22d3ee", badgeTextColor: "#0b1e3a",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#22d3ee",
    iconSide: "right",
    decorations: [{ kind: "frame", color: "#22d3ee", width: 10 }],
  }),
  T("cb-breaking-stamp", "Breaking Stamp", "clickbait", { type: "solid", color: "#f8fafc" }, {
    badge: "stamp", badgeColor: "#dc2626", badgeTextColor: "#ffffff",
    textPos: "left", textColor: "#111111", strokeColor: "#ffffff", accent: "#dc2626",
    iconSide: "right",
    decorations: [
      { kind: "exclaim", x: 0.84, y: 0.3, scale: 1.2, color: "#dc2626" },
      { kind: "arrow", x: 0.66, y: 0.7, rotation: -25, scale: 1, color: "#dc2626" },
    ],
  }),
  T("cb-top10", "Top 10 Blast", "clickbait", { type: "solid", color: "#0a0a0a" }, {
    pattern: "rays", patternColor: "rgba(250,204,21,0.1)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "bignumber", x: 0.8, y: 0.42, scale: 1.6, color: "#facc15" },
      { kind: "starburst", x: 0.14, y: 0.2, r: 0.07, color: "#ef4444" },
    ],
  }),
  T("cb-shock-split", "Shock Split", "clickbait", { type: "solid", color: "#facc15" }, {
    textPos: "left", textColor: "#111111", strokeColor: "#facc15", accent: "#dc2626",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#111111", ratio: 0.42, diagonal: true },
      { kind: "exclaim", x: 0.24, y: 0.4, scale: 1.3, color: "#facc15" },
    ],
  }),
  // ------------------------------------------------------------------
  // Gaming (12)
  // ------------------------------------------------------------------
  T("gm-neon-grid", "Neon Grid", "gaming", { type: "solid", color: "#0d0221" }, {
    pattern: "grid", patternColor: "rgba(0,255,255,0.22)",
    badge: "pill", badgeColor: "#00ffff", badgeTextColor: "#0d0221",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#00ffff",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.75, r: 0.5, color: "#7b2ff7" }],
  }),
  T("gm-pixel-war", "Pixel War", "gaming", { type: "gradient", c1: "#7b2ff7", c2: "#2b0a54", angle: 135 }, {
    pattern: "speedlines", patternColor: "rgba(255,255,255,0.12)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#1a0533", accent: "#00ffff",
    iconSide: "right",
    decorations: [{ kind: "vs", x: 0.78, y: 0.35, scale: 0.9 }],
  }),
  T("gm-boss-battle", "Boss Battle", "gaming", { type: "gradient", c1: "#1a0505", c2: "#450a0a", angle: 120 }, {
    badge: "stamp", badgeColor: "#ef4444", badgeTextColor: "#ffffff",
    textPos: "center", headlineScale: 1.1, textColor: "#ffffff", strokeColor: "#000000",
    accent: "#ef4444", iconSide: "none",
    decorations: [
      { kind: "cross", x: 0.85, y: 0.3, scale: 1.2, color: "#ef4444" },
      { kind: "glow", x: 0.5, y: 0.6, r: 0.4, color: "#ef4444" },
    ],
  }),
  T("gm-loot-drop", "Loot Drop", "gaming", { type: "gradient", c1: "#052e16", c2: "#0a0a0a", angle: 140 }, {
    textPos: "center", textColor: "#facc15", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "starburst", x: 0.82, y: 0.28, r: 0.1, color: "#facc15" },
      { kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#facc15" },
    ],
  }),
  T("gm-level-up", "Level Up", "gaming", { type: "gradient", c1: "#1e40af", c2: "#0f172a", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#22d3ee",
    iconSide: "right",
    decorations: [
      { kind: "progressbar", progress: 0.85, color: "#22d3ee", trackColor: "rgba(255,255,255,0.2)" },
      { kind: "arrow", x: 0.7, y: 0.28, rotation: -55, scale: 1.1, color: "#22d3ee" },
    ],
  }),
  T("gm-game-over", "Game Over Glow", "gaming", { type: "solid", color: "#000000" }, {
    pattern: "dots", patternColor: "rgba(239,68,68,0.25)",
    textPos: "center", textColor: "#ef4444", strokeColor: "#000000", accent: "#ef4444",
    iconSide: "none",
    decorations: [
      { kind: "exclaim", x: 0.5, y: 0.24, scale: 1.2, color: "#ef4444" },
      { kind: "glow", x: 0.5, y: 0.5, r: 0.5, color: "#ef4444" },
    ],
  }),
  T("gm-cyber-strike", "Cyber Strike", "gaming", { type: "solid", color: "#0a1628" }, {
    pattern: "speedlines", patternColor: "rgba(34,211,238,0.15)",
    badge: "pill", badgeColor: "#22d3ee", badgeTextColor: "#0a1628",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#22d3ee",
    iconSide: "right",
    decorations: [{ kind: "frame", color: "#22d3ee", width: 12 }],
  }),
  T("gm-power-play", "Power Play", "gaming", { type: "gradient", c1: "#d946ef", c2: "#4c1d95", angle: 120 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#2b0a54", accent: "#facc15",
    iconSide: "right",
    decorations: [
      { kind: "arrow", x: 0.72, y: 0.3, rotation: -50, scale: 1.3, color: "#facc15" },
      { kind: "glow", x: 0.5, y: 0.5, r: 0.4, color: "#d946ef" },
    ],
  }),
  T("gm-epic-win", "Epic Win", "gaming", { type: "gradient", c1: "#facc15", c2: "#b45309", angle: 135 }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.2)",
    textPos: "center", textColor: "#111111", strokeColor: "#facc15", accent: "#111111",
    iconSide: "none",
    decorations: [{ kind: "bignumber", x: 0.5, y: 0.26, scale: 1.4, color: "#111111" }],
  }),
  T("gm-stealth", "Stealth Mode", "gaming", { type: "gradient", c1: "#1f2937", c2: "#030712", angle: 140 }, {
    badge: "pill", badgeColor: "#4ade80", badgeTextColor: "#030712",
    textPos: "left", textColor: "#e5e7eb", strokeColor: "#000000", accent: "#4ade80",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.82, y: 0.3, scale: 1, color: "#4ade80" }],
  }),
  T("gm-arena-clash", "Arena Clash", "gaming", { type: "gradient", c1: "#6d28d9", c2: "#1e1b4b", angle: 90 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#22d3ee",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#0ea5e9", ratio: 0.5, diagonal: true },
      { kind: "vs", x: 0.5, y: 0.52, scale: 1.1 },
    ],
  }),
  T("gm-skin-drop", "New Skin Drop", "gaming", { type: "gradient", c1: "#0d9488", c2: "#042f2e", angle: 135 }, {
    badge: "pill", badgeColor: "#facc15", badgeTextColor: "#042f2e",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "starburst", x: 0.82, y: 0.3, r: 0.08, color: "#facc15" }],
  }),
  // ------------------------------------------------------------------
  // Finance & Money (14)
  // ------------------------------------------------------------------
  T("fn-money-surge", "Money Surge", "finance", { type: "gradient", c1: "#052e16", c2: "#020617", angle: 135 }, {
    pattern: "rays", patternColor: "rgba(74,222,128,0.12)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#4ade80",
    iconSide: "none",
    decorations: [
      { kind: "bignumber", x: 0.8, y: 0.42, scale: 1.5, color: "#4ade80" },
      { kind: "arrow", x: 0.66, y: 0.26, rotation: -55, scale: 1.2, color: "#4ade80" },
    ],
  }),
  T("fn-profit-arrow", "Profit Arrow", "finance", { type: "solid", color: "#0a0a0a" }, {
    badge: "pill", badgeColor: "#4ade80",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#4ade80",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.7, y: 0.4, rotation: -50, scale: 1.6, color: "#4ade80" }],
  }),
  T("fn-gold-vault", "Gold Vault", "finance", { type: "gradient", c1: "#fbbf24", c2: "#92400e", angle: 135 }, {
    textPos: "center", textColor: "#1c0a00", strokeColor: "#fbbf24", accent: "#1c0a00",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#1c0a00", width: 14 }],
  }),
  T("fn-trading-floor", "Trading Floor", "finance", { type: "solid", color: "#0f172a" }, {
    pattern: "stripes", patternColor: "rgba(74,222,128,0.1)",
    badge: "pill", badgeColor: "#22d3ee",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#4ade80",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.3, rotation: -45, scale: 1.1, color: "#4ade80" }],
  }),
  T("fn-passive-stack", "Passive Stack", "finance", { type: "gradient", c1: "#15803d", c2: "#052e16", angle: 120 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "progressbar", progress: 0.72, color: "#facc15", trackColor: "rgba(255,255,255,0.25)" },
      { kind: "check", x: 0.85, y: 0.3, scale: 1, color: "#facc15" },
    ],
  }),
  T("fn-million-play", "Million Play", "finance", { type: "solid", color: "#0a0a0a" }, {
    textPos: "center", textColor: "#facc15", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "starburst", x: 0.85, y: 0.24, r: 0.09, color: "#facc15" },
      { kind: "glow", x: 0.5, y: 0.55, r: 0.45, color: "#facc15" },
    ],
  }),
  T("fn-crypto-wave", "Crypto Wave", "finance", { type: "gradient", c1: "#4c1d95", c2: "#0f172a", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#a78bfa",
    iconSide: "right",
    decorations: [{ kind: "wave", color: "#a78bfa", height: 90 }],
  }),
  T("fn-bull-run", "Bull Run", "finance", { type: "solid", color: "#052e16" }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#4ade80",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#4ade80", ratio: 0.35, diagonal: true },
      { kind: "arrow", x: 0.2, y: 0.45, rotation: -50, scale: 1.4, color: "#052e16" },
    ],
  }),
  T("fn-debt-destroyer", "Debt Destroyer", "finance", { type: "gradient", c1: "#7f1d1d", c2: "#0a0a0a", angle: 135 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#ef4444",
    iconSide: "none",
    decorations: [{ kind: "cross", x: 0.5, y: 0.26, scale: 1.3, color: "#ef4444" }],
  }),
  T("fn-budget-blueprint", "Budget Blueprint", "finance", { type: "solid", color: "#1e3a8a" }, {
    pattern: "grid", patternColor: "rgba(255,255,255,0.12)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#172554", accent: "#93c5fd",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.82, y: 0.3, scale: 1.1, color: "#93c5fd" }],
  }),
  T("fn-invest-smart", "Invest Smart", "finance", { type: "gradient", c1: "#0f766e", c2: "#042f2e", angle: 135 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#042f2e",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#5eead4",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.8, y: 0.32, scale: 1.2, color: "#5eead4" }],
  }),
  T("fn-cash-flow", "Cash Flow", "finance", { type: "solid", color: "#14532d" }, {
    pattern: "rays", patternColor: "rgba(250,204,21,0.14)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "bignumber", x: 0.8, y: 0.42, scale: 1.5, color: "#facc15" }],
  }),
  T("fn-wealth-code", "Wealth Code", "finance", { type: "solid", color: "#0c0a09" }, {
    textPos: "center", textColor: "#fbbf24", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#fbbf24", width: 12 }],
  }),
  T("fn-market-crash", "Market Crash", "finance", { type: "gradient", c1: "#450a0a", c2: "#0a0a0a", angle: 120 }, {
    badge: "stamp", badgeColor: "#ef4444", badgeTextColor: "#ffffff",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#ef4444",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.35, rotation: 130, scale: 1.4, color: "#ef4444" }],
  }),
  // ------------------------------------------------------------------
  // Tech & AI (12)
  // ------------------------------------------------------------------
  T("tc-ai-revolution", "AI Revolution", "tech", { type: "gradient", c1: "#1d4ed8", c2: "#4c1d95", angle: 135 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#1e1b4b", accent: "#22d3ee",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.5, r: 0.5, color: "#22d3ee" }],
  }),
  T("tc-circuit-board", "Circuit Board", "tech", { type: "solid", color: "#020617" }, {
    pattern: "grid", patternColor: "rgba(34,211,238,0.18)",
    badge: "pill", badgeColor: "#22d3ee",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#22d3ee",
    iconSide: "right",
  }),
  T("tc-future-drop", "Future Drop", "tech", { type: "gradient", c1: "#22d3ee", c2: "#0e7490", angle: 135 }, {
    badge: "pill", badgeColor: "#0f172a", badgeTextColor: "#ffffff",
    textPos: "left", textColor: "#0f172a", strokeColor: "#22d3ee", accent: "#0f172a",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.3, rotation: -40, scale: 1.1, color: "#0f172a" }],
  }),
  T("tc-code-mode", "Code Mode", "tech", { type: "solid", color: "#0a0a0a" }, {
    pattern: "dots", patternColor: "rgba(74,222,128,0.2)",
    textPos: "left", textColor: "#4ade80", strokeColor: "#000000", accent: "#4ade80",
    iconSide: "right",
    decorations: [{ kind: "frame", color: "#4ade80", width: 8 }],
  }),
  T("tc-robot-rise", "Robot Rise", "tech", { type: "gradient", c1: "#475569", c2: "#0f172a", angle: 140 }, {
    badge: "pill", badgeColor: "#facc15",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.35, r: 0.35, color: "#facc15" }],
  }),
  T("tc-cloud-shift", "Cloud Shift", "tech", { type: "gradient", c1: "#7dd3fc", c2: "#1d4ed8", angle: 120 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#0c4a6e", accent: "#ffffff",
    iconSide: "right",
    decorations: [{ kind: "wave", color: "rgba(255,255,255,0.35)", height: 100 }],
  }),
  T("tc-data-flow", "Data Flow", "tech", { type: "solid", color: "#0b1e3a" }, {
    pattern: "speedlines", patternColor: "rgba(34,211,238,0.14)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#22d3ee",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.74, y: 0.4, rotation: -30, scale: 1.3, color: "#22d3ee" }],
  }),
  T("tc-quantum-leap", "Quantum Leap", "tech", { type: "gradient", c1: "#6d28d9", c2: "#1e1b4b", angle: 135 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#e879f9",
    iconSide: "none",
    decorations: [
      { kind: "starburst", x: 0.84, y: 0.26, r: 0.08, color: "#e879f9" },
      { kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#a855f7" },
    ],
  }),
  T("tc-gadget-lab", "Gadget Lab", "tech", { type: "gradient", c1: "#0d9488", c2: "#134e4a", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#042f2e", accent: "#5eead4",
    iconSide: "right",
    decorations: [{ kind: "frame", color: "#5eead4", width: 10 }],
  }),
  T("tc-prompt-pro", "Prompt Pro", "tech", { type: "solid", color: "#312e81" }, {
    pattern: "dots", patternColor: "rgba(255,255,255,0.12)",
    badge: "pill", badgeColor: "#a78bfa", badgeTextColor: "#1e1b4b",
    textPos: "left", textColor: "#ffffff", strokeColor: "#1e1b4b", accent: "#a78bfa",
    iconSide: "right",
  }),
  T("tc-neural-net", "Neural Net", "tech", { type: "solid", color: "#050510" }, {
    pattern: "dots", patternColor: "rgba(129,140,248,0.3)",
    textPos: "center", textColor: "#c7d2fe", strokeColor: "#000000", accent: "#818cf8",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.5, r: 0.5, color: "#6366f1" }],
  }),
  T("tc-tech-talk", "Tech Talk", "tech", { type: "solid", color: "#1d4ed8" }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.14)",
    badge: "circle", badgeColor: "#facc15", badgeTextColor: "#1d4ed8",
    textPos: "left", textColor: "#ffffff", strokeColor: "#1e3a8a", accent: "#facc15",
    iconSide: "right",
  }),
  // ------------------------------------------------------------------
  // Food & Cooking (14)
  // ------------------------------------------------------------------
  T("fd-tasty-blast", "Tasty Blast", "food", { type: "gradient", c1: "#f97316", c2: "#c2410c", angle: 120 }, {
    badge: "stamp", badgeColor: "#ffffff", badgeTextColor: "#c2410c",
    textPos: "left", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "starburst", x: 0.83, y: 0.28, r: 0.09, color: "#facc15" }],
  }),
  T("fd-recipe-reveal", "Recipe Reveal", "food", { type: "gradient", c1: "#dc2626", c2: "#7f1d1d", angle: 135 }, {
    pattern: "halftone", patternColor: "rgba(255,255,255,0.1)",
    textPos: "center", textColor: "#ffffff", strokeColor: "#450a0a", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.85, y: 0.24, r: 0.08, color: "#facc15" }],
  }),
  T("fd-street-rush", "Street Food Rush", "food", { type: "solid", color: "#facc15" }, {
    pattern: "stripes", patternColor: "rgba(0,0,0,0.07)",
    badge: "stamp", badgeColor: "#dc2626", badgeTextColor: "#ffffff",
    textPos: "left", textColor: "#111111", strokeColor: "#facc15", accent: "#dc2626",
    iconSide: "right",
    decorations: [{ kind: "exclaim", x: 0.83, y: 0.3, scale: 1.1, color: "#dc2626" }],
  }),
  T("fd-chef-special", "Chef's Special", "food", { type: "gradient", c1: "#450a0a", c2: "#1c0a00", angle: 140 }, {
    textPos: "center", textColor: "#fbbf24", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#fbbf24", width: 12 }],
  }),
  T("fd-spicy-alert", "Spicy Alert", "food", { type: "gradient", c1: "#ef4444", c2: "#991b1b", angle: 110 }, {
    pattern: "halftone", patternColor: "rgba(0,0,0,0.15)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#450a0a", accent: "#facc15",
    iconSide: "right",
    decorations: [
      { kind: "exclaim", x: 0.82, y: 0.28, scale: 1.2, color: "#facc15" },
      { kind: "glow", x: 0.5, y: 0.5, r: 0.4, color: "#f97316" },
    ],
  }),
  T("fd-sweet-cravings", "Sweet Cravings", "food", { type: "gradient", c1: "#ec4899", c2: "#9d174d", angle: 135 }, {
    badge: "circle", badgeColor: "#ffffff", badgeTextColor: "#9d174d",
    textPos: "center", textColor: "#ffffff", strokeColor: "#500f28", accent: "#fbcfe8",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#f9a8d4" }],
  }),
  T("fd-fresh-daily", "Fresh Daily", "food", { type: "gradient", c1: "#22c55e", c2: "#14532d", angle: 135 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#14532d",
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#bbf7d0",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.82, y: 0.3, scale: 1.1, color: "#bbf7d0" }],
  }),
  T("fd-foodie-find", "Foodie Find", "food", { type: "solid", color: "#ea580c" }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.16)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "circle", x: 0.8, y: 0.35, r: 0.09, color: "#facc15", width: 12 }],
  }),
  T("fd-midnight-snack", "Midnight Snack", "food", { type: "solid", color: "#0c0a09" }, {
    textPos: "center", textColor: "#fdba74", strokeColor: "#000000", accent: "#f97316",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.55, r: 0.45, color: "#f97316" }],
  }),
  T("fd-grand-feast", "Grand Feast", "food", { type: "gradient", c1: "#fbbf24", c2: "#b45309", angle: 135 }, {
    textPos: "center", textColor: "#451a03", strokeColor: "#fbbf24", accent: "#451a03",
    iconSide: "none",
    decorations: [
      { kind: "starburst", x: 0.15, y: 0.24, r: 0.07, color: "#dc2626" },
      { kind: "starburst", x: 0.86, y: 0.72, r: 0.07, color: "#dc2626" },
    ],
  }),
  T("fd-quick-bites", "Quick Bites", "food", { type: "solid", color: "#fde047" }, {
    textPos: "left", textColor: "#111111", strokeColor: "#fde047", accent: "#dc2626",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.7, y: 0.35, rotation: -35, scale: 1.2, color: "#dc2626" }],
  }),
  T("fd-taste-test", "Taste Test", "food", { type: "gradient", c1: "#dc2626", c2: "#f8fafc", angle: 90 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#450a0a", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#f8fafc", ratio: 0.5, diagonal: true },
      { kind: "vs", x: 0.5, y: 0.5, scale: 1 },
    ],
  }),
  T("fd-home-cooked", "Home Cooked", "food", { type: "solid", color: "#fef3c7" }, {
    badge: "stamp", badgeColor: "#b45309", badgeTextColor: "#fef3c7",
    textPos: "center", textColor: "#451a03", strokeColor: "#fef3c7", accent: "#b45309",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#b45309", width: 8 }],
  }),
  T("fd-dessert-drop", "Dessert Drop", "food", { type: "gradient", c1: "#a855f7", c2: "#ec4899", angle: 135 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#9d174d",
    textPos: "left", textColor: "#ffffff", strokeColor: "#500f28", accent: "#fbcfe8",
    iconSide: "right",
    decorations: [{ kind: "starburst", x: 0.83, y: 0.28, r: 0.08, color: "#fde047" }],
  }),
  // ------------------------------------------------------------------
  // Travel (14)
  // ------------------------------------------------------------------
  T("tv-wanderlust", "Wanderlust", "travel", { type: "gradient", c1: "#38bdf8", c2: "#1d4ed8", angle: 120 }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.16)",
    textPos: "center", headlineScale: 1.15, textColor: "#ffffff", strokeColor: "#0c4a6e",
    accent: "#facc15", iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.86, y: 0.24, r: 0.08, color: "#facc15" }],
  }),
  T("tv-sunset-escape", "Sunset Escape", "travel", { type: "gradient", c1: "#fb923c", c2: "#7c2d12", angle: 110 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#431407", accent: "#fde047",
    iconSide: "right",
    decorations: [{ kind: "glow", x: 0.75, y: 0.35, r: 0.35, color: "#fde047" }],
  }),
  T("tv-island-vibes", "Island Vibes", "travel", { type: "gradient", c1: "#2dd4bf", c2: "#0e7490", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#134e4a", accent: "#fef08a",
    iconSide: "right",
    decorations: [{ kind: "wave", color: "rgba(255,255,255,0.35)", height: 110 }],
  }),
  T("tv-mountain-call", "Mountain Call", "travel", { type: "gradient", c1: "#1e3a8a", c2: "#0f172a", angle: 140 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#1e3a8a",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#93c5fd",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#93c5fd", width: 10 }],
  }),
  T("tv-city-lights", "City Lights", "travel", { type: "solid", color: "#0a0a0a" }, {
    pattern: "dots", patternColor: "rgba(250,204,21,0.25)",
    textPos: "left", textColor: "#facc15", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "glow", x: 0.72, y: 0.4, r: 0.35, color: "#facc15" }],
  }),
  T("tv-road-trip", "Road Trip", "travel", { type: "solid", color: "#f97316" }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.18)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#111111",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.7, y: 0.4, rotation: -20, scale: 1.3, color: "#111111" }],
  }),
  T("tv-hidden-gem", "Hidden Gem", "travel", { type: "gradient", c1: "#0d9488", c2: "#042f2e", angle: 135 }, {
    badge: "circle", badgeColor: "#facc15", badgeTextColor: "#042f2e",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "circle", x: 0.5, y: 0.24, r: 0.07, color: "#facc15", width: 10 }],
  }),
  T("tv-passport-ready", "Passport Ready", "travel", { type: "solid", color: "#1e3a8a" }, {
    badge: "stamp", badgeColor: "#facc15", badgeTextColor: "#1e3a8a",
    pattern: "grid", patternColor: "rgba(255,255,255,0.08)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#172554", accent: "#facc15",
    iconSide: "right",
  }),
  T("tv-adventure", "Adventure Awaits", "travel", { type: "gradient", c1: "#16a34a", c2: "#052e16", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.32, rotation: -40, scale: 1.2, color: "#facc15" }],
  }),
  T("tv-beach-mode", "Beach Mode", "travel", { type: "gradient", c1: "#22d3ee", c2: "#0284c7", angle: 120 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#0284c7",
    textPos: "left", textColor: "#ffffff", strokeColor: "#0c4a6e", accent: "#fef08a",
    iconSide: "right",
    decorations: [{ kind: "wave", color: "rgba(255,255,255,0.4)", height: 90 }],
  }),
  T("tv-diaries", "Travel Diaries", "travel", { type: "photo" }, {
    badge: "ribbon", badgeColor: "#facc15", badgeTextColor: "#111111",
    textPos: "bottom-left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
  }),
  T("tv-explore-more", "Explore More", "travel", { type: "gradient", c1: "#7c3aed", c2: "#f97316", angle: 115 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#3b0a1e", accent: "#fde047",
    iconSide: "none",
    decorations: [
      { kind: "starburst", x: 0.85, y: 0.26, r: 0.08, color: "#fde047" },
      { kind: "glow", x: 0.5, y: 0.6, r: 0.4, color: "#f97316" },
    ],
  }),
  T("tv-journey-on", "Journey On", "travel", { type: "solid", color: "#0c1a3a" }, {
    pattern: "speedlines", patternColor: "rgba(147,197,253,0.14)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#93c5fd",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.4, rotation: -25, scale: 1.3, color: "#93c5fd" }],
  }),
  T("tv-vacation-mode", "Vacation Mode", "travel", { type: "gradient", c1: "#fde047", c2: "#f59e0b", angle: 135 }, {
    badge: "pill", badgeColor: "#0f172a", badgeTextColor: "#ffffff",
    textPos: "center", textColor: "#111111", strokeColor: "#fde047", accent: "#0f172a",
    iconSide: "none",
  }),
  // ------------------------------------------------------------------
  // Fitness (12)
  // ------------------------------------------------------------------
  T("ft-beast-mode", "Beast Mode", "fitness", { type: "solid", color: "#111111" }, {
    textPos: "left", headlineScale: 1.15, textColor: "#facc15", strokeColor: "#000000",
    accent: "#facc15", iconSide: "none",
    decorations: [
      { kind: "split", color: "#facc15", ratio: 0.38, diagonal: true },
      { kind: "exclaim", x: 0.2, y: 0.42, scale: 1.4, color: "#111111" },
    ],
  }),
  T("ft-no-excuses", "No Excuses", "fitness", { type: "gradient", c1: "#dc2626", c2: "#0a0a0a", angle: 130 }, {
    badge: "stamp", badgeColor: "#ffffff", badgeTextColor: "#dc2626",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "cross", x: 0.85, y: 0.3, scale: 1.1, color: "#facc15" }],
  }),
  T("ft-shred-plan", "Shred Plan", "fitness", { type: "solid", color: "#1c1917" }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#f97316",
    iconSide: "none",
    decorations: [
      { kind: "progressbar", progress: 0.65, color: "#f97316", trackColor: "rgba(255,255,255,0.2)" },
      { kind: "arrow", x: 0.7, y: 0.3, rotation: -50, scale: 1.1, color: "#f97316" },
    ],
  }),
  T("ft-power-hour", "Power Hour", "fitness", { type: "solid", color: "#facc15" }, {
    pattern: "speedlines", patternColor: "rgba(0,0,0,0.08)",
    textPos: "left", textColor: "#111111", strokeColor: "#facc15", accent: "#111111",
    iconSide: "right",
    decorations: [{ kind: "bignumber", x: 0.8, y: 0.4, scale: 1.4, color: "#111111" }],
  }),
  T("ft-gym-grind", "Gym Grind", "fitness", { type: "gradient", c1: "#292524", c2: "#0c0a09", angle: 140 }, {
    textPos: "left", textColor: "#e7e5e4", strokeColor: "#000000", accent: "#f97316",
    iconSide: "right",
    decorations: [{ kind: "frame", color: "#f97316", width: 10 }],
  }),
  T("ft-30day-shred", "30 Day Shred", "fitness", { type: "gradient", c1: "#f97316", c2: "#9a3412", angle: 120 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#431407", accent: "#fde047",
    iconSide: "none",
    decorations: [
      { kind: "bignumber", x: 0.82, y: 0.42, scale: 1.6, color: "#fde047" },
      { kind: "progressbar", progress: 0.4, color: "#fde047", trackColor: "rgba(255,255,255,0.25)" },
    ],
  }),
  T("ft-cardio-blast", "Cardio Blast", "fitness", { type: "solid", color: "#dc2626" }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.14)",
    textPos: "center", textColor: "#ffffff", strokeColor: "#7f1d1d", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "exclaim", x: 0.5, y: 0.24, scale: 1.2, color: "#facc15" }],
  }),
  T("ft-strength-code", "Strength Code", "fitness", { type: "solid", color: "#0a0a0a" }, {
    textPos: "center", textColor: "#fbbf24", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#fbbf24", width: 12 }],
  }),
  T("ft-run-wild", "Run Wild", "fitness", { type: "solid", color: "#052e16" }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#4ade80",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#4ade80", ratio: 0.4, diagonal: true },
      { kind: "arrow", x: 0.7, y: 0.4, rotation: -30, scale: 1.4, color: "#052e16" },
    ],
  }),
  T("ft-hiit-storm", "HIIT Storm", "fitness", { type: "gradient", c1: "#7c3aed", c2: "#dc2626", angle: 125 }, {
    pattern: "speedlines", patternColor: "rgba(255,255,255,0.12)",
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#7c3aed",
    textPos: "left", textColor: "#ffffff", strokeColor: "#2b0a54", accent: "#facc15",
    iconSide: "right",
  }),
  T("ft-flex-friday", "Flex Friday", "fitness", { type: "photo" }, {
    badge: "pill", badgeColor: "#facc15", badgeTextColor: "#111111",
    textPos: "bottom-left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
  }),
  T("ft-mind-muscle", "Mind Muscle", "fitness", { type: "gradient", c1: "#0f766e", c2: "#0a0a0a", angle: 135 }, {
    textPos: "center", textColor: "#5eead4", strokeColor: "#000000", accent: "#5eead4",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#0d9488" }],
  }),
  // ------------------------------------------------------------------
  // Podcast & Vlog (12)
  // ------------------------------------------------------------------
  T("pd-mic-drop", "Mic Drop", "podcast", { type: "gradient", c1: "#7c3aed", c2: "#2e1065", angle: 135 }, {
    badge: "circle", badgeColor: "#facc15", badgeTextColor: "#2e1065",
    textPos: "left", textColor: "#ffffff", strokeColor: "#1e1b4b", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "glow", x: 0.5, y: 0.5, r: 0.4, color: "#a855f7" }],
  }),
  T("pd-talk-daily", "Talk Daily", "podcast", { type: "gradient", c1: "#ec4899", c2: "#831843", angle: 135 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#831843",
    textPos: "left", textColor: "#ffffff", strokeColor: "#500f28", accent: "#fbcfe8",
    iconSide: "right",
  }),
  T("pd-deep-dive", "Deep Dive", "podcast", { type: "solid", color: "#1e1b4b" }, {
    textPos: "center", textColor: "#c4b5fd", strokeColor: "#000000", accent: "#a78bfa",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.4, r: 0.4, color: "#7c3aed" }],
  }),
  T("pd-story-time", "Story Time", "podcast", { type: "gradient", c1: "#f59e0b", c2: "#b45309", angle: 130 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#451a03", accent: "#fef3c7",
    iconSide: "right",
    decorations: [{ kind: "frame", color: "#fef3c7", width: 10 }],
  }),
  T("pd-voice-notes", "Voice Notes", "podcast", { type: "gradient", c1: "#14b8a6", c2: "#0f766e", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#134e4a", accent: "#ccfbf1",
    iconSide: "right",
    decorations: [{ kind: "wave", color: "rgba(255,255,255,0.3)", height: 80 }],
  }),
  T("pd-guest-star", "Guest Star", "podcast", { type: "solid", color: "#0c0a09" }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.84, y: 0.26, r: 0.09, color: "#facc15" }],
  }),
  T("pd-late-night", "Late Night Cast", "podcast", { type: "gradient", c1: "#0f172a", c2: "#1e1b4b", angle: 140 }, {
    badge: "pill", badgeColor: "#a78bfa", badgeTextColor: "#0f172a",
    textPos: "left", textColor: "#e0e7ff", strokeColor: "#000000", accent: "#a78bfa",
    iconSide: "right",
    decorations: [{ kind: "glow", x: 0.72, y: 0.4, r: 0.3, color: "#a78bfa" }],
  }),
  T("pd-hot-take", "Hot Take", "podcast", { type: "gradient", c1: "#ef4444", c2: "#7f1d1d", angle: 120 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#450a0a", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "exclaim", x: 0.82, y: 0.3, scale: 1.2, color: "#facc15" }],
  }),
  T("pd-mindset-mic", "Mindset Mic", "podcast", { type: "solid", color: "#6d28d9" }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.12)",
    textPos: "center", textColor: "#ffffff", strokeColor: "#2b0a54", accent: "#fde047",
    iconSide: "none",
  }),
  T("pd-creator-chat", "Creator Chat", "podcast", { type: "photo" }, {
    badge: "pill", badgeColor: "#ec4899", badgeTextColor: "#ffffff",
    textPos: "bottom-left", textColor: "#ffffff", strokeColor: "#000000", accent: "#f9a8d4",
    iconSide: "none",
  }),
  T("pd-weekly-wrap", "Weekly Wrap", "podcast", { type: "gradient", c1: "#2563eb", c2: "#1e3a8a", angle: 135 }, {
    badge: "pill", badgeColor: "#93c5fd",
    textPos: "left", textColor: "#ffffff", strokeColor: "#172554", accent: "#bfdbfe",
    iconSide: "right",
  }),
  T("pd-true-story", "True Story", "podcast", { type: "solid", color: "#0a0a0a" }, {
    badge: "stamp", badgeColor: "#ffffff", badgeTextColor: "#0a0a0a",
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "underline", color: "#facc15", width: 14 }],
  }),
  // ------------------------------------------------------------------
  // Education (12)
  // ------------------------------------------------------------------
  T("ed-study-smart", "Study Smart", "education", { type: "gradient", c1: "#2563eb", c2: "#1e3a8a", angle: 135 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#1e3a8a",
    textPos: "left", textColor: "#ffffff", strokeColor: "#172554", accent: "#bfdbfe",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.82, y: 0.3, scale: 1.2, color: "#bfdbfe" }],
  }),
  T("ed-exam-ace", "Exam Ace", "education", { type: "solid", color: "#0f172a" }, {
    pattern: "grid", patternColor: "rgba(147,197,253,0.12)",
    textPos: "center", textColor: "#facc15", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "bignumber", x: 0.5, y: 0.26, scale: 1.3, color: "#facc15" }],
  }),
  T("ed-learn-fast", "Learn Fast", "education", { type: "gradient", c1: "#38bdf8", c2: "#0369a1", angle: 130 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#0c4a6e", accent: "#e0f2fe",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.32, rotation: -45, scale: 1.2, color: "#e0f2fe" }],
  }),
  T("ed-masterclass", "Masterclass", "education", { type: "gradient", c1: "#1c1917", c2: "#0c0a09", angle: 140 }, {
    textPos: "center", textColor: "#fbbf24", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#fbbf24", width: 12 }],
  }),
  T("ed-quick-lesson", "Quick Lesson", "education", { type: "gradient", c1: "#14b8a6", c2: "#115e59", angle: 135 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#115e59",
    textPos: "left", textColor: "#ffffff", strokeColor: "#134e4a", accent: "#99f6e4",
    iconSide: "right",
  }),
  T("ed-brain-boost", "Brain Boost", "education", { type: "gradient", c1: "#7c3aed", c2: "#2e1065", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#1e1b4b", accent: "#ddd6fe",
    iconSide: "right",
    decorations: [{ kind: "glow", x: 0.72, y: 0.4, r: 0.3, color: "#a78bfa" }],
  }),
  T("ed-top-grades", "Top Grades", "education", { type: "gradient", c1: "#16a34a", c2: "#052e16", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#bbf7d0",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.82, y: 0.3, scale: 1.3, color: "#bbf7d0" }],
  }),
  T("ed-skill-sprint", "Skill Sprint", "education", { type: "gradient", c1: "#f97316", c2: "#c2410c", angle: 125 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#fed7aa",
    iconSide: "none",
    decorations: [
      { kind: "progressbar", progress: 0.8, color: "#fed7aa", trackColor: "rgba(255,255,255,0.25)" },
      { kind: "arrow", x: 0.72, y: 0.3, rotation: -45, scale: 1.1, color: "#fed7aa" },
    ],
  }),
  T("ed-zero-hero", "Zero to Hero", "education", { type: "solid", color: "#1d4ed8" }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.14)",
    textPos: "center", textColor: "#ffffff", strokeColor: "#1e3a8a", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.85, y: 0.24, r: 0.08, color: "#facc15" }],
  }),
  T("ed-notes-drop", "Notes Drop", "education", { type: "solid", color: "#fef9c3" }, {
    textPos: "center", textColor: "#1c1917", strokeColor: "#fef9c3", accent: "#ca8a04",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#ca8a04", width: 8 }],
  }),
  T("ed-concept-clear", "Concept Clear", "education", { type: "solid", color: "#ffffff" }, {
    textPos: "center", textColor: "#1d4ed8", strokeColor: "#ffffff", accent: "#1d4ed8",
    iconSide: "none",
    decorations: [{ kind: "underline", color: "#1d4ed8", width: 14 }],
  }),
  T("ed-final-revision", "Final Revision", "education", { type: "gradient", c1: "#dc2626", c2: "#991b1b", angle: 130 }, {
    badge: "stamp", badgeColor: "#ffffff", badgeTextColor: "#991b1b",
    textPos: "left", textColor: "#ffffff", strokeColor: "#450a0a", accent: "#fecaca",
    iconSide: "right",
  }),
  // ------------------------------------------------------------------
  // Challenge & 30-Day (12)
  // ------------------------------------------------------------------
  T("ch-30day-fix", "30 Day Fix", "challenge", { type: "gradient", c1: "#f97316", c2: "#9a3412", angle: 125 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#431407", accent: "#fde047",
    iconSide: "none",
    decorations: [
      { kind: "bignumber", x: 0.82, y: 0.4, scale: 1.7, color: "#fde047" },
      { kind: "progressbar", progress: 0.5, color: "#fde047", trackColor: "rgba(255,255,255,0.25)" },
    ],
  }),
  T("ch-day-one", "Day One", "challenge", { type: "gradient", c1: "#dc2626", c2: "#450a0a", angle: 135 }, {
    badge: "pill", badgeColor: "#facc15",
    textPos: "center", headlineScale: 1.2, textColor: "#ffffff", strokeColor: "#000000",
    accent: "#facc15", iconSide: "none",
  }),
  T("ch-no-quit", "No Quit", "challenge", { type: "solid", color: "#0a0a0a" }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#ef4444",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#ef4444", ratio: 0.35, diagonal: true },
      { kind: "cross", x: 0.2, y: 0.45, scale: 1.3, color: "#0a0a0a" },
    ],
  }),
  T("ch-75-hard", "75 Hard", "challenge", { type: "solid", color: "#111827" }, {
    pattern: "grid", patternColor: "rgba(255,255,255,0.08)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#f97316",
    iconSide: "none",
    decorations: [{ kind: "bignumber", x: 0.82, y: 0.42, scale: 1.7, color: "#f97316" }],
  }),
  T("ch-glow-up", "Glow Up", "challenge", { type: "gradient", c1: "#ec4899", c2: "#7c3aed", angle: 130 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#500f28", accent: "#fde047",
    iconSide: "none",
    decorations: [
      { kind: "starburst", x: 0.85, y: 0.26, r: 0.08, color: "#fde047" },
      { kind: "glow", x: 0.5, y: 0.55, r: 0.45, color: "#f9a8d4" },
    ],
  }),
  T("ch-habit-stack", "Habit Stack", "challenge", { type: "gradient", c1: "#0d9488", c2: "#042f2e", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#042f2e", accent: "#5eead4",
    iconSide: "none",
    decorations: [
      { kind: "progressbar", progress: 0.66, color: "#5eead4", trackColor: "rgba(255,255,255,0.2)" },
      { kind: "check", x: 0.85, y: 0.3, scale: 1, color: "#5eead4" },
    ],
  }),
  T("ch-7day-sprint", "7 Day Sprint", "challenge", { type: "solid", color: "#facc15" }, {
    pattern: "speedlines", patternColor: "rgba(0,0,0,0.08)",
    textPos: "left", textColor: "#111111", strokeColor: "#facc15", accent: "#111111",
    iconSide: "none",
    decorations: [{ kind: "bignumber", x: 0.82, y: 0.42, scale: 1.6, color: "#111111" }],
  }),
  T("ch-level-30", "Level 30", "challenge", { type: "gradient", c1: "#6d28d9", c2: "#1e1b4b", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#e879f9",
    iconSide: "none",
    decorations: [
      { kind: "bignumber", x: 0.82, y: 0.42, scale: 1.6, color: "#e879f9" },
      { kind: "glow", x: 0.5, y: 0.5, r: 0.4, color: "#a855f7" },
    ],
  }),
  T("ch-final-push", "Final Push", "challenge", { type: "gradient", c1: "#b91c1c", c2: "#0a0a0a", angle: 125 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.7, y: 0.38, rotation: -45, scale: 1.4, color: "#facc15" }],
  }),
  T("ch-reset-mode", "Reset Mode", "challenge", { type: "gradient", c1: "#0ea5e9", c2: "#0c4a6e", angle: 135 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#0c4a6e", accent: "#bae6fd",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#38bdf8" }],
  }),
  T("ch-win-streak", "Win Streak", "challenge", { type: "gradient", c1: "#15803d", c2: "#052e16", angle: 130 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.8, y: 0.32, scale: 1.3, color: "#facc15" }],
  }),
  T("ch-day-100", "Day 100", "challenge", { type: "gradient", c1: "#fbbf24", c2: "#92400e", angle: 135 }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.18)",
    textPos: "center", textColor: "#451a03", strokeColor: "#fbbf24", accent: "#451a03",
    iconSide: "none",
    decorations: [{ kind: "bignumber", x: 0.5, y: 0.26, scale: 1.4, color: "#451a03" }],
  }),
  // ------------------------------------------------------------------
  // News & Commentary (12)
  // ------------------------------------------------------------------
  T("nw-breaking-live", "Breaking Live", "news", { type: "solid", color: "#b91c1c" }, {
    badge: "corner", badgeColor: "#111111", badgeTextColor: "#ffffff",
    textPos: "left", headlineScale: 1.1, textColor: "#ffffff", strokeColor: "#450a0a",
    accent: "#facc15", iconSide: "right",
    decorations: [{ kind: "exclaim", x: 0.83, y: 0.3, scale: 1.1, color: "#facc15" }],
  }),
  T("nw-top-story", "Top Story", "news", { type: "solid", color: "#0a0a0a" }, {
    badge: "stamp", badgeColor: "#dc2626", badgeTextColor: "#ffffff",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.68, y: 0.7, rotation: -30, scale: 1, color: "#facc15" }],
  }),
  T("nw-alert-desk", "Alert Desk", "news", { type: "solid", color: "#f8fafc" }, {
    pattern: "stripes", patternColor: "rgba(220,38,38,0.08)",
    textPos: "left", textColor: "#b91c1c", strokeColor: "#ffffff", accent: "#111111",
    iconSide: "right",
    decorations: [{ kind: "exclaim", x: 0.83, y: 0.3, scale: 1.2, color: "#b91c1c" }],
  }),
  T("nw-night-report", "Night Report", "news", { type: "gradient", c1: "#0f172a", c2: "#1e3a8a", angle: 140 }, {
    textPos: "left", textColor: "#e0e7ff", strokeColor: "#000000", accent: "#93c5fd",
    iconSide: "right",
    decorations: [{ kind: "glow", x: 0.72, y: 0.4, r: 0.3, color: "#3b82f6" }],
  }),
  T("nw-fact-check", "Fact Check", "news", { type: "gradient", c1: "#1d4ed8", c2: "#172554", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#172554", accent: "#4ade80",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.82, y: 0.3, scale: 1.3, color: "#4ade80" }],
  }),
  T("nw-exclusive", "Exclusive", "news", { type: "solid", color: "#0c0a09" }, {
    textPos: "center", textColor: "#fbbf24", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#fbbf24", width: 12 }],
  }),
  T("nw-debate-night", "Debate Night", "news", { type: "gradient", c1: "#991b1b", c2: "#1e3a8a", angle: 90 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#1e3a8a", ratio: 0.5, diagonal: true },
      { kind: "vs", x: 0.5, y: 0.5, scale: 1 },
    ],
  }),
  T("nw-headlines", "Headlines", "news", { type: "solid", color: "#ffffff" }, {
    textPos: "left", textColor: "#111111", strokeColor: "#ffffff", accent: "#dc2626",
    iconSide: "right",
    decorations: [{ kind: "underline", color: "#dc2626", width: 14 }],
  }),
  T("nw-crisis-watch", "Crisis Watch", "news", { type: "gradient", c1: "#7f1d1d", c2: "#0a0a0a", angle: 120 }, {
    badge: "corner", badgeColor: "#facc15", badgeTextColor: "#111111",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "exclaim", x: 0.82, y: 0.32, scale: 1.2, color: "#facc15" }],
  }),
  T("nw-morning-brief", "Morning Brief", "news", { type: "solid", color: "#fef3c7" }, {
    textPos: "left", textColor: "#1c1917", strokeColor: "#fef3c7", accent: "#b45309",
    iconSide: "right",
    decorations: [{ kind: "frame", color: "#b45309", width: 8 }],
  }),
  T("nw-insider-scoop", "Insider Scoop", "news", { type: "gradient", c1: "#4c1d95", c2: "#1e1b4b", angle: 135 }, {
    badge: "circle", badgeColor: "#facc15", badgeTextColor: "#1e1b4b",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "circle", x: 0.8, y: 0.35, r: 0.08, color: "#facc15", width: 12 }],
  }),
  T("nw-verdict", "Verdict", "news", { type: "solid", color: "#0a0a0a" }, {
    badge: "stamp", badgeColor: "#ffffff", badgeTextColor: "#0a0a0a",
    textPos: "center", headlineScale: 1.2, textColor: "#ffffff", strokeColor: "#000000",
    accent: "#facc15", iconSide: "none",
  }),
  // ------------------------------------------------------------------
  // Minimal & Clean (12)
  // ------------------------------------------------------------------
  T("mn-clean-type", "Clean Type", "minimal", { type: "solid", color: "#fafaf9" }, {
    textPos: "center", textColor: "#1c1917", strokeColor: "#fafaf9", accent: "#1c1917",
    iconSide: "none",
  }),
  T("mn-soft-beige", "Soft Beige", "minimal", { type: "solid", color: "#f5f0e8" }, {
    textPos: "center", textColor: "#292524", strokeColor: "#f5f0e8", accent: "#a8a29e",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#a8a29e", width: 6 }],
  }),
  T("mn-mono-line", "Mono Line", "minimal", { type: "solid", color: "#ffffff" }, {
    textPos: "left", textColor: "#111111", strokeColor: "#ffffff", accent: "#111111",
    iconSide: "none",
    decorations: [{ kind: "underline", color: "#111111", width: 10 }],
  }),
  T("mn-quiet-luxury", "Quiet Luxury", "minimal", { type: "solid", color: "#faf7f0" }, {
    textPos: "center", textColor: "#3f3f46", strokeColor: "#faf7f0", accent: "#b45309",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#b45309", width: 6 }],
  }),
  T("mn-paper-note", "Paper Note", "minimal", { type: "solid", color: "#fefce8" }, {
    badge: "stamp", badgeColor: "#a8a29e", badgeTextColor: "#fefce8",
    textPos: "left", textColor: "#44403c", strokeColor: "#fefce8", accent: "#78716c",
    iconSide: "none",
  }),
  T("mn-simple-bold", "Simple Bold", "minimal", { type: "solid", color: "#e7e5e4" }, {
    textPos: "center", headlineScale: 1.15, textColor: "#1c1917", strokeColor: "#e7e5e4",
    accent: "#1c1917", iconSide: "none",
  }),
  T("mn-airy", "Airy", "minimal", { type: "solid", color: "#ffffff" }, {
    textPos: "center", textColor: "#334155", strokeColor: "#ffffff", accent: "#94a3b8",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#cbd5e1", width: 6 }],
  }),
  T("mn-calm-space", "Calm Space", "minimal", { type: "solid", color: "#ecfdf5" }, {
    textPos: "center", textColor: "#064e3b", strokeColor: "#ecfdf5", accent: "#059669",
    iconSide: "none",
  }),
  T("mn-studio", "Studio", "minimal", { type: "solid", color: "#27272a" }, {
    textPos: "center", textColor: "#fafafa", strokeColor: "#27272a", accent: "#d4d4d8",
    iconSide: "none",
  }),
  T("mn-grid-paper", "Grid Paper", "minimal", { type: "solid", color: "#ffffff" }, {
    pattern: "grid", patternColor: "rgba(100,116,139,0.15)",
    textPos: "left", textColor: "#1e293b", strokeColor: "#ffffff", accent: "#475569",
    iconSide: "none",
  }),
  T("mn-letter", "Letter", "minimal", { type: "solid", color: "#fffbeb" }, {
    badge: "ribbon", badgeColor: "#b45309", badgeTextColor: "#fffbeb",
    textPos: "center", textColor: "#451a03", strokeColor: "#fffbeb", accent: "#b45309",
    iconSide: "none",
  }),
  T("mn-focus", "Focus", "minimal", { type: "solid", color: "#0a0a0a" }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#0a0a0a", accent: "#525252",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#525252", width: 8 }],
  }),
  // ------------------------------------------------------------------
  // Marketing & Business (12)
  // ------------------------------------------------------------------
  T("mk-growth-hack", "Growth Hack", "marketing", { type: "gradient", c1: "#2563eb", c2: "#1e3a8a", angle: 135 }, {
    badge: "pill", badgeColor: "#4ade80", badgeTextColor: "#052e16",
    textPos: "left", textColor: "#ffffff", strokeColor: "#172554", accent: "#4ade80",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.35, rotation: -50, scale: 1.4, color: "#4ade80" }],
  }),
  T("mk-brand-boost", "Brand Boost", "marketing", { type: "gradient", c1: "#7c3aed", c2: "#2e1065", angle: 130 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#1e1b4b", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.85, y: 0.24, r: 0.09, color: "#facc15" }],
  }),
  T("mk-sales-surge", "Sales Surge", "marketing", { type: "gradient", c1: "#16a34a", c2: "#052e16", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#052e16", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "bignumber", x: 0.82, y: 0.42, scale: 1.5, color: "#facc15" },
      { kind: "arrow", x: 0.66, y: 0.28, rotation: -55, scale: 1.2, color: "#facc15" },
    ],
  }),
  T("mk-ad-playbook", "Ad Playbook", "marketing", { type: "solid", color: "#f97316" }, {
    pattern: "halftone", patternColor: "rgba(0,0,0,0.12)",
    badge: "stamp", badgeColor: "#111111", badgeTextColor: "#ffffff",
    textPos: "left", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#111111",
    iconSide: "right",
  }),
  T("mk-funnel-fix", "Funnel Fix", "marketing", { type: "gradient", c1: "#0d9488", c2: "#042f2e", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#042f2e", accent: "#5eead4",
    iconSide: "none",
    decorations: [
      { kind: "progressbar", progress: 0.78, color: "#5eead4", trackColor: "rgba(255,255,255,0.2)" },
      { kind: "check", x: 0.85, y: 0.3, scale: 1, color: "#5eead4" },
    ],
  }),
  T("mk-viral-loop", "Viral Loop", "marketing", { type: "gradient", c1: "#ec4899", c2: "#9d174d", angle: 125 }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.14)",
    textPos: "center", textColor: "#ffffff", strokeColor: "#500f28", accent: "#fde047",
    iconSide: "none",
  }),
  T("mk-seo-secrets", "SEO Secrets", "marketing", { type: "solid", color: "#312e81" }, {
    pattern: "dots", patternColor: "rgba(167,139,250,0.25)",
    badge: "pill", badgeColor: "#a78bfa", badgeTextColor: "#1e1b4b",
    textPos: "left", textColor: "#ffffff", strokeColor: "#1e1b4b", accent: "#a78bfa",
    iconSide: "right",
    decorations: [{ kind: "glow", x: 0.72, y: 0.4, r: 0.3, color: "#a78bfa" }],
  }),
  T("mk-launch-day", "Launch Day", "marketing", { type: "gradient", c1: "#ef4444", c2: "#991b1b", angle: 120 }, {
    badge: "pill", badgeColor: "#ffffff", badgeTextColor: "#991b1b",
    textPos: "center", headlineScale: 1.1, textColor: "#ffffff", strokeColor: "#450a0a",
    accent: "#facc15", iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.86, y: 0.24, r: 0.08, color: "#facc15" }],
  }),
  T("mk-content-king", "Content King", "marketing", { type: "solid", color: "#facc15" }, {
    pattern: "stripes", patternColor: "rgba(0,0,0,0.07)",
    textPos: "left", textColor: "#111111", strokeColor: "#facc15", accent: "#111111",
    iconSide: "right",
    decorations: [{ kind: "starburst", x: 0.8, y: 0.3, r: 0.09, color: "#111111" }],
  }),
  T("mk-email-gold", "Email Gold", "marketing", { type: "gradient", c1: "#fbbf24", c2: "#b45309", angle: 135 }, {
    textPos: "center", textColor: "#451a03", strokeColor: "#fbbf24", accent: "#451a03",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#451a03", width: 10 }],
  }),
  T("mk-social-proof", "Social Proof", "marketing", { type: "gradient", c1: "#0ea5e9", c2: "#0c4a6e", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#0c4a6e", accent: "#bae6fd",
    iconSide: "right",
    decorations: [{ kind: "check", x: 0.8, y: 0.32, scale: 1.3, color: "#bae6fd" }],
  }),
  T("mk-zero-to-1m", "Zero to 1M", "marketing", { type: "solid", color: "#0a0a0a" }, {
    pattern: "rays", patternColor: "rgba(250,204,21,0.1)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "bignumber", x: 0.82, y: 0.42, scale: 1.5, color: "#facc15" },
      { kind: "arrow", x: 0.66, y: 0.26, rotation: -55, scale: 1.2, color: "#facc15" },
    ],
  }),
  // ------------------------------------------------------------------
  // Motivation (12)
  // ------------------------------------------------------------------
  T("mt-rise-up", "Rise Up", "motivation", { type: "gradient", c1: "#fb923c", c2: "#7c2d12", angle: 110 }, {
    textPos: "center", headlineScale: 1.15, textColor: "#ffffff", strokeColor: "#431407",
    accent: "#fde047", iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.7, r: 0.5, color: "#fde047" }],
  }),
  T("mt-dream-big", "Dream Big", "motivation", { type: "gradient", c1: "#4c1d95", c2: "#0f172a", angle: 135 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#e879f9",
    iconSide: "none",
    decorations: [
      { kind: "starburst", x: 0.85, y: 0.24, r: 0.08, color: "#e879f9" },
      { kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#a855f7" },
    ],
  }),
  T("mt-grind-daily", "Grind Daily", "motivation", { type: "solid", color: "#ea580c" }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.16)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#111111",
    iconSide: "right",
  }),
  T("mt-believe", "Believe", "motivation", { type: "gradient", c1: "#fde047", c2: "#f59e0b", angle: 135 }, {
    textPos: "center", headlineScale: 1.25, textColor: "#451a03", strokeColor: "#fde047",
    accent: "#451a03", iconSide: "none",
  }),
  T("mt-unstoppable", "Unstoppable", "motivation", { type: "gradient", c1: "#dc2626", c2: "#450a0a", angle: 125 }, {
    pattern: "speedlines", patternColor: "rgba(255,255,255,0.1)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.35, rotation: -40, scale: 1.3, color: "#facc15" }],
  }),
  T("mt-new-chapter", "New Chapter", "motivation", { type: "gradient", c1: "#14b8a6", c2: "#134e4a", angle: 135 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#042f2e", accent: "#99f6e4",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#99f6e4", width: 10 }],
  }),
  T("mt-mind-over", "Mind Over", "motivation", { type: "gradient", c1: "#312e81", c2: "#0f172a", angle: 140 }, {
    textPos: "center", textColor: "#c7d2fe", strokeColor: "#000000", accent: "#818cf8",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.45, r: 0.4, color: "#6366f1" }],
  }),
  T("mt-hustle-heart", "Hustle Heart", "motivation", { type: "gradient", c1: "#f43f5e", c2: "#881337", angle: 130 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#4c0519", accent: "#fecdd3",
    iconSide: "right",
    decorations: [{ kind: "underline", color: "#fecdd3", width: 14 }],
  }),
  T("mt-legacy", "Legacy", "motivation", { type: "solid", color: "#0c0a09" }, {
    textPos: "center", headlineScale: 1.2, textColor: "#fbbf24", strokeColor: "#000000",
    accent: "#fbbf24", iconSide: "none",
    decorations: [{ kind: "frame", color: "#fbbf24", width: 12 }],
  }),
  T("mt-morning-fire", "Morning Fire", "motivation", { type: "solid", color: "#f97316" }, {
    pattern: "rays", patternColor: "rgba(253,224,71,0.25)",
    textPos: "center", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#fde047",
    iconSide: "none",
  }),
  T("mt-brave-soul", "Brave Soul", "motivation", { type: "gradient", c1: "#1d4ed8", c2: "#0f172a", angle: 135 }, {
    badge: "circle", badgeColor: "#facc15", badgeTextColor: "#0f172a",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
  }),
  T("mt-limitless", "Limitless", "motivation", { type: "gradient", c1: "#a855f7", c2: "#4c1d95", angle: 135 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#1e1b4b", accent: "#f0abfc",
    iconSide: "none",
    decorations: [
      { kind: "starburst", x: 0.85, y: 0.24, r: 0.08, color: "#f0abfc" },
      { kind: "glow", x: 0.5, y: 0.55, r: 0.45, color: "#d946ef" },
    ],
  }),
  // ------------------------------------------------------------------
  // Sports (12)
  // ------------------------------------------------------------------
  T("sp-match-day", "Match Day", "sports", { type: "gradient", c1: "#15803d", c2: "#052e16", angle: 135 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#052e16", accent: "#facc15",
    iconSide: "none",
    decorations: [{ kind: "vs", x: 0.5, y: 0.28, scale: 0.9 }],
  }),
  T("sp-game-changer", "Game Changer", "sports", { type: "solid", color: "#0a0a0a" }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#4ade80",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#4ade80", ratio: 0.35, diagonal: true },
      { kind: "arrow", x: 0.7, y: 0.38, rotation: -45, scale: 1.3, color: "#052e16" },
    ],
  }),
  T("sp-final-whistle", "Final Whistle", "sports", { type: "gradient", c1: "#1f2937", c2: "#030712", angle: 140 }, {
    badge: "stamp", badgeColor: "#facc15", badgeTextColor: "#030712",
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "right",
    decorations: [{ kind: "exclaim", x: 0.83, y: 0.3, scale: 1.1, color: "#facc15" }],
  }),
  T("sp-champion", "Champion", "sports", { type: "gradient", c1: "#fbbf24", c2: "#92400e", angle: 135 }, {
    pattern: "rays", patternColor: "rgba(255,255,255,0.2)",
    textPos: "center", headlineScale: 1.2, textColor: "#451a03", strokeColor: "#fbbf24",
    accent: "#451a03", iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.86, y: 0.24, r: 0.08, color: "#dc2626" }],
  }),
  T("sp-derby-day", "Derby Day", "sports", { type: "gradient", c1: "#dc2626", c2: "#1e3a8a", angle: 90 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "split", color: "#1e3a8a", ratio: 0.5, diagonal: true },
      { kind: "vs", x: 0.5, y: 0.52, scale: 1.1 },
    ],
  }),
  T("sp-training-camp", "Training Camp", "sports", { type: "gradient", c1: "#57534e", c2: "#1c1917", angle: 140 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#facc15",
    iconSide: "none",
    decorations: [
      { kind: "progressbar", progress: 0.7, color: "#facc15", trackColor: "rgba(255,255,255,0.2)" },
    ],
  }),
  T("sp-sprint-king", "Sprint King", "sports", { type: "solid", color: "#facc15" }, {
    pattern: "speedlines", patternColor: "rgba(0,0,0,0.1)",
    textPos: "left", textColor: "#111111", strokeColor: "#facc15", accent: "#111111",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.7, y: 0.4, rotation: -25, scale: 1.4, color: "#111111" }],
  }),
  T("sp-underdog", "Underdog", "sports", { type: "gradient", c1: "#6d28d9", c2: "#1e1b4b", angle: 135 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#000000", accent: "#e879f9",
    iconSide: "right",
    decorations: [{ kind: "glow", x: 0.72, y: 0.4, r: 0.3, color: "#a855f7" }],
  }),
  T("sp-trophy-lift", "Trophy Lift", "sports", { type: "gradient", c1: "#fde047", c2: "#ca8a04", angle: 130 }, {
    textPos: "center", textColor: "#422006", strokeColor: "#fde047", accent: "#422006",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#fef08a" }],
  }),
  T("sp-defense-wall", "Defense Wall", "sports", { type: "solid", color: "#172554" }, {
    pattern: "grid", patternColor: "rgba(147,197,253,0.14)",
    textPos: "left", textColor: "#ffffff", strokeColor: "#0a0a0a", accent: "#93c5fd",
    iconSide: "right",
    decorations: [{ kind: "frame", color: "#93c5fd", width: 10 }],
  }),
  T("sp-comeback", "Comeback", "sports", { type: "gradient", c1: "#f97316", c2: "#7c2d12", angle: 125 }, {
    textPos: "left", textColor: "#ffffff", strokeColor: "#431407", accent: "#fde047",
    iconSide: "right",
    decorations: [{ kind: "arrow", x: 0.72, y: 0.35, rotation: -50, scale: 1.4, color: "#fde047" }],
  }),
  T("sp-stadium-roar", "Stadium Roar", "sports", { type: "solid", color: "#14532d" }, {
    pattern: "rays", patternColor: "rgba(250,204,21,0.16)",
    badge: "pill", badgeColor: "#facc15", badgeTextColor: "#14532d",
    textPos: "center", textColor: "#ffffff", strokeColor: "#052e16", accent: "#facc15",
    iconSide: "none",
  }),
  // ------------------------------------------------------------------
  // Spiritual & Devotional (12)
  // ------------------------------------------------------------------
  T("dv-divine-light", "Divine Light", "spiritual", { type: "gradient", c1: "#fb923c", c2: "#9a3412", angle: 115 }, {
    textPos: "center", textColor: "#fff7ed", strokeColor: "#431407", accent: "#fde047",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.45, r: 0.45, color: "#fde047" }],
  }),
  T("dv-sacred-chants", "Sacred Chants", "spiritual", { type: "gradient", c1: "#7f1d1d", c2: "#450a0a", angle: 140 }, {
    textPos: "center", textColor: "#fde68a", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#fbbf24", width: 12 }],
  }),
  T("dv-morning-aarti", "Morning Aarti", "spiritual", { type: "solid", color: "#f97316" }, {
    pattern: "rays", patternColor: "rgba(255,247,237,0.25)",
    textPos: "center", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#7c2d12",
    iconSide: "none",
  }),
  T("dv-temple-trails", "Temple Trails", "spiritual", { type: "gradient", c1: "#fbbf24", c2: "#92400e", angle: 135 }, {
    textPos: "center", textColor: "#451a03", strokeColor: "#fbbf24", accent: "#451a03",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#451a03", width: 10 }],
  }),
  T("dv-peace-within", "Peace Within", "spiritual", { type: "gradient", c1: "#0d9488", c2: "#134e4a", angle: 135 }, {
    textPos: "center", textColor: "#fef3c7", strokeColor: "#042f2e", accent: "#fde047",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.5, r: 0.45, color: "#5eead4" }],
  }),
  T("dv-bhakti-beats", "Bhakti Beats", "spiritual", { type: "gradient", c1: "#991b1b", c2: "#450a0a", angle: 130 }, {
    textPos: "center", textColor: "#fecaca", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.85, y: 0.24, r: 0.08, color: "#fbbf24" }],
  }),
  T("dv-holy-journey", "Holy Journey", "spiritual", { type: "gradient", c1: "#6d28d9", c2: "#f59e0b", angle: 120 }, {
    textPos: "center", textColor: "#ffffff", strokeColor: "#3b0a1e", accent: "#fde047",
    iconSide: "none",
    decorations: [{ kind: "glow", x: 0.5, y: 0.6, r: 0.4, color: "#fbbf24" }],
  }),
  T("dv-mantra-magic", "Mantra Magic", "spiritual", { type: "solid", color: "#1c0a00" }, {
    textPos: "center", textColor: "#fbbf24", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
    decorations: [{ kind: "circle", x: 0.5, y: 0.26, r: 0.08, color: "#fbbf24", width: 12 }],
  }),
  T("dv-festival-glow", "Festival Glow", "spiritual", { type: "gradient", c1: "#f97316", c2: "#dc2626", angle: 120 }, {
    pattern: "halftone", patternColor: "rgba(255,255,255,0.12)",
    textPos: "center", textColor: "#ffffff", strokeColor: "#7c2d12", accent: "#fde047",
    iconSide: "none",
    decorations: [{ kind: "starburst", x: 0.85, y: 0.24, r: 0.08, color: "#fde047" }],
  }),
  T("dv-spiritual-path", "Spiritual Path", "spiritual", { type: "photo" }, {
    badge: "pill", badgeColor: "#fbbf24", badgeTextColor: "#451a03",
    textPos: "bottom-left", textColor: "#ffffff", strokeColor: "#000000", accent: "#fbbf24",
    iconSide: "none",
  }),
  T("dv-divine-grace", "Divine Grace", "spiritual", { type: "solid", color: "#fffbeb" }, {
    textPos: "center", textColor: "#92400e", strokeColor: "#fffbeb", accent: "#b45309",
    iconSide: "none",
    decorations: [{ kind: "frame", color: "#b45309", width: 8 }],
  }),
  T("dv-sacred-wisdom", "Sacred Wisdom", "spiritual", { type: "solid", color: "#7f1d1d" }, {
    pattern: "rays", patternColor: "rgba(251,191,36,0.14)",
    textPos: "center", textColor: "#fde68a", strokeColor: "#450a0a", accent: "#fbbf24",
    iconSide: "none",
  }),
];
