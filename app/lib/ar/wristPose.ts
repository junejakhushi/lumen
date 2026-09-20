/**
 * Wrist and finger pose from MediaPipe hand landmarks (SPEC §5.3).
 *
 * Landmarks arrive normalised: x and y in 0..1 across the frame, z roughly in the same scale
 * as x. Directions cannot be taken from those numbers directly — x and y are stretched by
 * different amounts, and y points down while 3D y points up. Everything here is therefore
 * unprojected into camera space in millimetres first, and the geometry is done there.
 *
 * Camera space is three.js convention: x right, y up, camera at the origin looking down −z,
 * so the hand sits at negative z.
 *
 * The pose returned orients a piece whose own axes are:
 *   +Y  the axis the wrist (or finger) passes through
 *   +Z  the palm normal (for a bracelet) or the direction the head faces (for a ring)
 */

export interface Landmark {
  x: number; // 0..1 across the frame
  y: number; // 0..1 down the frame
  z: number; // relative depth, roughly in x's scale
}

export interface WristPose {
  /** Position in camera space, millimetres. */
  position: [number, number, number];
  /** Quaternion [x, y, z, w] taking model axes into camera space. */
  quaternion: [number, number, number, number];
  /** Palm width in pixels — how confident the depth estimate is. */
  palmWidthPx: number;
  /** Distance from the camera, millimetres. */
  distanceMm: number;
}

type Vec3 = [number, number, number];

const WRIST_OFFSET_MM = 18; // SPEC §5.3: the band sits this far up the forearm from lm0

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k];
}

function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize3(v: Vec3): Vec3 {
  const len = length(v);
  if (len < 1e-9) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Focal length in pixels from the camera's horizontal field of view. */
export function focalLengthPx(videoWidth: number, fovDeg: number): number {
  return videoWidth / 2 / Math.tan((fovDeg * Math.PI) / 360);
}

/**
 * Quaternion from three orthonormal axes, given as the columns of the rotation matrix:
 * where the model's x, y and z end up in camera space.
 */
function quaternionFromBasis(xAxis: Vec3, yAxis: Vec3, zAxis: Vec3): [number, number, number, number] {
  const m00 = xAxis[0], m01 = yAxis[0], m02 = zAxis[0];
  const m10 = xAxis[1], m11 = yAxis[1], m12 = zAxis[1];
  const m20 = xAxis[2], m21 = yAxis[2], m22 = zAxis[2];

  const trace = m00 + m11 + m22;
  let x: number, y: number, z: number, w: number;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m21 - m12) * s;
    y = (m02 - m20) * s;
    z = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }

  const len = Math.sqrt(x * x + y * y + z * z + w * w);
  return [x / len, y / len, z / len, w / len];
}

interface Frame {
  videoWidth: number;
  videoHeight: number;
  fovDeg: number;
  palmWidthMm: number;
}

/**
 * Put the hand into camera space, in millimetres.
 *
 * Depth comes from the apparent width of the palm (lm5 to lm17) against its assumed real
 * width — the pinhole model of SPEC §5.3. MediaPipe's own z is relative and noisy, so it is
 * used only for the small within-hand differences, scaled to match.
 */
function handInCameraSpace(landmarks: Landmark[], frame: Frame): { points: Vec3[]; palmWidthPx: number; distanceMm: number } | null {
  const { videoWidth, videoHeight, fovDeg, palmWidthMm } = frame;
  if (landmarks.length < 21 || videoWidth === 0 || videoHeight === 0) return null;

  const lm5 = landmarks[5];
  const lm17 = landmarks[17];
  const palmWidthPx = Math.hypot(
    (lm5.x - lm17.x) * videoWidth,
    (lm5.y - lm17.y) * videoHeight
  );
  if (palmWidthPx < 1) return null;

  const focal = focalLengthPx(videoWidth, fovDeg);
  // Distance at which a palm of the assumed width spans that many pixels.
  const distanceMm = (focal * palmWidthMm) / palmWidthPx;
  // MediaPipe's z is in units of image width; at this distance one such unit is:
  const zScaleMm = (videoWidth / focal) * distanceMm;

  const cx = videoWidth / 2;
  const cy = videoHeight / 2;
  const points = landmarks.map((lm): Vec3 => {
    const depth = distanceMm + lm.z * zScaleMm;
    const px = lm.x * videoWidth;
    const py = lm.y * videoHeight;
    return [
      ((px - cx) / focal) * depth,
      // Image y runs down the frame; camera y runs up.
      -((py - cy) / focal) * depth,
      -depth,
    ];
  });

  return { points, palmWidthPx, distanceMm };
}

export type Handedness = "Left" | "Right" | null;

