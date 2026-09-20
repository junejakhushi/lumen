import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createBooking } from "@/lib/booking/create";
import { bookingSchema } from "@/lib/booking/types";
import { isBookableSlot } from "@/lib/slots";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Book a consultation (SPEC §5.6). */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input;
  try {
    input = bookingSchema.parse(await request.json());
  } catch (err) {
    const issues =
      err && typeof err === "object" && "issues" in err
        ? (err as { issues: { path: (string | number)[]; message: string }[] }).issues
        : [];
    return NextResponse.json(
      {
        error: "Something in the form needs a second look.",
        fields: issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 }
    );
  }

  // A slot has to be one the atelier actually offers, whatever the form sent.
  if (!isBookableSlot(new Date(input.slot_start))) {
    return NextResponse.json(
      { error: "That time is not one of the consultation slots. Please pick another." },
      { status: 400 }
    );
  }

  const result = await createBooking(input, {
    sessionId: session.sid ?? null,
    baseUrl: process.env.APP_BASE_URL ?? request.nextUrl.origin,
  });

  if (!result.ok) {
    const status = result.reason === "slot-taken" ? 409 : result.reason === "no-database" ? 503 : 500;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json(
    { ok: true, id: result.id, briefNo: result.briefNo, warnings: result.warnings },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
