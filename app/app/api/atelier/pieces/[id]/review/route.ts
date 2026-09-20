import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { getCatalogPiece, saveReview } from "@/lib/atelier/pieces";
import { approvalBlockers, reviewSchema } from "@/lib/review";

export const dynamic = "force-dynamic";

/** Save the atelier's review of a piece (SPEC §5.7). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.isAtelier) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let review;
  try {
    review = reviewSchema.parse(await request.json());
  } catch (err) {
    const issues =
      err && typeof err === "object" && "issues" in err
        ? (err as { issues: unknown[] }).issues
        : undefined;
    return NextResponse.json(
      { error: "That doesn't look right. Check the fields and try again.", issues },
      { status: 400 }
    );
  }

  if (review.status === "approved") {
    const missing = approvalBlockers(review);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `A piece needs ${missing.join(" and ")} before it can be approved.` },
        { status: 400 }
      );
    }
  }

  const piece = await getCatalogPiece(id);
  if (!piece) {
    return NextResponse.json({ error: "No such piece." }, { status: 404 });
  }

  const saved = await saveReview(id, review);
  if (!saved.ok) {
    return NextResponse.json(
      { error: "Could not save the review. Is the piece published?" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, review, source: saved.source },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
