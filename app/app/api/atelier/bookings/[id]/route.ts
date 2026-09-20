import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { z } from "zod";
import { sessionOptions, type SessionData } from "@/lib/session";
import { getBooking, STATUSES, updateBooking } from "@/lib/atelier/bookings";
import { getSignedKeyUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  notes: z.string().max(4000).nullable().optional(),
});

async function requireAtelier(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  return session.isAtelier === true;
}

/** One consultation, with signed URLs for the looks and the brief. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAtelier(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) return NextResponse.json({ error: "No such consultation." }, { status: 404 });

  const looks = Array.isArray(booking.looks)
    ? (booking.looks as Array<Record<string, unknown>>)
    : [];
  const lookUrls = await Promise.all(
    looks.map((look) =>
      typeof look.snapshot_key === "string" ? getSignedKeyUrl(look.snapshot_key) : null
    )
  );
  const briefUrl = booking.brief_key ? await getSignedKeyUrl(booking.brief_key) : null;

  return NextResponse.json(
    { booking, lookUrls, briefUrl },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

/** Change the status, or leave a note. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAtelier(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let patch;
  try {
    patch = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "That change doesn't look right." }, { status: 400 });
  }

  const ok = await updateBooking(id, patch);
  if (!ok) return NextResponse.json({ error: "No such consultation." }, { status: 404 });

  const booking = await getBooking(id);
  return NextResponse.json(
    { ok: true, booking },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
