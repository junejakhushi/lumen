import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { getPrivateObject, verifyKeySig } from "@/lib/storage";

/**
 * Stands in for signed Spaces URLs when no bucket is configured: serves private files
 * (booking snapshots, briefs) from wherever they were stored — the local private/ folder in
 * development, the database on a read-only serverless filesystem. Same rules as the real
 * thing: a session, a short-lived signature, and never cached.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key: segments } = await params;
  const key = segments.map(decodeURIComponent).join("/");
  const expires = request.nextUrl.searchParams.get("expires") ?? "";
  const sig = request.nextUrl.searchParams.get("sig") ?? "";
  if (!verifyKeySig(key, expires, sig)) {
    return NextResponse.json({ error: "Invalid or expired signature" }, { status: 403 });
  }

  const object = await getPrivateObject(key);
  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
