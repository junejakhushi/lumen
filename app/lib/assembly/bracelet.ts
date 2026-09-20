import type { PieceManifest } from "@/lib/types";
import { ALLOY_DENSITIES } from "@/lib/types";
import { weightFromVolume, alloyKey } from "@/lib/pricing";

/**
 * Bracelet assembly per SPEC §5.1.
 *
 * A bracelet = n copies of the segment along a circle.
 * Circumference L = wrist_cm × 10 + 12 mm (fitting allowance).
 * n = round(L / segment.arc_len_mm at mid radius).
 *
 * Bend: map vertices in the curve plane with
 *   (θ, r) → (θ·R_seg/R_path, r − R_seg + R_path)
 * This preserves arc length at the mid radius.
 *
 * Findings: "hole" connectors get jump rings, plus a box clasp.
 */

/** Clasp weight at 18K yellow gold (g) */
const CLASP_WEIGHT_18K = 0.8;
/** Jump ring wire diameter (mm) */
const JUMP_RING_WIRE_D = 0.8;

export interface BraceletAssembly {
  segmentCount: number;
  pathRadius: number; // mm, inner radius of the assembled bracelet
  pathCircumference: number; // mm
  segArcLen: number; // original segment arc length at mid radius
  connector: string;
  hasJumpRings: boolean;
  claspWeight: number; // g at the selected alloy
  totalWeight: number; // g
  stonesPerSegment: number;
  totalStones: number;
  totalCarats: number;
}

export function assembleBracelet(
  manifest: PieceManifest,
  wristCm: number,
  metal: string,
  karat: string
): BraceletAssembly {
  const seg = manifest.segment;
  const curve = manifest.curve;
  if (!seg || !curve) {
    throw new Error("Bracelet manifest missing segment or curve data");
  }

  // Circumference = wrist_cm × 10 + 12 mm fitting allowance
  const circumference = wristCm * 10 + 12;
  const pathRadius = circumference / (2 * Math.PI);

  // Number of segments — counted the way they are actually laid out, so the weight matches
  // the bracelet on screen.
  const innerRadius = circumference / (2 * Math.PI);
  const n = manifest.curve?.span_deg && manifest.curve?.inner_radius_mm
    ? segmentsAroundWrist(manifest.curve.span_deg, manifest.curve.inner_radius_mm, innerRadius)
    : Math.max(1, Math.round(circumference / seg.arc_len_mm));

  // Connector type
  const connector = seg.connector || "butt";
  const hasJumpRings = connector === "hole";

  // Weight calculation
  const ak = alloyKey(metal, karat);
  const density = ALLOY_DENSITIES[ak] ?? ALLOY_DENSITIES["18k_y"];
  const segWeight = weightFromVolume(manifest.volume_recon_mm3, density);

  // Clasp weight scaled by density ratio
  const density18k = ALLOY_DENSITIES["18k_y"];
  const claspWeight = CLASP_WEIGHT_18K * (density / density18k);

  // Jump ring weight (approximate: small torus)
  let jumpRingWeight = 0;
  if (hasJumpRings) {
    // Each junction gets a jump ring; n junctions for n segments (circular)
    // minus 1 for the clasp position
    const junctionCount = Math.max(0, n - 1);
    // Torus volume ≈ 2π²Rr² where R=1.5mm (ring radius), r=0.4mm (wire radius)
    const torusVolume = 2 * Math.PI * Math.PI * 1.5 * 0.4 * 0.4; // mm³
    jumpRingWeight = junctionCount * weightFromVolume(torusVolume, density);
  }

  const totalWeight = n * segWeight + claspWeight + jumpRingWeight;

  // Stones
  const stonesPerSegment = manifest.stones?.length ?? 0;
  const totalStones = n * stonesPerSegment;
  const caratsPerSegment = manifest.stones?.reduce((s, st) => s + st.ct_est, 0) ?? 0;
  const totalCarats = n * caratsPerSegment;

  return {
    segmentCount: n,
    pathRadius,
    pathCircumference: circumference,
    segArcLen: seg.arc_len_mm,
    connector,
    hasJumpRings,
    claspWeight,
    totalWeight,
    stonesPerSegment,
    totalStones,
    totalCarats,
  };
}

/**
 * How many copies of the segment close the circle at the worn size.
 *
 * SPEC §5.1 divides the wrist circumference by the segment's arc length at its *mid* radius,
 * but the bend preserves arc length at the *inner* radius — mixing the two leaves a visible
 * gap (a third of the bracelet, for the fixture). Both are measured at the inner radius here,
 * and the segment's span is then stretched to exactly 1/n of the circle so the joints meet.
 */
export function segmentsAroundWrist(
  spanDeg: number,
  segInnerRadius: number,
  wornInnerRadius: number
): number {
  const spanRad = (spanDeg * Math.PI) / 180;
  if (spanRad <= 0 || segInnerRadius <= 0) return 1;
  const arcAtInner = spanRad * segInnerRadius;
  if (arcAtInner <= 0) return 1;
  return Math.max(1, Math.round((2 * Math.PI * wornInnerRadius) / arcAtInner));
}

/**
 * Arc-length-preserving bend: given a vertex in the segment's local
 * curve plane (θ_local, r_local), map it to the assembled path radius.
 *
 * (θ, r) → (θ · R_seg / R_path, r - R_seg + R_path)
 *
 * Returns new [θ, r] in the path space.
 */
export function bendVertex(
  theta: number,
  r: number,
  segInnerRadius: number,
  pathInnerRadius: number
): [number, number] {
  const newTheta = theta * (segInnerRadius / pathInnerRadius);
  const newR = r - segInnerRadius + pathInnerRadius;
  return [newTheta, newR];
}

/**
 * Compute the angular position of each segment instance around the circle.
 * Returns angles in radians for InstancedMesh placement.
 */
export function segmentAngles(n: number): number[] {
  const step = (2 * Math.PI) / n;
  return Array.from({ length: n }, (_, i) => i * step);
}
