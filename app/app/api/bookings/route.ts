import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { z } from "zod";

const bookingSchema = z.object({
  visit_type: z.enum(["in-studio", "video"]),
  client: z.object({
    name: z.string().min(1).max(80),
    phone: z.string().min(7).max(20),
    whatsapp: z.boolean(),
    email: z.string().email(),
  }),
  occasion: z.string().optional(),
  needed_by: z.string().nullable().optional(),
  budget: z.string().optional(),
  looks: z.array(z.object({
    pieceId: z.string(),
    pieceName: z.string(),
    config: z.record(z.unknown()),
    quote: z.record(z.unknown()).optional(),
  })),
});

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bookingSchema>;
  try {
    const raw = await request.json();
    body = bookingSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid booking data" }, { status: 400 });
  }

  // Insert into DB if available (S1.5 will complete this)
  if (process.env.DATABASE_URL) {
    try {
      const { query } = await import("@/lib/db");
      const rows = await query<{ id: string }>(
        `INSERT INTO bookings (visit_type, client, looks, status)
         VALUES ($1, $2, $3, 'new')
         RETURNING id`,
        [
          body.visit_type,
          JSON.stringify(body.client),
          JSON.stringify(body.looks),
        ]
      );
      return NextResponse.json({ ok: true, id: rows[0]?.id });
    } catch (err) {
      console.error("[booking]", err);
    }
  }

  // Stub mode — log and return success
  console.log("[booking stub]", JSON.stringify(body, null, 2));
  return NextResponse.json({
    ok: true,
    id: `stub_${Date.now()}`,
    stub: true,
  });
}
