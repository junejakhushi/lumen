/**
 * Units as a US client reads them.
 *
 * The pipeline measures in millimetres and the assembly maths works in centimetres, because
 * that is what the geometry is. Nothing here changes those numbers — it only decides how they
 * are written down. Stones stay in millimetres and carats, which is the trade's language
 * everywhere, and gold stays in grams for the same reason; what changes is wrist size, which
 * a US client gives in inches, and ring size, which they give on the US scale.
 */

export const CM_PER_IN = 2.54;

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

/** Wrist measurements are offered in quarter inches, which is how a tape is read. */
export const WRIST_IN = { min: 5.5, max: 8, step: 0.25 } as const;

/** Round to the nearest quarter inch, so the stepper lands on readable values. */
export function toQuarterInch(inches: number): number {
  return Math.round(inches * 4) / 4;
}

export function formatWristIn(cm: number): string {
  return `${toQuarterInch(cmToIn(cm)).toFixed(2).replace(/\.?0+$/, "")} in`;
}

/** Millimetres, as jewellery is specified the world over. */
export function formatMm(mm: number, places = 1): string {
  return `${mm.toFixed(places)} mm`;
}

/** Grams, as gold is weighed in the trade. */
export function formatGrams(g: number): string {
  return `${g.toFixed(1)} g`;
}
