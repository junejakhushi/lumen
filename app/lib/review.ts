import { z } from "zod";

/**
 * Atelier review of a piece (SPEC §4.8 `manifest.review`, §5.7 catalog review).
 *
 * The pipeline writes `{status: "pending", type}` and never touches the rest; everything
 * here is owned by the atelier and survives re-publishing.
 */

export const COLLECTIONS = ["Heirloom", "Fine", "Playful"] as const;
export const PIECE_TYPES = ["bracelet", "ring", "tops", "unknown"] as const;
export const REVIEW_STATUSES = ["pending", "approved", "hidden"] as const;
export const STONE_SHAPES = [
  "round",
  "oval",
  "pear",
  "marquise",
  "emerald",
  "princess",
  "cushion",
  "polki",
] as const;
export const CONNECTORS = ["butt", "hole"] as const;

export const STORY_MAX = 240; // two lines
export const NAME_MAX = 60;

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s.length === 0 ? null : s))
    .nullable();

export const overridesSchema = z.object({
  stone_shape: z.enum(STONE_SHAPES).nullable().default(null),
  stone_d_mm: z.number().min(0.5).max(25).nullable().default(null),
  connector: z.enum(CONNECTORS).nullable().default(null),
});

export const reviewSchema = z.object({
  status: z.enum(REVIEW_STATUSES),
  type: z.enum(PIECE_TYPES),
  name: nullableTrimmed(NAME_MAX).default(null),
  collection: z.enum(COLLECTIONS).nullable().default(null),
  story: nullableTrimmed(STORY_MAX).default(null),
  overrides: overridesSchema.default({
    stone_shape: null,
    stone_d_mm: null,
    connector: null,
  }),
});

export type Review = z.infer<typeof reviewSchema>;
export type ReviewOverrides = z.infer<typeof overridesSchema>;
export type Collection = (typeof COLLECTIONS)[number];
export type PieceType = (typeof PIECE_TYPES)[number];

/** A piece may not be shown to clients until it is named and placed in a collection. */
export function approvalBlockers(review: Review): string[] {
  const missing: string[] = [];
  if (!review.name) missing.push("a name");
  if (!review.collection) missing.push("a collection");
  return missing;
}

/** The review as stored by the pipeline for a piece that has never been reviewed. */
export function defaultReview(type: string): Review {
  const parsed = PIECE_TYPES.includes(type as PieceType) ? (type as PieceType) : "unknown";
  return {
    status: "pending",
    type: parsed,
    name: null,
    collection: null,
    story: null,
    overrides: { stone_shape: null, stone_d_mm: null, connector: null },
  };
}

/** Merge whatever is on disk / in the DB with the defaults, tolerating older shapes. */
export function normaliseReview(raw: unknown, fallbackType: string): Review {
  const base = defaultReview(fallbackType);
  if (!raw || typeof raw !== "object") return base;
  const result = reviewSchema.safeParse({ ...base, ...(raw as Record<string, unknown>) });
  return result.success ? result.data : base;
}
