import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { z } from "zod";

const quoteSchema = z.object({
  session_id: z.string().optional(),
  piece_id: z.string(),
  config: z.object({
    metal: z.string(),
    karat: z.string(),
    wrist_cm: z.number().optional(),
    ring_size_in: z.number().optional(),
    stone_type: z.string().max(20).optional(),
    stone_cut: z.string().max(20).optional(),
    stone_scale: z.number().min(0.5).max(3).optional(),
  }),
  breakdown: z.object({
    weight_g: z.number(),
    metal_value: z.number(),
    making: z.number(),
    stones_value: z.number(),
    tax: z.number(),
    total: z.number(),
  }),
  total: z.number(),
});

export async function POST(request: NextRequest) {
  // Check session
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof quoteSchema>;
  try {
    const raw = await request.json();
    body = quoteSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid quote data" }, { status: 400 });
  }

  // Log to quotes hypertable if DB is available
  if (process.env.DATABASE_URL) {
    try {
      const { query } = await import("@/lib/db");
      await query(
        `INSERT INTO quotes (time, session_id, piece_id, config, breakdown, total)
         VALUES (now(), $1, $2, $3, $4, $5)`,
        [
          session.sid ?? body.session_id ?? session.accessCodeId,
          body.piece_id,
          JSON.stringify(body.config),
          JSON.stringify(body.breakdown),
          body.total,
        ]
      );
    } catch {
      // DB not available — log only
      console.log("[quote]", body.piece_id, body.total);
    }
  }

  return NextResponse.json({ ok: true, total: body.total });
}
