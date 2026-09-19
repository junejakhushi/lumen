import type { PieceManifest } from "@/lib/types";
import { ALLOY_DENSITIES, RING_SIZES } from "@/lib/types";
import { weightFromVolume, alloyKey } from "@/lib/pricing";

/**
 * Ring resizing per SPEC §5.1.
 *
 * Resize with arc-length-preserving radial mapping:
 *   (θ, r) → (θ, r − R_old + R_new)
 * Band cross-section keeps its thickness; the head moves outward rigidly.
 *
 * Weight ≈ whole_volume × R_new_mid / R_old_mid (simplified).
 * Allowed range: ±4 Indian sizes from the modelled size.
 */

export interface RingAssembly {
  originalSizeIn: number;
  originalSizeUs: number;
  currentSizeIn: number;
  currentSizeUs: number;
  originalInnerD: number;
  currentInnerD: number;
  radiusRatio: number;
  totalWeight: number;
  totalStones: number;
  totalCarats: number;
}

export function resizeRing(
  manifest: PieceManifest,
  targetSizeIn: number,
  metal: string,
  karat: string
): RingAssembly {
  const ring = manifest.ring;
  if (!ring) {
    throw new Error("Ring manifest missing ring data");
  }

  const originalSizeIn = ring.size_in;
  const originalSizeUs = ring.size_us;

  // Find the target ring size entry
  const targetEntry = RING_SIZES.find((s) => s.indian === targetSizeIn);
  const originalEntry = RING_SIZES.find((s) => s.indian === originalSizeIn);

  const currentInnerD = targetEntry?.inner_d_mm ?? ring.inner_d_mm;
  const currentSizeUs = targetEntry?.us ?? ring.size_us;
  const originalInnerD = originalEntry?.inner_d_mm ?? ring.inner_d_mm;

  // Radius ratio for weight scaling
  const R_old_mid = originalInnerD / 2 + (ring.band_t_mm ?? 1) / 2;
  const R_new_mid = currentInnerD / 2 + (ring.band_t_mm ?? 1) / 2;
  const radiusRatio = R_new_mid / R_old_mid;

  // Weight
  const ak = alloyKey(metal, karat);
  const density = ALLOY_DENSITIES[ak] ?? ALLOY_DENSITIES["18k_y"];
  const baseWeight = weightFromVolume(manifest.volume_recon_mm3, density);
  const totalWeight = baseWeight * radiusRatio;

  // Stones (not affected by resizing)
  const totalStones = manifest.stones?.length ?? 0;
  const totalCarats = manifest.stones?.reduce((s, st) => s + st.ct_est, 0) ?? 0;

  return {
    originalSizeIn,
    originalSizeUs,
    currentSizeIn: targetSizeIn,
    currentSizeUs,
    originalInnerD,
    currentInnerD,
    radiusRatio,
    totalWeight,
    totalStones,
    totalCarats,
  };
}

/**
 * Get the allowed ring size range for a piece (±4 Indian sizes).
 */
export function allowedRingSizes(manifest: PieceManifest): Array<{
  indian: number;
  us: number;
  inner_d_mm: number;
}> {
  const ring = manifest.ring;
  if (!ring) return [];

  const modelledSize = ring.size_in;
  return RING_SIZES.filter(
    (s) => s.indian >= modelledSize - 4 && s.indian <= modelledSize + 4
  );
}