/**
 * Which way the back of the hand faces.
 *
 * cross(index base − wrist, pinky base − wrist) is perpendicular to the palm, and which side
 * it comes out of depends on which hand it is: the two hands are mirror images, so the same
 * formula gives opposite answers for each. Anchoring on anatomy rather than on whichever side
 * the camera happens to see keeps a piece's front on the back of the hand as the hand turns.
 */
function dorsalDirection(
  wrist: Vec3,
  indexBase: Vec3,
  pinkyBase: Vec3,
  handedness: Handedness,
  fallbackTowardCamera: boolean
): Vec3 {
  const normal = normalize3(cross(sub(indexBase, wrist), sub(pinkyBase, wrist)));
  if (handedness === "Right") return normal;
  if (handedness === "Left") return scale(normal, -1);
  // Without a handedness we cannot tell the back from the palm; show the piece's front to
  // whoever is looking rather than guess.
  return fallbackTowardCamera && normal[2] < 0 ? scale(normal, -1) : normal;
}

/** Where the bracelet sits, and how it is turned (SPEC §5.3, bracelet mode). */
export function solveWristPose(
  landmarks: Landmark[],
  videoWidth: number,
  videoHeight: number,
  fovDeg: number,
  palmWidthMm: number,
  handedness: Handedness = null
): WristPose | null {
  const hand = handInCameraSpace(landmarks, { videoWidth, videoHeight, fovDeg, palmWidthMm });
  if (!hand) return null;
  const { points, palmWidthPx, distanceMm } = hand;

  const wrist = points[0];
  const indexBase = points[5];
  const middleBase = points[9];
  const pinkyBase = points[17];

  // Down the forearm, away from the hand.
  const forearm = normalize3(sub(wrist, middleBase));
  // The wrist centre proper sits a little further down the arm than landmark 0.
  const centre = add(wrist, scale(forearm, WRIST_OFFSET_MM));

  // The piece's front goes on the back of the hand.
  const acrossPalm = sub(pinkyBase, indexBase);
  const dorsal = dorsalDirection(wrist, indexBase, pinkyBase, handedness, true);

  // Square the basis up: the wrist axis is the one to trust.
  const yAxis = forearm;
  let zAxis = normalize3(sub(dorsal, scale(yAxis, dot(dorsal, yAxis))));
  if (length(zAxis) < 1e-6) zAxis = normalize3(acrossPalm);
  const xAxis = normalize3(cross(yAxis, zAxis));

  return {
    position: centre,
    quaternion: quaternionFromBasis(xAxis, yAxis, zAxis),
    palmWidthPx,
    distanceMm,
  };
}

/** Where the ring sits on the ring finger (SPEC §5.3, ring mode). */
export function solveRingPose(
  landmarks: Landmark[],
  videoWidth: number,
  videoHeight: number,
  fovDeg: number,
  palmWidthMm: number,
  handedness: Handedness = null
): WristPose | null {
  const hand = handInCameraSpace(landmarks, { videoWidth, videoHeight, fovDeg, palmWidthMm });
  if (!hand) return null;
  const { points, palmWidthPx, distanceMm } = hand;

  const wrist = points[0];
  const indexBase = points[5];
  const pinkyBase = points[17];
  const ringBase = points[13]; // ring finger MCP
  const ringMid = points[14]; // first joint

  // SPEC: a little way along the first segment of the ring finger.
  const centre = add(ringBase, scale(sub(ringMid, ringBase), 0.38));
  const fingerDir = normalize3(sub(ringMid, ringBase));

  // The head of a ring sits on the back of the hand (SPEC §5.3).
  const headDir = dorsalDirection(wrist, indexBase, pinkyBase, handedness, false);

  const yAxis = fingerDir;
  let zAxis = normalize3(sub(headDir, scale(yAxis, dot(headDir, yAxis))));
  if (length(zAxis) < 1e-6) zAxis = normalize3(cross(yAxis, [0, 0, 1]));
  const xAxis = normalize3(cross(yAxis, zAxis));

  return {
    position: centre,
    quaternion: quaternionFromBasis(xAxis, yAxis, zAxis),
    palmWidthPx,
    distanceMm,
  };
}

export { dot, normalize3, cross };


/**
 * Mirror a pose left-to-right.
 *
 * The front camera is shown mirrored, the way a mirror shows you yourself — but the 3D scene
 * over it is not mirrored, so a piece placed from the raw pose lands on the wrong side of the
 * frame and appears to slide away as the hand moves out from the middle. Reflecting the pose
 * puts it back on the hand as displayed. For a reflection in the plane x = 0, a rotation
 * (x, y, z, w) becomes (x, −y, −z, w).
 */
export function mirrorPose(pose: WristPose): WristPose {
  return {
    ...pose,
    position: [-pose.position[0], pose.position[1], pose.position[2]],
    quaternion: [pose.quaternion[0], -pose.quaternion[1], -pose.quaternion[2], pose.quaternion[3]],
  };
}
