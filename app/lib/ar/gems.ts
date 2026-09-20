import * as THREE from "three";

/**
 * Procedural gems (SPEC §4.6, §5.3).
 *
 * The pipeline does not model stones — it measures the settings and writes down where each
 * one sits, how wide it is and which way it faces. The app draws them, so a client can swap
 * the stone without the piece being re-exported.
 */

/** Brand gem colours (public/brand/tokens). */
export const GEM_COLOURS = {
  diamond: "#EEF0F1",
  ruby: "#9B1B30",
  emerald: "#1F6B4E",
  sapphire: "#233F73",
  pearl: "#EFE7DA",
  polki: "#CDC4AE",
} as const;

export type GemType = keyof typeof GEM_COLOURS;

export interface HeadPlacement {
  /** Where the setting meets the band, in model coordinates. */
  origin: number[];
  /** Which way the stone faces. */
  axis: number[];
  /** Inner radius of the prongs, millimetres. */
  r_in_mm?: number;
  /** How far the head stands above the band. */
  rise_mm?: number;
}

/** The cuts a client can ask for. Each one has a different outline, so each one looks different. */
export const GEM_CUTS = [
  "round",
  "oval",
  "cushion",
  "princess",
  "emerald",
  "pear",
  "marquise",
] as const;

export type GemCut = (typeof GEM_CUTS)[number];

export interface GemOptions {
  diameterMm: number;
  type?: GemType;
  cut?: GemCut;
}

/**
 * The girdle outline of a cut, as points on a unit circle's worth of width.
 *
 * Everything below is built from this outline: a table above it, a pavilion below. That is
 * what actually distinguishes the cuts to the eye — a princess is square where a round is
 * round, and a marquise comes to two points.
 */
function girdleOutline(cut: GemCut): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const ring = (n: number, f: (t: number) => [number, number]) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = f((i / n) * Math.PI * 2);
      points.push(new THREE.Vector2(x, y));
    }
  };

  switch (cut) {
    case "oval":
      ring(16, (t) => [Math.cos(t), Math.sin(t) * 0.72]);
      break;
    case "cushion":
      // A squared-off circle: the corners are rounded, the sides nearly straight.
      ring(16, (t) => {
        const c = Math.cos(t);
        const s = Math.sin(t);
        const soften = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 0.62);
        return [soften(c), soften(s) * 0.92];
      });
      break;
    case "princess":
      ring(4, (t) => [Math.SQRT1_2 * Math.sign(Math.cos(t + 0.001)) * (Math.abs(Math.cos(t)) > 0.5 ? 1 : 1),
                      0]);
      points.length = 0;
      [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([x, y]) =>
        points.push(new THREE.Vector2(x * Math.SQRT1_2, y * Math.SQRT1_2))
      );
      break;
    case "emerald":
      // A rectangle with its corners cut off — the step cut's outline.
      [
        [0.62, 0.9], [0.9, 0.62], [0.9, -0.62], [0.62, -0.9],
        [-0.62, -0.9], [-0.9, -0.62], [-0.9, 0.62], [-0.62, 0.9],
      ].forEach(([x, y]) => points.push(new THREE.Vector2(x, y * 0.78)));
      break;
    case "pear":
      ring(18, (t) => {
        const taper = (1 + Math.cos(t)) / 2; // 1 at the point, 0 opposite
        const width = 0.78 * (1 - Math.pow(taper, 2.2));
        return [Math.cos(t), Math.sin(t) * width];
      });
      break;
    case "marquise":
      ring(18, (t) => [Math.cos(t), Math.sin(t) * 0.42 * Math.abs(Math.sin(t)) ** 0.35]);
      break;
    case "round":
    default:
      ring(12, (t) => [Math.cos(t), Math.sin(t)]);
  }
  return points;
}

/**
 * A faceted stone: a table, a crown down to the girdle, and a pavilion to the culet, built
 * from the cut's outline and shaded flat so it catches the light in planes.
 * Proportions follow the usual round-brilliant ratios — table 55%, crown 16%, pavilion 43%.
 */
