import { describe, expect, it } from "vitest";
import { solveRingPose, solveWristPose, type Landmark } from "@/lib/ar/wristPose";
import { bendVertex } from "@/lib/assembly/bracelet";

/**
 * A hand held flat, facing the camera, 400 mm away, with the fingers pointing up.
 * Landmarks are built by projecting known 3D points, so the solver can be checked against
 * the truth it should recover.
 */
const W = 1280;
const H = 720;
const FOV = 60;
const PALM_MM = 80;
const FOCAL = W / 2 / Math.tan((FOV * Math.PI) / 360);

function project(p: [number, number, number]): Landmark {
  const depth = -p[2];
  return {
    x: (p[0] * FOCAL) / depth / W + 0.5,
    y: -(p[1] * FOCAL) / depth / H + 0.5,
    z: 0, // flat hand: no relative depth
  };
}

/** Hand in camera space (mm): wrist at the origin-ish, fingers up, palm toward the camera. */
function flatHand(distance = 400, rollDeg = 0): Landmark[] {
  const roll = (rollDeg * Math.PI) / 180;
  const place = (x: number, y: number): [number, number, number] => [
    x * Math.cos(roll) - y * Math.sin(roll),
    x * Math.sin(roll) + y * Math.cos(roll),
    -distance,
  ];
  const points: [number, number, number][] = new Array(21).fill(null).map(() => place(0, 0));
  points[0] = place(0, 0); // wrist
  // The palm's width is measured across these two, so they sit level and exactly PALM_MM apart.
  points[5] = place(-PALM_MM / 2, 90); // index base
  points[17] = place(PALM_MM / 2, 90); // pinky base
  points[9] = place(0, 95); // middle base — straight above the wrist
  points[13] = place(10, 92); // ring base
  points[14] = place(12, 125); // ring first joint
  return points.map(project);
}

describe("wrist pose", () => {
  it("recovers the distance from the apparent width of the palm", () => {
    for (const distance of [250, 400, 600]) {
      const pose = solveWristPose(flatHand(distance), W, H, FOV, PALM_MM)!;
      expect(pose.distanceMm).toBeCloseTo(distance, 0);
      expect(pose.position[2]).toBeLessThan(0); // in front of the camera
    }
  });

  it("sits up the forearm from the wrist landmark, not on it", () => {
    const pose = solveWristPose(flatHand(400), W, H, FOV, PALM_MM)!;
    // fingers point up, so the forearm runs down: the band sits below landmark 0
    expect(pose.position[1]).toBeLessThan(-10);
    expect(pose.position[1]).toBeGreaterThan(-26);
  });

  it("does not confuse the aspect ratio for a rotation", () => {
    // A hand held straight up must come out straight up. Working in normalised coordinates
    // instead of millimetres tilts this by the frame's aspect ratio.
    const pose = solveWristPose(flatHand(400), W, H, FOV, PALM_MM)!;
    const q = pose.quaternion;
    // The model's +Y (the wrist axis) should land pointing down the forearm: ~(0,-1,0).
    const y = rotate([0, 1, 0], q);
    expect(y[1]).toBeLessThan(-0.99);
    expect(Math.abs(y[0])).toBeLessThan(0.05);
  });

  it("follows the hand as it rolls", () => {
    const upright = solveWristPose(flatHand(400, 0), W, H, FOV, PALM_MM)!;
    const tilted = solveWristPose(flatHand(400, 30), W, H, FOV, PALM_MM)!;
    const a = rotate([0, 1, 0], upright.quaternion);
    const b = rotate([0, 1, 0], tilted.quaternion);
    const angle = (Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * 180) / Math.PI;
    expect(angle).toBeGreaterThan(25);
    expect(angle).toBeLessThan(35);
  });

  it("keeps the piece's axis square to the palm", () => {
    const pose = solveWristPose(flatHand(400), W, H, FOV, PALM_MM)!;
    const y = rotate([0, 1, 0], pose.quaternion);
    const z = rotate([0, 0, 1], pose.quaternion);
    expect(Math.abs(y[0] * z[0] + y[1] * z[1] + y[2] * z[2])).toBeLessThan(1e-6);
    expect(z[2]).toBeGreaterThan(0.9); // palm normal faces the camera
  });

  it("puts a ring on the ring finger, above the wrist", () => {
    const hand = flatHand(400);
    const wrist = solveWristPose(hand, W, H, FOV, PALM_MM)!;
    const ring = solveRingPose(hand, W, H, FOV, PALM_MM)!;
    expect(ring.position[1]).toBeGreaterThan(wrist.position[1] + 80);
    expect(ring.distanceMm).toBeCloseTo(400, 0);
  });

  it("gives nothing when the hand is incomplete", () => {
    expect(solveWristPose([], W, H, FOV, PALM_MM)).toBeNull();
    expect(solveWristPose(flatHand().slice(0, 10), W, H, FOV, PALM_MM)).toBeNull();
  });
});

describe("bending to size", () => {
  const SEG = 30.5; // the fixture's inner radius
  const ARC = 88; // degrees of arc it covers

  it("preserves arc length at the inner radius", () => {
    const worn = 25.46; // a 16 cm wrist
    const [thetaEnd] = bendVertex((ARC * Math.PI) / 180, SEG, SEG, worn);
    expect(thetaEnd * worn).toBeCloseTo(((ARC * Math.PI) / 180) * SEG, 6);
  });

  it("moves the inner surface onto the wrist", () => {
    const worn = 25.46;
    const [, r] = bendVertex(0, SEG, SEG, worn);
    expect(r).toBeCloseTo(worn, 6);
  });

  it("keeps the band's thickness", () => {
    const worn = 25.46;
    const [, inner] = bendVertex(0, SEG, SEG, worn);
    const [, outer] = bendVertex(0, SEG + 4.8, SEG, worn);
    expect(outer - inner).toBeCloseTo(4.8, 6);
  });

  it("a larger wrist takes a wider sweep of the same piece", () => {
    const small = bendVertex((ARC * Math.PI) / 180, SEG, SEG, 22)[0];
    const large = bendVertex((ARC * Math.PI) / 180, SEG, SEG, 29)[0];
    expect(small).toBeGreaterThan(large); // the same arc covers more of a smaller circle
  });
});

/** Rotate a vector by a quaternion [x, y, z, w]. */
function rotate(v: number[], q: number[]): number[] {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
}
