import { PURITY } from "./types";

/**
 * Pricing engine per SPEC §6.
 * Pure functions — no side effects, no DB access.
 *
 * metal_value = weight_g × rate_per_g(alloy)
 * rate_per_g(gold k) = rate24 × purity(k)
 * making = 18% × metal_value
 * stones = Σ ct × price_per_ct(type, size_band)
 * subtotal = metal + making + stones
 * tax = TAX_PCT × subtotal
 * total = round to nearest $10
 *
 * Figures are in US dollars. Gold is priced per gram, as the trade does on both sides of
 * the Atlantic, and stones per carat.
 */

/**
 * Sales tax is a state matter in the US — from nothing in Oregon to about 10% in parts of
 * Louisiana — so a single national rate cannot be right. This is an estimate for a quote
 * that is marked indicative anyway, and the atelier sets the real one at the consultation.
 */
export const TAX_PCT = 0.08;

export interface PriceBreakdown {
  weight_g: number;
  metal: string; // e.g. "yellow"
  karat: string; // e.g. "18"
  rate24_per_g: number;
  purity: number;
  rate_per_g: number;
  metal_value: number;
  making_pct: number;
  making: number;
  stones_ct: number;
  stones_value: number;
  subtotal: number;
  tax_pct: number;
  tax: number;
  total: number;
  is_indicative: boolean;
}

export interface StoneEntry {
  ct_est: number;
  type?: string;
  d_mm?: number;
}

/** Placeholder price per carat by stone type and size band */
const STONE_RATES: Record<string, number> = {
  diamond_small: 300, // < 0.3 ct
  diamond_medium: 720, // 0.3–1 ct
  diamond_large: 1800, // > 1 ct
  ruby: 360,
  emerald: 240,
  sapphire: 300,
  pearl: 60,
  polki: 180,
  inferred: 300, // default for pipeline-inferred stones
};

function stoneRatePerCt(stone: StoneEntry): number {
  const type = stone.type || "inferred";
  if (type === "diamond" || type === "inferred") {
    if (stone.ct_est < 0.3) return STONE_RATES.diamond_small;
    if (stone.ct_est <= 1) return STONE_RATES.diamond_medium;
    return STONE_RATES.diamond_large;
  }
  return STONE_RATES[type] ?? STONE_RATES.inferred;
}

export function computePrice(opts: {
  weight_g: number;
  metal: string;
  karat: string;
  rate24_per_g: number;
  pt_rate_per_g?: number;
  stones?: StoneEntry[];
}): PriceBreakdown {
  const { weight_g, metal, karat, rate24_per_g, pt_rate_per_g, stones = [] } = opts;

  // Rate per gram
  let purity: number;
  let rate_per_g: number;
  if (karat === "pt950") {
    purity = 0.95;
    rate_per_g = pt_rate_per_g ?? rate24_per_g * 0.5; // fallback ratio
  } else {
    purity = PURITY[karat] ?? 0.75;
    rate_per_g = rate24_per_g * purity;
  }

  const metal_value = weight_g * rate_per_g;
  const making_pct = 0.18;
  const making = making_pct * metal_value;

  // Stones
  let stones_ct = 0;
  let stones_value = 0;
  for (const s of stones) {
    stones_ct += s.ct_est;
    stones_value += s.ct_est * stoneRatePerCt(s);
  }

  const subtotal = metal_value + making + stones_value;
  const tax_pct = TAX_PCT;
  const tax = tax_pct * subtotal;
  const raw_total = subtotal + tax;
  const total = Math.round(raw_total / 10) * 10;

  return {
    weight_g,
    metal,
    karat,
    rate24_per_g,
    purity,
    rate_per_g,
    metal_value,
    making_pct,
    making,
    stones_ct,
    stones_value,
    subtotal,
    tax_pct,
    tax,
    total,
    is_indicative: true,
  };
}

/** Format price for display: $82,400. */
export function formatPrice(amount: number): string {
  // Whole dollars: the breakdown lines are computed values and print $3,342.807 without this.
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/** Format a range: "$12,400–$14,900". */
export function formatPriceRange(low: number, high: number): string {
  return `${formatPrice(low)}–${formatPrice(high)}`;
}

/**
 * Compute weight for a given alloy from the base volume.
 * volume_mm3 → cm3 → weight_g
 */
export function weightFromVolume(
  volume_mm3: number,
  density_g_per_cm3: number
): number {
  return (volume_mm3 / 1000) * density_g_per_cm3;
}

/** Get alloy key like "18k_y" from metal + karat */
export function alloyKey(metal: string, karat: string): string {
  if (karat === "pt950") return "pt950";
  const m = metal === "yellow" ? "y" : metal === "white" ? "w" : "r";
  return `${karat}k_${m}`;
}
