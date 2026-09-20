import { NextResponse } from "next/server";
import { DEMO_ATELIER_CODE, DEMO_CLIENT_CODE, isUnconfigured } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

/**
 * Whether this deployment has been configured at all. Public on purpose: it only ever says
 * "nothing is set up here", and on a configured deployment it says nothing else.
 */
export async function GET() {
  if (!isUnconfigured()) {
    return NextResponse.json({ demo: false }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { demo: true, clientCode: DEMO_CLIENT_CODE, atelierCode: DEMO_ATELIER_CODE },
    { headers: { "Cache-Control": "no-store" } }
  );
}
