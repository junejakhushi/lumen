export { assembleBracelet, bendVertex, segmentAngles, type BraceletAssembly } from "./bracelet";
export { resizeRing, allowedRingSizes, type RingAssembly } from "./ring";
export { pairTops, type TopsAssembly } from "./tops";

import type { PieceManifest } from "@/lib/types";
import { ALLOY_DENSITIES } from "@/lib/types";
import { weightFromVolume, alloyKey } from "@/lib/pricing";
import { assembleBracelet } from "./bracelet";
import { resizeRing } from "./ring";
import { pairTops } from "./tops";

export interface AssemblyResult {
  totalWeight: number;
  totalStones: number;
  totalCarats: number;
  /** Bracelets: how many copies of the segment make the piece at this size. */
  segmentCount?: number;
}

/**
 * Dispatch assembly by piece type.
 */
export function assembleForType(
  manifest: PieceManifest,
  metal: string,
  karat: string,
  opts: { wristCm?: number; ringSizeIn?: number }
): AssemblyResult {
  switch (manifest.type) {
    case "bracelet": {
      const a = assembleBracelet(manifest, opts.wristCm ?? 16, metal, karat);
      return {
        totalWeight: a.totalWeight,
        totalStones: a.totalStones,
        totalCarats: a.totalCarats,
        segmentCount: a.segmentCount,
      };
    }
    case "ring": {
      const modelledSize = manifest.ring?.size_in ?? 13;
      const a = resizeRing(manifest, opts.ringSizeIn ?? modelledSize, metal, karat);
      return {
        totalWeight: a.totalWeight,
        totalStones: a.totalStones,
        totalCarats: a.totalCarats,
      };
    }
    case "tops": {
      const a = pairTops(manifest, metal, karat);
      return {
        totalWeight: a.totalWeight,
        totalStones: a.totalStones,
        totalCarats: a.totalCarats,
      };
    }
    default: {
      const ak = alloyKey(metal, karat);
      const density = ALLOY_DENSITIES[ak] ?? ALLOY_DENSITIES["18k_y"];
      return {
        totalWeight: weightFromVolume(manifest.volume_recon_mm3, density),
        totalStones: manifest.stones?.length ?? 0,
        totalCarats: manifest.stones?.reduce((sum, st) => sum + st.ct_est, 0) ?? 0,
      };
    }
  }
}
