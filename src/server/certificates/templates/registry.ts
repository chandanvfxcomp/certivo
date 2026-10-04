// src/server/certificates/templates/registry.ts
//
// The 10-template catalog: 1 free + 9 premium.
// Prices are one-time unlock fees per institute (paise).
import type { TemplateMeta, TemplateRenderer } from "./types";

export const TEMPLATE_CATALOG: TemplateMeta[] = [
  {
    id: "classic-simple",
    name: "Classic Simple",
    blurb: "Clean and timeless — perfect for everyday certificates.",
    tier: "free",
    pricePaise: 0,
    accent: "Navy",
  },
  {
    id: "royal-heritage",
    name: "Royal Heritage",
    blurb: "Ornate navy & gold with side panel, medal and seal.",
    tier: "premium",
    pricePaise: 49900,
    accent: "Navy + Gold",
  },
  {
    id: "emerald-prestige",
    name: "Emerald Prestige",
    blurb: "Deep emerald green with gold flourishes.",
    tier: "premium",
    pricePaise: 49900,
    accent: "Emerald + Gold",
  },
  {
    id: "crimson-laurel",
    name: "Crimson Laurel",
    blurb: "Rich maroon with laurel wreath and gold seal.",
    tier: "premium",
    pricePaise: 49900,
    accent: "Maroon + Gold",
  },
  {
    id: "midnight-silver",
    name: "Midnight Silver",
    blurb: "Dark midnight blue with elegant silver lines.",
    tier: "premium",
    pricePaise: 49900,
    accent: "Midnight + Silver",
  },
  {
    id: "ivory-vintage",
    name: "Ivory Vintage",
    blurb: "Parchment texture with classic vintage serif.",
    tier: "premium",
    pricePaise: 49900,
    accent: "Ivory + Bronze",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal Pro",
    blurb: "Sharp geometric layout in teal and slate.",
    tier: "premium",
    pricePaise: 49900,
    accent: "Teal + Slate",
  },
  {
    id: "noir-gold",
    name: "Noir Gold",
    blurb: "Bold black & gold luxury statement.",
    tier: "premium",
    pricePaise: 79900,
    accent: "Black + Gold",
  },
  {
    id: "ocean-wave",
    name: "Ocean Wave",
    blurb: "Flowing blue waves with a fresh modern feel.",
    tier: "premium",
    pricePaise: 49900,
    accent: "Ocean Blue",
  },
  {
    id: "platinum-elite",
    name: "Platinum Elite",
    blurb: "Our most premium — platinum silver on deep navy.",
    tier: "premium",
    pricePaise: 99900,
    accent: "Platinum",
  },
];

export const FREE_TEMPLATE_ID = "classic-simple";
export const DEFAULT_TEMPLATE_ID = "classic-simple";

export function getTemplateMeta(id: string): TemplateMeta {
  return TEMPLATE_CATALOG.find((t) => t.id === id) ?? TEMPLATE_CATALOG[0]!;
}

export function isTemplateId(id: string): boolean {
  return TEMPLATE_CATALOG.some((t) => t.id === id);
}

// Renderers are wired in ./index.ts to avoid circular imports.
export type { TemplateRenderer };
