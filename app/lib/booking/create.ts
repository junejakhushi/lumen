import React from "react";
import { buildIcs, googleCalendarUrl } from "@/lib/ics";
import { atelierNotification, clientConfirmation, studioName } from "@/lib/email/messages";
import { sendEmail } from "@/lib/email/send";
import { renderPdf } from "@/lib/pdf/render";
import { DesignBriefDocument } from "@/lib/pdf/DesignBrief";
import { getPrivateObject, getSignedKeyUrl, putPrivateObject } from "@/lib/storage";
import { SLOT_CONFIG, formatInZone } from "@/lib/slots";
import { buildBriefData, briefNumber } from "./brief";
import type { BookingInput } from "./types";

/**
 * Create a consultation (SPEC §5.6).
 *
 * The slot is claimed first, inside the database, because that is the only step that can
 * conflict with another client. Snapshots, the brief and the emails follow; if any of them
 * fail the booking still stands and the failure is reported, because a client who has
 * committed to a time should not be told the booking failed over a PDF.
 */

export type CreateResult =
  | { ok: true; id: string; briefNo: string; briefKey: string | null; warnings: string[] }
  | { ok: false; reason: "slot-taken" | "no-database" | "error"; message: string };

function snapshotBuffer(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.split(",", 2)[1] ?? "", "base64");
}

