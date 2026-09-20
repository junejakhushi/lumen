import * as THREE from "three";
import { bendVertex, segmentsAroundWrist } from "@/lib/assembly/bracelet";
import { buildGems, type GemCut, type GemType, type HeadPlacement } from "./gems";

/**
 * Put a piece into wearing position (SPEC §5.1).
 *
 * The GLB comes out of the pipeline in CAD coordinates: the piece sits wherever it was
 * modelled, turning about its own curve axis. Before it can be worn it has to be moved so
 * that its curve centre is the origin and its curve axis is +Y — the axis the pose solver
 * orients. Anchoring on the bounding-box centre instead puts the anchor out in space beside
 * the piece, because a short arc's box centre is nowhere near the circle it belongs to.
 *
 * It is then bent to the wearer's size, preserving arc length at the inner radius, and a
 * bracelet's segment is repeated around the wrist. Scaling the whole piece instead would
 * make a smaller wrist wear thinner jewellery.
 */

export interface PieceCurve {
  center: number[];
  plane_normal: number[];
  inner_radius_mm: number;
  /** How much of a circle the piece covers — a bracelet segment is a fraction of one. */
  span_deg?: number;
  /** The in-plane direction angles are measured from (manifest §4.8). */
  ref_dir?: number[];
}

export interface PlaceOptions {
  curve?: PieceCurve | null;
  /** Inner radius the piece must have when worn, in millimetres. */
  wornRadiusMm: number;
  pieceType: "bracelet" | "ring";
  /** Bracelets: how many copies of the segment close the circle. */
  segmentCount?: number;
  /** The settings the pipeline measured, so their stones can be drawn (SPEC §4.6). */
  heads?: HeadPlacement[];
  stoneDiameters?: number[];
  stoneType?: GemType;
  stoneCut?: GemCut;
  /** Multiplies the measured stone size. */
  stoneScale?: number;
  /**
   * Where the piece's front is, as an angle in its curve plane — a ring's head, say. The
   * piece is turned so this faces +Z, which the pose points at the back of the hand.
   */
  featureAngleDeg?: number | null;
}

/** The transform that takes the model into "centred on the origin, axis along +Y". */
export function normalisingMatrix(object: THREE.Object3D, curve?: PieceCurve | null): THREE.Matrix4 {
  const box = new THREE.Box3().setFromObject(object);
  const centre =
    curve?.center?.length === 3
      ? new THREE.Vector3(curve.center[0], curve.center[1], curve.center[2])
      : box.getCenter(new THREE.Vector3());
  const axis =
    curve?.plane_normal?.length === 3
      ? new THREE.Vector3(
          curve.plane_normal[0],
          curve.plane_normal[1],
          curve.plane_normal[2]
        ).normalize()
      : new THREE.Vector3(0, 1, 0);

  const toOrigin = new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z);
  const toY = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0))
  );
  return new THREE.Matrix4().multiplyMatrices(toY, toOrigin);
}

/** The radius the piece was modelled at, from the manifest or, failing that, its size. */
export function modelRadius(object: THREE.Object3D, curve?: PieceCurve | null): number {
  if (curve?.inner_radius_mm && curve.inner_radius_mm > 1) return curve.inner_radius_mm;
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  return Math.max(size.x, size.z, 2) / 2;
}

/**
 * Build the worn piece. The source is left untouched; the result owns its geometry and
 * should be disposed when it is replaced.
 */
