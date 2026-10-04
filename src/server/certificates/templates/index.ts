// src/server/certificates/templates/index.ts
//
// Wires template ids to their renderers.
import type { TemplateRenderer } from "./types";
import { renderClassicSimple } from "./classic-simple";
import { renderRoyalHeritage } from "./royal-heritage";
import { renderEmeraldPrestige } from "./emerald-prestige";
import { renderCrimsonLaurel } from "./crimson-laurel";
import { renderMidnightSilver } from "./midnight-silver";
import { renderIvoryVintage } from "./ivory-vintage";
import { renderModernMinimal } from "./modern-minimal";
import { renderNoirGold } from "./noir-gold";
import { renderOceanWave } from "./ocean-wave";
import { renderPlatinumElite } from "./platinum-elite";

export const TEMPLATE_RENDERERS: Record<string, TemplateRenderer> = {
  "classic-simple": renderClassicSimple,
  "royal-heritage": renderRoyalHeritage,
  "emerald-prestige": renderEmeraldPrestige,
  "crimson-laurel": renderCrimsonLaurel,
  "midnight-silver": renderMidnightSilver,
  "ivory-vintage": renderIvoryVintage,
  "modern-minimal": renderModernMinimal,
  "noir-gold": renderNoirGold,
  "ocean-wave": renderOceanWave,
  "platinum-elite": renderPlatinumElite,
};

export function getTemplateRenderer(id: string): TemplateRenderer {
  return TEMPLATE_RENDERERS[id] ?? renderClassicSimple;
}
