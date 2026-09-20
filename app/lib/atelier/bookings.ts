import { formatInZone, SLOT_CONFIG } from "@/lib/slots";
import type { BookingRow } from "@/lib/booking/types";
import type { BookingStatus, BookingSummary } from "./bookingTypes";

/** Consultations for the atelier dashboard (SPEC §5.7). Server only: this talks to the database. */

export type { BookingStatus, BookingSummary } from "./bookingTypes";
export { STATUSES } from "./bookingTypes";

function decorate(row: BookingRow): BookingSummary {
  const looks = Array.isArray(row.looks) ? row.looks : [];
  return {
    ...row,
    ist: formatInZone(new Date(row.slot_start), SLOT_CONFIG.tz),
    lookCount: looks.length,
    briefAvailable: Boolean(row.brief_key),
  };
}

export async function listBookings(): Promise<BookingSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  const { query } = await import("@/lib/db");
  const rows = await query<BookingRow>(
    `SELECT id, slot_start, visit_type, client, looks, brief_key, status, notes, session_id, created_at
     FROM bookings
     ORDER BY slot_start ASC`
  );
  return rows.map(decorate);
}

export async function getBooking(id: string): Promise<BookingSummary | null> {
  if (!process.env.DATABASE_URL) return null;
  const { query } = await import("@/lib/db");
  const rows = await query<BookingRow>(
    `SELECT id, slot_start, visit_type, client, looks, brief_key, status, notes, session_id, created_at
     FROM bookings WHERE id = $1`,
    [id]
  );
  return rows[0] ? decorate(rows[0]) : null;
}

export async function updateBooking(
  id: string,
  patch: { status?: BookingStatus; notes?: string | null }
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const { pool } = await import("@/lib/db");
  const result = await pool.query(
    `UPDATE bookings
     SET status = COALESCE($2, status),
         notes  = COALESCE($3, notes)
     WHERE id = $1`,
    [id, patch.status ?? null, patch.notes ?? null]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Group by day in the atelier's timezone, newest day first for past, soonest first ahead. */
export function groupByDay(bookings: BookingSummary[]): Array<{
  date: string;
  weekday: string;
  bookings: BookingSummary[];
}> {
  const days = new Map<string, { date: string; weekday: string; bookings: BookingSummary[] }>();
  for (const booking of bookings) {
    const key = booking.ist.date;
    if (!days.has(key)) {
      days.set(key, { date: key, weekday: booking.ist.weekday, bookings: [] });
    }
    days.get(key)!.bookings.push(booking);
  }
  return Array.from(days.values());
}