export function placePiece(source: THREE.Object3D, options: PlaceOptions): THREE.Group {
  const { curve, wornRadiusMm, pieceType } = options;

  const piece = source.clone(true);
  const bake = normalisingMatrix(piece, curve);
  const fromRadius = modelRadius(piece, curve);

  // How many copies, and how far each must be stretched so they meet.
  const spanDeg = curve?.span_deg ?? 360;
  const isRing = pieceType === "ring" || spanDeg >= 330;
  const copies = isRing
    ? 1
    : options.segmentCount ?? segmentsAroundWrist(spanDeg, fromRadius, wornRadiusMm);
  const spanRad = (spanDeg * Math.PI) / 180;
  // Each segment covers exactly its share of the circle, so there is no gap at the joints.
  const thetaScale = isRing || spanRad <= 0 ? 1 : (2 * Math.PI) / copies / spanRad;

  piece.updateMatrixWorld(true);
  piece.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = (child.geometry as THREE.BufferGeometry).clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(bake, child.matrixWorld));

    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 1e-6) continue;
      const theta = Math.atan2(z, x);
      // Both cases move the inner surface from the modelled radius to the worn one; a
      // bracelet segment's angles are also stretched so n of them close the circle.
      const [, nextR] = bendVertex(theta, r, fromRadius, wornRadiusMm);
      const nextTheta = theta * thetaScale;
      position.setXYZ(i, nextR * Math.cos(nextTheta), y, nextR * Math.sin(nextTheta));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    child.geometry = geometry;
    child.position.set(0, 0, 0);
    child.quaternion.identity();
    child.scale.setScalar(1);
  });
  piece.position.set(0, 0, 0);
  piece.quaternion.identity();
  piece.scale.setScalar(1);

  // The stones ride the same bend as the metal, so they stay in their settings.
  const bendPoint = (p: THREE.Vector3) => {
    const q = p.clone().applyMatrix4(bake);
    const r = Math.hypot(q.x, q.z);
    if (r < 1e-6) return q;
    const theta = Math.atan2(q.z, q.x) * thetaScale;
    const [, nextR] = bendVertex(0, r, fromRadius, wornRadiusMm);
    return new THREE.Vector3(nextR * Math.cos(theta), q.y, nextR * Math.sin(theta));
  };
  const bendDirection = (origin: THREE.Vector3, dir: THREE.Vector3) => {
    // Follow the direction a short way and see where it lands: a bent piece's outward
    // direction turns with it.
    const a = bendPoint(origin);
    const b = bendPoint(origin.clone().addScaledVector(dir, 1));
    const out = b.sub(a);
    return out.lengthSq() < 1e-12 ? new THREE.Vector3(0, 1, 0) : out.normalize();
  };

  const gems =
    options.heads && options.heads.length > 0
      ? buildGems(options.heads, options.stoneDiameters ?? [], {
          type: options.stoneType,
          cut: options.stoneCut,
          sizeScale: options.stoneScale,
          transformPoint: bendPoint,
          transformDirection: bendDirection,
        })
      : null;

  const assembled = new THREE.Group();

  /**
   * Turn the piece about its own axis so its front faces +Z.
   *
   * The pose puts +Z on the back of the hand, so a ring's head ends up on top of the finger
   * and a bracelet's motif on the outside of the wrist, wherever the hand is turned.
   */
  if (options.featureAngleDeg != null && curve?.ref_dir?.length === 3) {
    const ref = new THREE.Vector3(curve.ref_dir[0], curve.ref_dir[1], curve.ref_dir[2]);
    // Where the reference direction ends up once the piece is upright.
    const refInPlace = ref.applyMatrix4(new THREE.Matrix4().extractRotation(bake));
    const refAngle = Math.atan2(refInPlace.z, refInPlace.x);
    const featureAngle = refAngle + (options.featureAngleDeg * Math.PI) / 180 * thetaScale;
    // +Z is at 90°.
    assembled.rotateY(Math.PI / 2 - featureAngle);
  }

  for (let i = 0; i < copies; i++) {
    const metal = i === 0 ? piece : piece.clone(true); // clones share geometry
    const slot = new THREE.Group();
    slot.add(metal);
    if (gems) slot.add(i === 0 ? gems : gems.clone(true));
    slot.rotateY((i / copies) * Math.PI * 2);
    assembled.add(slot);
  }
  return assembled;
}

/** Free the geometry a placed piece owns. */
export function disposePlaced(group: THREE.Object3D): void {
  const seen: THREE.BufferGeometry[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry && !seen.includes(child.geometry)) {
      seen.push(child.geometry);
      child.geometry.dispose();
    }
  });
}
