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

export interface GemOptions {
  diameterMm: number;
  type?: GemType;
}

/**
 * A round brilliant, near enough: a table, a crown down to the girdle, and a pavilion to the
 * culet, turned as eight facets so it catches the light in flat planes rather than a smooth
 * blur. Proportions follow the usual cut — table 55% of the girdle, crown 16%, pavilion 43%.
 */
export function brilliantGeometry(diameterMm: number, facets = 8): THREE.BufferGeometry {
  const r = diameterMm / 2;
  const profile = [
    new THREE.Vector2(0, r * 0.16), // centre of the table
    new THREE.Vector2(r * 0.55, r * 0.16), // table edge
    new THREE.Vector2(r, 0), // girdle
    new THREE.Vector2(r * 0.5, -r * 0.24),
    new THREE.Vector2(0, -r * 0.43), // culet
  ];
  const geometry = new THREE.LatheGeometry(profile, facets);
  geometry.computeVertexNormals();
  return geometry;
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
    const diameter = stoneDiameters[i] ?? (head.r_in_mm ? head.r_in_mm * 2 + 0.06 : 0);
    if (!(diameter > 0.2)) return;

    const origin = new THREE.Vector3(head.origin[0], head.origin[1], head.origin[2]);
    const axis = new THREE.Vector3(head.axis[0], head.axis[1], head.axis[2]).normalize();
    // The stone sits where the prongs grip it — high in the basket, so its table catches the
    // light rather than being shaded by the setting.
    const seat = origin.clone().addScaledVector(axis, (head.rise_mm ?? diameter) * 0.72);

    const placedSeat = options.transformPoint(seat);
    const placedAxis = options.transformDirection(seat, axis).normalize();

    const gem = new THREE.Mesh(brilliantGeometry(diameter), material);
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
