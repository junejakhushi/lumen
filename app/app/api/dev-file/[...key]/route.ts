import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { devPrivateDir, verifyKeySig } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".ics": "text/calendar",
  ".json": "application/json",
};

/**
 * Dev stand-in for signed Spaces URLs: serves private files (booking snapshots, briefs)
 * from private/ when no bucket is configured. Same rules as the real thing — a session, a
 * short-lived signature, and never cached.
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

  const root = path.resolve(process.cwd(), devPrivateDir());
  const file = path.resolve(root, key);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(fs.readFileSync(file), {
    status: 200,
    headers: {
      "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
