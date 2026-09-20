import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { groupByDay, listBookings } from "@/lib/atelier/bookings";

export const dynamic = "force-dynamic";

/** Consultations, grouped by day (SPEC §5.7). */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.isAtelier) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { days: [], error: "No database configured, so there are no consultations to show." },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  try {
    const bookings = await listBookings();
    return NextResponse.json(
      { days: groupByDay(bookings), total: bookings.length },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error("[atelier/bookings]", err);
    return NextResponse.json({ error: "Could not read the consultations." }, { status: 500 });
  }
}
