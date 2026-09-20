import { z } from "zod";
import { COLLECTIONS } from "@/lib/review";

/** What the /book form sends (SPEC §5.6). Snapshots come as PNG data URLs from IndexedDB. */

const DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
export const MAX_SNAPSHOT_BYTES = 3 * 1024 * 1024;
export const MAX_LOOKS = 6;

export const lookSchema = z.object({
  pieceId: z.string().min(1).max(64),
  pieceName: z.string().min(1).max(120),
  pieceType: z.enum(["bracelet", "ring", "tops", "unknown"]).default("unknown"),
  collection: z.enum(COLLECTIONS).nullable().optional(),
  story: z.string().max(400).nullable().optional(),
  stones: z.string().max(200).nullable().optional(),
  config: z.object({
    metal: z.string().min(1).max(20),
    karat: z.string().min(1).max(8),
    wristCm: z.number().min(10).max(25).optional(),
    ringSizeIn: z.number().min(1).max(35).optional(),
    ringSizeUs: z.number().min(0).max(20).optional(),
  }),
  /** The catalogue version, so the brief can show original → requested. */
  original: z
    .object({
      metal: z.string().max(20).optional(),
      karat: z.string().max(8).optional(),
      wristCm: z.number().optional(),
      ringSizeIn: z.number().optional(),
      weightG: z.number().optional(),
    })
    .optional(),
  weightG: z.number().min(0).max(5000).optional(),
  quoteTotal: z.number().min(0).max(100_000_000).optional(),
  originalQuoteTotal: z.number().min(0).max(100_000_000).optional(),
  quoteBreakdown: z.record(z.unknown()).optional(),
  snapshot: z
    .string()
    .regex(DATA_URL, "snapshot must be a PNG data URL")
    .refine((s) => s.length <= MAX_SNAPSHOT_BYTES * 1.4, "snapshot is too large")
    .nullable()
    .optional(),
});

export const bookingSchema = z.object({
  slot_start: z.string().datetime({ offset: true }),
  visit_type: z.enum(["in-studio", "video"]),
  client: z.object({
    name: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(7).max(20),
    whatsapp: z.boolean().default(false),
    email: z.string().trim().email().max(160),
  }),
  occasion: z.string().trim().max(80).nullable().optional(),
  needed_by: z.string().trim().max(40).nullable().optional(),
  budget: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(1200).nullable().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "consent is required before a booking can be made" }),
  }),
  client_tz: z.string().max(64).nullable().optional(),
  session_id: z.string().uuid().nullable().optional(),
  looks: z.array(lookSchema).max(MAX_LOOKS).default([]),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type BookingLook = z.infer<typeof lookSchema>;

export interface BookingRow extends Record<string, unknown> {
  id: string;
  slot_start: string;
  visit_type: "in-studio" | "video";
  client: { name: string; phone: string; whatsapp: boolean; email: string };
  looks: unknown;
  brief_key: string | null;
  status: "new" | "confirmed" | "completed" | "no-show";
  notes: string | null;
  session_id: string | null;
  created_at: string;
}