export function gemGeometry(diameterMm: number, cut: GemCut = "round"): THREE.BufferGeometry {
  const r = diameterMm / 2;
  const outline = girdleOutline(cut);
  const n = outline.length;
  const crown = r * 0.16;
  const pavilion = -r * 0.43;
  const tableScale = cut === "emerald" || cut === "princess" ? 0.7 : 0.55;

  const positions: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);

  const girdle = outline.map((p) => new THREE.Vector3(p.x * r, 0, p.y * r));
  const table = outline.map((p) => new THREE.Vector3(p.x * r * tableScale, crown, p.y * r * tableScale));
  const culet = new THREE.Vector3(0, pavilion, 0);
  const tableCentre = new THREE.Vector3(0, crown, 0);

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(tableCentre, table[i], table[j]); // the table
    tri(table[i], girdle[i], girdle[j]); // crown facets
    tri(table[i], girdle[j], table[j]);
    tri(girdle[i], culet, girdle[j]); // pavilion facets
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Kept for callers that only ever wanted a round stone. */
export function brilliantGeometry(diameterMm: number): THREE.BufferGeometry {
  return gemGeometry(diameterMm, "round");
}

/**
 * A stone catches light by reflecting its surroundings sharply. Transmission would be truer
 * still, but it costs a render pass per frame, and this runs beside hand tracking on a phone.
 */
export function gemMaterial(type: GemType = "diamond"): THREE.MeshPhysicalMaterial {
  const colour = new THREE.Color(GEM_COLOURS[type]);
  const isOpaque = type === "pearl" || type === "polki";
  return new THREE.MeshPhysicalMaterial({
    color: colour,
    metalness: 0,
    roughness: isOpaque ? 0.35 : 0.02,
    ior: 2.4,
    reflectivity: 1,
    clearcoat: isOpaque ? 0.2 : 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: isOpaque ? 1.2 : 3,
    flatShading: true,
  });
}

/**
 * Build the stones for a set of heads, already in the piece's own coordinates.
 *
 * `transform` maps a point from the model's coordinates into the worn piece's — the same
 * normalise-and-bend the metal goes through, so the stones stay in their settings.
 */
export function buildGems(
  heads: HeadPlacement[],
  stoneDiameters: number[],
  options: {
    type?: GemType;
    cut?: GemCut;
    /** Multiplies the measured stone size, for a client who wants a larger stone. */
    sizeScale?: number;
    transformPoint: (p: THREE.Vector3) => THREE.Vector3;
    transformDirection: (origin: THREE.Vector3, dir: THREE.Vector3) => THREE.Vector3;
  }
): THREE.Group {
  const group = new THREE.Group();
  if (heads.length === 0) return group;

  const material = gemMaterial(options.type);
  const up = new THREE.Vector3(0, 1, 0);

  heads.forEach((head, i) => {
    if (!head.origin || head.origin.length !== 3 || !head.axis || head.axis.length !== 3) return;
    const measured = stoneDiameters[i] ?? (head.r_in_mm ? head.r_in_mm * 2 + 0.06 : 0);
    const diameter = measured * (options.sizeScale ?? 1);
    if (!(diameter > 0.2)) return;

    const origin = new THREE.Vector3(head.origin[0], head.origin[1], head.origin[2]);
    const axis = new THREE.Vector3(head.axis[0], head.axis[1], head.axis[2]).normalize();
    // The stone sits where the prongs grip it — high in the basket, so its table catches the
    // light rather than being shaded by the setting.
    const seat = origin.clone().addScaledVector(axis, (head.rise_mm ?? diameter) * 0.72);

    const placedSeat = options.transformPoint(seat);
    const placedAxis = options.transformDirection(seat, axis).normalize();

    const gem = new THREE.Mesh(gemGeometry(diameter, options.cut), material);
    gem.position.copy(placedSeat);
    gem.quaternion.setFromUnitVectors(up, placedAxis);
    gem.renderOrder = 2;
    group.add(gem);
  });

  return group;
}

/** Free a gem group's geometry and material. */
export function disposeGems(group: THREE.Object3D): void {
  const materials: THREE.Material[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material as THREE.Material;
      if (material && !materials.includes(material)) materials.push(material);
    }
  });
  materials.forEach((material) => material.dispose());
}
