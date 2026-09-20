import * as THREE from "three";
import { bendVertex } from "@/lib/assembly/bracelet";

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
}

export interface PlaceOptions {
  curve?: PieceCurve | null;
  /** Inner radius the piece must have when worn, in millimetres. */
  wornRadiusMm: number;
  pieceType: "bracelet" | "ring";
  /** Bracelets: how many copies of the segment close the circle. */
  segmentCount?: number;
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
  const segmentCount = Math.max(1, options.segmentCount ?? 1);

  const piece = source.clone(true);
  const bake = normalisingMatrix(piece, curve);
  const fromRadius = modelRadius(piece, curve);
  // A ring keeps its angles and only moves outward; a bracelet segment also has its span
  // squeezed, so that n of them close the circle at the new size.
  const bendAngles = pieceType !== "ring";

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
      // Both cases move the inner surface from the modelled radius to the worn one; only a
      // bracelet segment also has its angles squeezed, so n of them still close the circle.
      const [nextTheta, nextR] = bendVertex(theta, r, fromRadius, wornRadiusMm);
      const useTheta = bendAngles ? nextTheta : theta;
      position.setXYZ(i, nextR * Math.cos(useTheta), y, nextR * Math.sin(useTheta));
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

  const assembled = new THREE.Group();
  const copies = pieceType === "bracelet" ? segmentCount : 1;
  for (let i = 0; i < copies; i++) {
    const copy = i === 0 ? piece : piece.clone(true); // clones share geometry
    copy.rotateY((i / copies) * Math.PI * 2);
    assembled.add(copy);
  }
  return assembled;
}

/** Free the geometry a placed piece owns. */
export function disposePlaced(group: THREE.Object3D): void {
  const seen = new Set<THREE.BufferGeometry>();
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry && !seen.has(child.geometry)) {
      seen.add(child.geometry);
      child.geometry.dispose();
    }
  });
}
