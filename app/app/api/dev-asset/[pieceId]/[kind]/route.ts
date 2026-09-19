import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { verifyDevAssetSig } from "@/lib/storage";
import fs from "node:fs";
import path from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  web: "model/gltf-binary",
  ar: "model/gltf-binary",
  thumb: "image/webp",
};

const FILE_NAMES: Record<string, string> = {
  web: "web.glb",
  ar: "ar.glb",
  thumb: "thumb.webp",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pieceId: string; kind: string }> }
) {
  // Only active in dev (no Spaces configured)
  if (process.env.SPACES_KEY) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { pieceId, kind } = await params;

  // Validate kind
  if (!["web", "ar", "thumb"].includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  // Check session
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify HMAC signature
  const expires = request.nextUrl.searchParams.get("expires") || "";
  const sig = request.nextUrl.searchParams.get("sig") || "";
  if (!verifyDevAssetSig(pieceId, kind, expires, sig)) {
    return NextResponse.json(
      { error: "Invalid or expired signature" },
      { status: 403 }
    );
  }

  // Serve from ../private/assets_out/
  const filePath = path.resolve(
    process.cwd(),
    "..",
    "private",
    "assets_out",
    pieceId,
    FILE_NAMES[kind]
  );

  // Prevent path traversal
  const assetsRoot = path.resolve(process.cwd(), "..", "private", "assets_out");
  if (!filePath.startsWith(assetsRoot)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[kind],
      "Cache-Control": "private, no-store",
    },
  });
}
