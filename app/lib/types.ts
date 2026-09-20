/** Manifest shape from the pipeline (SPEC §4.8) */
export interface PieceManifest {
  id: string;
  type: "bracelet" | "ring" | "tops" | "unknown";
  layers: number;
  layer_t: number;
  volume_mm3: number;
  volume_recon_mm3: number;
  weights_g: Record<string, number>;
  /** The pipeline writes corners and extents, not a bare triple (SPEC §4.8). */
  bbox_mm: { min: number[]; max: number[]; size: number[] };
  curve?: {
    inner_radius_mm: number;
    span_deg: number;
    plane_normal: [number, number, number];
    /** Centre of the fitted circle, in the model's own coordinates. */
    center: [number, number, number];
    ref_dir?: [number, number, number];
    start_deg?: number;
    end_deg?: number;
    outer_radius_mm?: number;
    fit_inliers?: number;
  };
  heads?: Array<{
    axis: [number, number, number];
    origin: [number, number, number];
    prongs: number;
    prong_w_mm: number;
    r_in_mm: number;
  }>;
  stones?: Array<{
    d_mm: number;
    ct_est: number;
    source: string;
  }>;
  array?: { count: number; spacing_deg: number };
  segment?: {
    chord_mm: number;
    arc_len_mm: number;
    ends: Array<{ center: number[]; tangent: number[]; connector: string }>;
    connector: string;
  };
  ring?: {
    inner_d_mm: number;
    size_in: number;
    size_us: number;
    band_w_mm: number;
    band_t_mm: number;
    top_angle_deg: number;
  };
  tops?: {
    front: [number, number, number];
    post: { origin: [number, number, number]; axis: [number, number, number] } | null;
  };
  warnings: string[];
  /** Written by the atelier in /atelier/catalog (lib/review.ts). */
  review?: {
    status: string;
    type: string;
    name: string | null;
    collection: string | null;
    story?: string | null;
    overrides: Record<string, unknown>;
  };
}

/** DB row for a piece */
export interface PieceRow {
  id: string;
  manifest: PieceManifest;
  approved: boolean;
  name: string | null;
  collection: string | null;
  type: string;
}

/** Alloy densities (g/cm³) from SPEC §4.4 */
export const ALLOY_DENSITIES: Record<string, number> = {
  "14k_y": 13.1,
  "14k_w": 12.9,
  "14k_r": 13.0,
  "18k_y": 15.5,
  "18k_w": 14.7,
  "18k_r": 15.2,
  "22k_y": 17.8,
  "pt950": 20.7,
};

/** Purity fractions by karat */
export const PURITY: Record<string, number> = {
  "14": 0.585,
  "18": 0.75,
  "22": 0.916,
};

/** Metal color presets for 3D rendering */
export const METAL_COLORS = {
  yellow: "#E1B866",
  white: "#D8D8D4",
  rose: "#D3A08A",
  platinum: "#E0E0E0",
} as const;

export type MetalColor = keyof typeof METAL_COLORS;

/** Indian ring sizes with US equivalents and inner diameters */
export const RING_SIZES: Array<{
  indian: number;
  us: number;
  inner_d_mm: number;
}> = [
  { indian: 1, us: 1, inner_d_mm: 12.45 },
  { indian: 2, us: 1.5, inner_d_mm: 12.85 },
  { indian: 3, us: 2, inner_d_mm: 13.26 },
  { indian: 4, us: 2.5, inner_d_mm: 13.67 },
  { indian: 5, us: 3, inner_d_mm: 14.07 },
  { indian: 6, us: 3.5, inner_d_mm: 14.48 },
  { indian: 7, us: 4, inner_d_mm: 14.88 },
  { indian: 8, us: 4.5, inner_d_mm: 15.29 },
  { indian: 9, us: 5, inner_d_mm: 15.49 },
  { indian: 10, us: 5.5, inner_d_mm: 15.90 },
  { indian: 11, us: 6, inner_d_mm: 16.31 },
  { indian: 12, us: 6.5, inner_d_mm: 16.71 },
  { indian: 13, us: 7, inner_d_mm: 17.12 },
  { indian: 14, us: 7.5, inner_d_mm: 17.53 },
  { indian: 15, us: 8, inner_d_mm: 17.93 },
  { indian: 16, us: 8.5, inner_d_mm: 18.34 },
  { indian: 17, us: 9, inner_d_mm: 18.75 },
  { indian: 18, us: 9.5, inner_d_mm: 19.15 },
  { indian: 19, us: 10, inner_d_mm: 19.56 },
  { indian: 20, us: 10.5, inner_d_mm: 19.96 },
  { indian: 21, us: 11, inner_d_mm: 20.37 },
  { indian: 22, us: 11.5, inner_d_mm: 20.78 },
  { indian: 23, us: 12, inner_d_mm: 21.18 },
  { indian: 24, us: 12.5, inner_d_mm: 21.59 },
  { indian: 25, us: 13, inner_d_mm: 21.99 },
];
