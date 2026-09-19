import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { z } from "zod";

const eventSchema = z.object({
  type: z.string(),
  piece_id: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  session_id: z.string().optional(),
});

const batchSchema = z.union([
  eventSchema,
  z.array(eventSchema),
]);

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let events: z.infer<typeof eventSchema>[];
  try {
    const raw = await request.json();
    const parsed = batchSchema.parse(raw);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return NextResponse.json({ error: "Invalid event data" }, { status: 400 });
  }

  // Log to events hypertable if DB is available
  if (process.env.DATABASE_URL) {
    try {
      const { query } = await import("@/lib/db");
      for (const event of events) {
        await query(
          `INSERT INTO events (time, session_id, piece_id, type, payload)
           VALUES (now(), $1, $2, $3, $4)`,
          [
            event.session_id || session.accessCodeId,
            event.piece_id || null,
            event.type,
            event.payload ? JSON.stringify(event.payload) : null,
          ]
        );
      }
    } catch {
      // DB not available — log only
      console.log("[events]", events.length, "events");
    }
  }

  return NextResponse.json({ ok: true, count: events.length });
}
