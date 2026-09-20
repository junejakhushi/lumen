import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { lookSchema } from "@/lib/booking/types";
import { z } from "zod";
import React from "react";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  looks: z.array(lookSchema).max(4).default([]),
  name: z.string().trim().max(80).optional(),
});

/**
 * A Design Brief for the looks the client has saved, without booking a consultation
 * (SPEC §5.6).
 *
 * The brief a booking produces is the same document from the same builder; this one simply
 * has no appointment behind it, so the consultation block carries the next open slot as a
 * placeholder and the brief is marked as a preview.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  if (!session.accessCodeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "That look board could not be read." }, { status: 400 });
  }

  try {
    const [{ buildBriefData }, { DesignBriefDocument, sampleBrief }, { renderPdf }] =
      await Promise.all([
        import("@/lib/booking/brief"),
        import("@/lib/pdf/DesignBrief"),
        import("@/lib/pdf/render"),
      ]);

    const data =
      body.looks.length > 0
        ? buildBriefData({
            bookingId: "preview",
            slotStart: new Date(Date.now() + 24 * 3600 * 1000),
            studioName: process.env.STUDIO_NAME || "The Atelier",
            clientTz: null,
            input: {
              slot_start: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              visit_type: "in-studio",
              client: {
                name: body.name || "Your name",
                phone: "—",
                whatsapp: false,
                email: "you@example.com",
              },
              consent: true,
              looks: body.looks,
            },
          })
        : sampleBrief;

    const pdf = await renderPdf(React.createElement(DesignBriefDocument, { d: data }));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="design-brief.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("brief preview failed:", err);
    return NextResponse.json(
      { error: "The brief could not be drawn up just now." },
      { status: 500 }
    );
  }
}
