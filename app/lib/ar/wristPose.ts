/**
 * Wrist pose solver for bracelet AR per SPEC §5.3.
 *
 * From MediaPipe HandLandmarker landmarks (21 3D points in NDC):
 * - Wrist centre = lm0 + 18mm along the forearm axis (normalize(lm0 − lm9))
 * - Palm normal = normalize(cross(lm5 − lm0, lm17 − lm0)), flipped for handedness
 * - Depth from palm width: z = f · PALM_WIDTH_MM / pixelDist(lm5, lm17)
 *   where f = (videoWidth / 2) / tan(FOV_DEG / 2 * π / 180)
 * - Build a quaternion: bracelet axis = forearm axis, up = palm normal
 */

export interface Landmark {
  x: number; // 0..1 normalized
  y: number;
  z: number;
}

export interface WristPose {
  /** Position in camera space (mm) */
  position: [number, number, number];
  /** Quaternion [x, y, z, w] */
  quaternion: [number, number, number, number];
  /** Palm width in pixels (for confidence) */
  palmWidthPx: number;
}

const WRIST_OFFSET_MM = 18;

function sub(a: Landmark, b: Landmark): [number, number, number] {
  return [a.x - b.x, a.y - b.y, a.z - b.z];
}

function normalize3(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  if (len < 1e-10) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Build a quaternion from an orthonormal basis (forward, up, right).
 * Uses the standard rotation matrix → quaternion conversion.
 */
function quaternionFromAxes(
  forward: [number, number, number],
  up: [number, number, number],
  right: [number, number, number]
): [number, number, number, number] {
  // Rotation matrix columns: right, up, forward
  const m00 = right[0], m01 = up[0], m02 = forward[0];
  const m10 = right[1], m11 = up[1], m12 = forward[1];
  const m20 = right[2], m21 = up[2], m22 = forward[2];

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

/**
 * Solve the wrist pose for bracelet placement.
 */
export function solveWristPose(
  landmarks: Landmark[],
  videoWidth: number,
  videoHeight: number,
  fovDeg: number,
  palmWidthMm: number
): WristPose | null {
  if (landmarks.length < 21) return null;

  const lm0 = landmarks[0]; // wrist
  const lm5 = landmarks[5]; // index MCP
  const lm9 = landmarks[9]; // middle MCP
  const lm17 = landmarks[17]; // pinky MCP

  // Forearm axis: direction from middle finger base toward wrist
  const forearmDir = normalize3(sub(lm0, lm9));

  // Palm normal
  const v05 = sub(lm5, lm0);
  const v017 = sub(lm17, lm0);
  let palmNormal = normalize3(cross(v05, v017));
  // Flip if pointing away from camera (z should be negative for front-facing)
  if (palmNormal[2] > 0) {
    palmNormal = [-palmNormal[0], -palmNormal[1], -palmNormal[2]];
  }

  // Palm width in pixels for depth estimation
  const palmWidthPx = Math.sqrt(
    ((lm5.x - lm17.x) * videoWidth) ** 2 +
    ((lm5.y - lm17.y) * videoHeight) ** 2
  );

  // Focal length from FOV
  const fovRad = (fovDeg * Math.PI) / 180;
  const focalPx = (videoWidth / 2) / Math.tan(fovRad / 2);

  // Depth from palm width
  const z = (focalPx * palmWidthMm) / palmWidthPx;

  // Wrist centre in pixel coords, offset along forearm
  const wristPxX = lm0.x * videoWidth + forearmDir[0] * WRIST_OFFSET_MM * (focalPx / z);
  const wristPxY = lm0.y * videoHeight + forearmDir[1] * WRIST_OFFSET_MM * (focalPx / z);

  // Unproject to camera space (mm)
  const cx = videoWidth / 2;
  const cy = videoHeight / 2;
  const posX = ((wristPxX - cx) / focalPx) * z;
  const posY = -((wristPxY - cy) / focalPx) * z; // flip Y for 3D
  const posZ = -z; // negative Z = in front of camera

  // Build orthonormal basis for the bracelet orientation
  // Forward = forearm axis (bracelet axis)
  const forward = forearmDir;
  // Up = palm normal
  const up = palmNormal;
  // Right = cross(up, forward)
  let right = normalize3(cross(up, forward));
  // Re-orthogonalize up
  const upOrtho = normalize3(cross(forward, right));

  const quaternion = quaternionFromAxes(forward, upOrtho, right);

  return {
    position: [posX, posY, posZ],
    quaternion,
    palmWidthPx,
  };
}

/**
 * Solve ring pose per SPEC §5.3 ring mode.
 * Position = lerp(lm13, lm14, 0.38) — ring finger proximal segment
 * Axis = normalize(lm14 − lm13) — along the finger
 * Head faces the back of the hand (palm normal flipped)
 */
export function solveRingPose(
  landmarks: Landmark[],
  videoWidth: number,
  videoHeight: number,
  fovDeg: number,
  palmWidthMm: number
): WristPose | null {
  if (landmarks.length < 21) return null;

  const lm5 = landmarks[5];
  const lm13 = landmarks[13]; // ring finger PIP
  const lm14 = landmarks[14]; // ring finger DIP
  const lm17 = landmarks[17];
  const lm0 = landmarks[0];

  // Palm width for depth
  const palmWidthPx = Math.sqrt(
    ((lm5.x - lm17.x) * videoWidth) ** 2 +
    ((lm5.y - lm17.y) * videoHeight) ** 2
  );

  const fovRad = (fovDeg * Math.PI) / 180;
  const focalPx = (videoWidth / 2) / Math.tan(fovRad / 2);
  const z = (focalPx * palmWidthMm) / palmWidthPx;

  // Ring position = lerp(lm13, lm14, 0.38)
  const t = 0.38;
  const ringPxX = (lm13.x + t * (lm14.x - lm13.x)) * videoWidth;
  const ringPxY = (lm13.y + t * (lm14.y - lm13.y)) * videoHeight;

  const cx = videoWidth / 2;
  const cy = videoHeight / 2;
  const posX = ((ringPxX - cx) / focalPx) * z;
  const posY = -((ringPxY - cy) / focalPx) * z;
  const posZ = -z;

  // Ring axis = along the finger
  const fingerDir = normalize3(sub(lm14, lm13));

  // Palm normal (head faces back of hand = flipped palm normal)
  const v05 = sub(lm5, lm0);
  const v017 = sub(lm17, lm0);
  let palmNormal = normalize3(cross(v05, v017));
  if (palmNormal[2] > 0) {
    palmNormal = [-palmNormal[0], -palmNormal[1], -palmNormal[2]];
  }
  // Flip for ring head direction
  const headDir: [number, number, number] = [-palmNormal[0], -palmNormal[1], -palmNormal[2]];

  // Build basis: forward = finger direction, up = head direction
  const forward = fingerDir;
  let right = normalize3(cross(headDir, forward));
  const up = normalize3(cross(forward, right));

  const quaternion = quaternionFromAxes(forward, up, right);

  return {
    position: [posX, posY, posZ],
    quaternion,
    palmWidthPx,
  };
}

// Re-export for unused var cleanup
export { dot };
