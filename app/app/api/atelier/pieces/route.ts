import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { listCatalog } from "@/lib/atelier/pieces";
import { getSignedAssetUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Every piece for the atelier catalog, approved or not, each with a signed thumbnail URL. */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.isAtelier) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pieces, source } = await listCatalog();
  const withThumbs = await Promise.all(
    pieces.map(async (piece) => ({
      ...piece,
      thumbUrl: await getSignedAssetUrl(piece.id, "thumb").catch(() => null),
    }))
  );

  return NextResponse.json(
    { pieces: withThumbs, source },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
