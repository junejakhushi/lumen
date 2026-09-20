import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { modelRadius, normalisingMatrix, placePiece } from "@/lib/ar/placePiece";

/**
 * A bracelet segment as the pipeline would hand one over: an arc of a band, modelled about
 * its own centre somewhere away from the origin, turning about an axis that is not +Y.
 */
function segment({
  innerRadius = 30.5,
  thickness = 4.8,
  width = 6.7,
  spanDeg = 88,
  centre = new THREE.Vector3(17, -3, 21),
  axis = new THREE.Vector3(0.2, 0.9, -0.1).normalize(),
}: Partial<{
  innerRadius: number;
  thickness: number;
  width: number;
  spanDeg: number;
  centre: THREE.Vector3;
  axis: THREE.Vector3;
}> = {}) {
  const positions: number[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const theta = ((spanDeg * Math.PI) / 180) * (i / steps);
    for (const r of [innerRadius, innerRadius + thickness]) {
      for (const h of [-width / 2, width / 2]) {
        positions.push(r * Math.cos(theta), h, r * Math.sin(theta));
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex([...positions.keys()].filter((i) => i % 3 === 0).map((i) => i / 3).slice(0, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());

  // Model it in CAD coordinates: not at the origin, not about +Y.
  const group = new THREE.Group();
  group.add(mesh);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  group.position.copy(centre);
  group.updateMatrixWorld(true);
  return { object: group, innerRadius, thickness, width, spanDeg, centre, axis };
}

function vertices(object: THREE.Object3D): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  object.updateMatrixWorld(true);
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const pos = child.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      out.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(child.matrixWorld));
    }
  });
  return out;
}

const curveOf = (s: ReturnType<typeof segment>) => ({
  center: [s.centre.x, s.centre.y, s.centre.z],
  plane_normal: [s.axis.x, s.axis.y, s.axis.z],
  inner_radius_mm: s.innerRadius,
});

describe("placing a piece on the wearer", () => {
  it("puts the curve centre at the origin and the curve axis along +Y", () => {
    const s = segment();
    const placed = placePiece(s.object, {
      curve: curveOf(s),
      wornRadiusMm: s.innerRadius, // no resizing, so only the framing changes
      pieceType: "bracelet",
      segmentCount: 1,
    });
    for (const v of vertices(placed)) {
      // every vertex is a band's thickness away from the axis, and the axis is Y
      const r = Math.hypot(v.x, v.z);
      expect(r).toBeGreaterThan(s.innerRadius - 0.01);
      expect(r).toBeLessThan(s.innerRadius + s.thickness + 0.01);
      expect(Math.abs(v.y)).toBeLessThanOrEqual(s.width / 2 + 0.01);
    }
  });

  it("anchoring on the bounding box instead would miss the wrist entirely", () => {
    // The distance between the two anchors is what used to be the placement error.
    const s = segment();
    const box = new THREE.Box3().setFromObject(s.object).getCenter(new THREE.Vector3());
    expect(box.distanceTo(s.centre)).toBeGreaterThan(20);
  });

  it("bends the inner surface onto the wrist the client chose", () => {
    const s = segment();
    for (const worn of [22, 25.5, 29]) {
      const placed = placePiece(s.object, {
        curve: curveOf(s),
        wornRadiusMm: worn,
        pieceType: "bracelet",
        segmentCount: 1,
      });
      const radii = vertices(placed).map((v) => Math.hypot(v.x, v.z));
      expect(Math.min(...radii)).toBeCloseTo(worn, 1);
      // the band keeps its thickness rather than being scaled down with the wrist
      expect(Math.max(...radii) - Math.min(...radii)).toBeCloseTo(s.thickness, 1);
    }
  });

  it("keeps the band's width across sizes", () => {
    const s = segment();
    for (const worn of [22, 29]) {
      const placed = placePiece(s.object, {
        curve: curveOf(s),
        wornRadiusMm: worn,
        pieceType: "bracelet",
        segmentCount: 1,
      });
      const ys = vertices(placed).map((v) => v.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(s.width, 1);
    }
  });

  it("lays the segments right round the wrist", () => {
    const s = segment({ spanDeg: 88 });
    const placed = placePiece(s.object, {
      curve: curveOf(s),
      wornRadiusMm: 25.5,
      pieceType: "bracelet",
      segmentCount: 4,
    });
    const angles = vertices(placed).map((v) => (Math.atan2(v.z, v.x) * 180) / Math.PI);
    // four segments of a squeezed 88° arc cover the circle, with no gap wider than one slot
    const sorted = [...new Set(angles.map((a) => Math.round(a)))].sort((a, b) => a - b);
    const gaps = sorted.slice(1).map((a, i) => a - sorted[i]);
    expect(Math.max(...gaps, 0)).toBeLessThan(25);
    expect(sorted[0]).toBeLessThan(-150);
    expect(sorted[sorted.length - 1]).toBeGreaterThan(150);
  });

  it("a ring is widened without having its angles squeezed", () => {
    const s = segment({ spanDeg: 360, innerRadius: 8.5, thickness: 1.8, width: 5 });
    const placed = placePiece(s.object, {
      curve: curveOf(s),
      wornRadiusMm: 9.2,
      pieceType: "ring",
      segmentCount: 1,
    });
    const radii = vertices(placed).map((v) => Math.hypot(v.x, v.z));
    expect(Math.min(...radii)).toBeCloseTo(9.2, 1);
    expect(Math.max(...radii) - Math.min(...radii)).toBeCloseTo(1.8, 1);
  });

  it("falls back to the bounding box when the pipeline fitted no circle", () => {
    const s = segment();
    const placed = placePiece(s.object, {
      curve: null,
      wornRadiusMm: 25,
      pieceType: "bracelet",
      segmentCount: 1,
    });
    expect(vertices(placed).length).toBeGreaterThan(0);
    expect(modelRadius(s.object, null)).toBeGreaterThan(0);
  });

  it("leaves the source model untouched", () => {
    const s = segment();
    const before = vertices(s.object).map((v) => v.clone());
    placePiece(s.object, {
      curve: curveOf(s),
      wornRadiusMm: 22,
      pieceType: "bracelet",
      segmentCount: 3,
    });
    const after = vertices(s.object);
    after.forEach((v, i) => expect(v.distanceTo(before[i])).toBeLessThan(1e-9));
  });

  it("normalising is the identity for a piece already framed that way", () => {
    const s = segment({ centre: new THREE.Vector3(0, 0, 0), axis: new THREE.Vector3(0, 1, 0) });
    const m = normalisingMatrix(s.object, curveOf(s));
    expect(m.elements.map((n) => Math.round(n * 1e6) / 1e6)).toEqual(
      new THREE.Matrix4().identity().elements
    );
  });
});
