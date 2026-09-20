import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { emptyInsights, getInsights } from "@/lib/atelier/insights";

export const dynamic = "force-dynamic";

/** Demand insights (SPEC §5.7). Behind the gate, like everything else that reads the data. */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headers = { "Cache-Control": "private, no-store" };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { insights: emptyInsights(), error: "No database is configured, so there is nothing to count yet." },
      { headers }
    );
  }

  try {
    return NextResponse.json({ insights: await getInsights() }, { headers });
  } catch (err) {
    console.error("insights failed:", err);
    return NextResponse.json(
      { insights: emptyInsights(), error: "The insights could not be read just now." },
      { headers }
    );
  }
}
