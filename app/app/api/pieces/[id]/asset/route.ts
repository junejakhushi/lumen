import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { getSignedAssetUrl } from "@/lib/storage";
import { z } from "zod";

const kindSchema = z.enum(["web", "ar", "thumb"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check session
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind");

  const parsed = kindSchema.safeParse(kind);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid kind. Must be web, ar, or thumb." },
      { status: 400 }
    );
  }

  try {
    const url = await getSignedAssetUrl(id, parsed.data);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
