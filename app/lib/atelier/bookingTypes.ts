import type { BookingRow } from "@/lib/booking/types";

/** Shapes shared by the atelier API and its pages. No database imports: this runs in the browser. */

export interface BookingSummary extends BookingRow {
  ist: { date: string; time: string; weekday: string };
  lookCount: number;
  briefAvailable: boolean;
}

export const STATUSES = ["new", "confirmed", "completed", "no-show"] as const;
export type BookingStatus = (typeof STATUSES)[number];
