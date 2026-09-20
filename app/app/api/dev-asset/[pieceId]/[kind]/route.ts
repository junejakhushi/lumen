import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { getPrivateObject, verifyDevAssetSig } from "@/lib/storage";
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

  // The pipeline's output folder, when it is there (a developer's machine).
  const assetsRoot = path.resolve(
    process.cwd(),
    process.env.ASSETS_OUT_DIR ?? "../private/assets_out"
  );
  const filePath = path.resolve(assetsRoot, pieceId, FILE_NAMES[kind]);
  if (!filePath.startsWith(assetsRoot)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  let fileBuffer: Buffer | null = fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;

  if (!fileBuffer) {
    // Otherwise wherever `lumen publish` put it — the database, on a deployment with no
    // object storage.
    const stored = await getPrivateObject(`pieces/${pieceId}/${FILE_NAMES[kind]}`);
    fileBuffer = stored?.body ?? null;
  }

  if (!fileBuffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[kind],
      "Cache-Control": "private, no-store",
    },
  });
}