export async function createBooking(
  input: BookingInput,
  options: { sessionId?: string | null; baseUrl?: string } = {}
): Promise<CreateResult> {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      reason: "no-database",
      message: "Bookings need a database. Set DATABASE_URL and run the migrations.",
    };
  }

  const slotStart = new Date(input.slot_start);
  const slotEnd = new Date(slotStart.getTime() + SLOT_CONFIG.durationMin * 60000);
  const warnings: string[] = [];

  const { pool } = await import("@/lib/db");
  const client = await pool.connect();
  let bookingId: string;
  try {
    await client.query("BEGIN");
    // slot_start is UNIQUE: whoever gets here second returns no row and loses cleanly.
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO bookings (slot_start, visit_type, client, looks, status, notes, session_id)
       VALUES ($1, $2, $3, $4, 'new', $5, $6)
       ON CONFLICT (slot_start) DO NOTHING
       RETURNING id`,
      [
        slotStart.toISOString(),
        input.visit_type,
        JSON.stringify({ ...input.client, notes: input.notes ?? null }),
        JSON.stringify(
          input.looks.map((look) => ({ ...look, snapshot: undefined, snapshot_key: null }))
        ),
        null, // bookings.notes is the atelier's own working note
        options.sessionId ?? input.session_id ?? null,
      ]
    );
    if (inserted.rows.length === 0) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        reason: "slot-taken",
        message: "That time has just been taken. Please choose another.",
      };
    }
    bookingId = inserted.rows[0].id;
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[booking] insert failed", err);
    return { ok: false, reason: "error", message: "Could not save the booking." };
  } finally {
    client.release();
  }

  // --- everything past this point is best-effort; the consultation is already booked ---

  const lookKeys: (string | null)[] = [];
  for (let i = 0; i < input.looks.length; i++) {
    const look = input.looks[i];
    if (!look.snapshot) {
      lookKeys.push(null);
      continue;
    }
    try {
      const key = `bookings/${bookingId}/look-${i + 1}.png`;
      await putPrivateObject(key, snapshotBuffer(look.snapshot), "image/png");
      lookKeys.push(key);
    } catch (err) {
      console.error("[booking] snapshot upload failed", err);
      warnings.push(`look ${i + 1}: snapshot could not be stored`);
      lookKeys.push(null);
    }
  }

  let briefKey: string | null = null;
  try {
    const data = buildBriefData({
      bookingId,
      slotStart,
      input,
      studioName: studioName(),
      clientTz: input.client_tz,
    });
    const pdf = await renderPdf(React.createElement(DesignBriefDocument, { d: data }));
    briefKey = `bookings/${bookingId}/design-brief.pdf`;
    await putPrivateObject(briefKey, pdf, "application/pdf");
  } catch (err) {
    console.error("[booking] brief failed", err);
    warnings.push("the design brief could not be generated");
    briefKey = null;
  }

  const ist = formatInZone(slotStart, SLOT_CONFIG.tz);
  const ics = buildIcs({
    uid: `${bookingId}@lumen`,
    start: slotStart,
    end: slotEnd,
    summary: `Consultation with ${studioName()}`,
    description:
      input.visit_type === "video"
        ? "A video consultation. The link is in your confirmation email."
        : "A studio consultation. The address is in your confirmation email.",
    location: input.visit_type === "in-studio" ? process.env.STUDIO_ADDRESS ?? "" : "",
    organizer: process.env.ATELIER_EMAIL
      ? { name: studioName(), email: process.env.ATELIER_EMAIL }
      : undefined,
  });
  let icsKey: string | null = null;
  try {
    icsKey = `bookings/${bookingId}/consultation.ics`;
    await putPrivateObject(icsKey, Buffer.from(ics, "utf-8"), "text/calendar");
  } catch {
    icsKey = null;
  }

  try {
    const { pool: p } = await import("@/lib/db");
    await p.query(
      `UPDATE bookings
       SET brief_key = $2,
           looks = $3
       WHERE id = $1`,
      [
        bookingId,
        briefKey,
        JSON.stringify(
          input.looks.map((look, i) => ({
            ...look,
            snapshot: undefined,
            snapshot_key: lookKeys[i],
          }))
        ),
      ]
    );
  } catch (err) {
    console.error("[booking] could not record the brief key", err);
    warnings.push("the brief was stored but not linked to the booking");
  }

  try {
    const briefUrl = briefKey ? await getSignedKeyUrl(briefKey) : null;
    const icsUrl = icsKey ? await getSignedKeyUrl(icsKey) : null;
    const lookImageUrls = await Promise.all(
      lookKeys.map((key) => (key ? getSignedKeyUrl(key) : Promise.resolve(null)))
    );
    const ctx = {
      bookingId,
      slotStart,
      input,
      briefUrl,
      icsUrl,
      googleCalendarUrl: googleCalendarUrl({
        uid: bookingId,
        start: slotStart,
        end: slotEnd,
        summary: `Consultation with ${studioName()}`,
      }),
      lookImageUrls,
      dashboardUrl: options.baseUrl ? `${options.baseUrl}/atelier/bookings/${bookingId}` : null,
    };

    const confirmation = await clientConfirmation(ctx);
    const brief = briefKey ? await downloadBrief(briefKey) : null;
    await sendEmail({
      ...confirmation,
      attachments: [
        { filename: "consultation.ics", content: Buffer.from(ics, "utf-8"), contentType: "text/calendar" },
        ...(brief
          ? [
              {
                filename: `design-brief-${briefNumber(bookingId)}.pdf`,
                content: brief,
                contentType: "application/pdf",
              },
            ]
          : []),
      ],
    });

    const notification = await atelierNotification(ctx);
    if (notification) {
      await sendEmail({
        ...notification,
        attachments: brief
          ? [
              {
                filename: `design-brief-${briefNumber(bookingId)}.pdf`,
                content: brief,
                contentType: "application/pdf",
              },
            ]
          : undefined,
      });
    } else {
      warnings.push("ATELIER_EMAIL is not set, so the atelier was not notified");
    }
  } catch (err) {
    console.error("[booking] email failed", err);
    warnings.push("the confirmation email could not be sent");
  }

  console.log(
    `[booking] ${bookingId} ${input.visit_type} ${ist.date} ${ist.time} IST` +
      (warnings.length ? ` warnings=${warnings.length}` : "")
  );

  return { ok: true, id: bookingId, briefNo: briefNumber(bookingId), briefKey, warnings };
}

/** Read the stored brief back, to attach it to the emails. */
async function downloadBrief(key: string): Promise<Buffer | null> {
  const object = await getPrivateObject(key);
  return object?.body ?? null;
}
