import type { PieceManifest } from "@/lib/types";
import { ALLOY_DENSITIES } from "@/lib/types";
import { weightFromVolume, alloyKey } from "@/lib/pricing";

/**
 * Tops (stud earrings) pairing per SPEC §5.1.
 *
 * No assembly. Render the pair by mirroring across the vertical plane,
 * 60 mm apart in the viewer. Weight and stones ×2.
 */

export interface TopsAssembly {
  /** Distance between the pair in mm */
  separation: number;
  totalWeight: number;
  totalStones: number;
  totalCarats: number;
}

const PAIR_SEPARATION_MM = 60;

export function pairTops(
  manifest: PieceManifest,
  metal: string,
  karat: string
): TopsAssembly {
  const ak = alloyKey(metal, karat);
  const density = ALLOY_DENSITIES[ak] ?? ALLOY_DENSITIES["18k_y"];
  const singleWeight = weightFromVolume(manifest.volume_recon_mm3, density);

  const singleStones = manifest.stones?.length ?? 0;
  const singleCarats = manifest.stones?.reduce((s, st) => s + st.ct_est, 0) ?? 0;

  return {
    separation: PAIR_SEPARATION_MM,
    totalWeight: singleWeight * 2,
    totalStones: singleStones * 2,
    totalCarats: singleCarats * 2,
  };
}
