import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { z } from "zod";
import { sessionOptions, type SessionData } from "@/lib/session";
import { generateSlots, groupByDay, SLOT_CONFIG } from "@/lib/slots";

export const dynamic = "force-dynamic";

const tzSchema = z.string().max(64).optional();

/** Free consultation slots, in the atelier's time and the client's (SPEC §5.6). */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = tzSchema.safeParse(request.nextUrl.searchParams.get("tz") ?? undefined);
  const clientTz = parsed.success ? parsed.data ?? null : null;

  let booked: string[] = [];
  if (process.env.DATABASE_URL) {
    try {
      const { query } = await import("@/lib/db");
      const rows = await query<{ slot_start: Date }>(
        `SELECT slot_start FROM bookings
         WHERE slot_start >= now() AND status <> 'no-show'`
      );
      booked = rows.map((r) => new Date(r.slot_start).toISOString());
    } catch (err) {
      // Better to offer slots and catch the clash on submit than to show an empty calendar.
      console.error("[slots] could not read bookings", err);
    }
  }

  const slots = generateSlots({ booked, clientTz });
  return NextResponse.json(
    {
      tz: SLOT_CONFIG.tz,
      clientTz: slots[0]?.local?.tz ?? null,
      durationMin: SLOT_CONFIG.durationMin,
      days: groupByDay(slots),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
