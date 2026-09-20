import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function GET(request: NextRequest) {
  // Check session
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try DB first
  if (process.env.DATABASE_URL) {
    try {
      const { query } = await import("@/lib/db");
      const rows = await query<{
        id: string;
        manifest: Record<string, unknown>;
        name: string | null;
        collection: string | null;
        type: string;
      }>(
        `SELECT id, manifest, name, collection, type
         FROM pieces
         WHERE approved = true
         ORDER BY collection, name`
      );
      // An empty table on a laptop means the pieces have not been published yet; the
      // manifests on disk are then the better answer. On a server there are none to read.
      if (rows.length > 0) return NextResponse.json({ pieces: rows });
    } catch {
      // DB not available — fall through to dev fallback
    }
  }

  // DEV fallback: read manifests from ../private/assets_out/
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const assetsDir = path.resolve(
      process.cwd(),
      process.env.ASSETS_OUT_DIR ?? "../private/assets_out"
    );
    if (!fs.existsSync(assetsDir)) {
      return NextResponse.json({ pieces: [] });
    }
    const dirs = fs.readdirSync(assetsDir).filter((d: string) => d.startsWith("p_"));
    const pieces = [];
    for (const dir of dirs) {
      const manifestPath = path.join(assetsDir, dir, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        // Only approved pieces reach the client side, exactly as the DB query above does.
        if (manifest.review?.status !== "approved") continue;
        pieces.push({
          id: manifest.id || dir,
          manifest,
          name: manifest.review?.name || null,
          collection: manifest.review?.collection || null,
          type: manifest.type,
        });
      }
    }
    return NextResponse.json({ pieces });
  } catch {
    return NextResponse.json({ pieces: [] });
  }
}
