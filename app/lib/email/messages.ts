import { readFile } from "node:fs/promises";
import path from "node:path";
import { formatInZone, SLOT_CONFIG, zoneAbbreviation } from "@/lib/slots";
import { configLine, metalLabel, briefNumber, changesFor } from "@/lib/booking/brief";
import type { BookingInput } from "@/lib/booking/types";
import { renderTemplate, type TemplateData } from "./render";
import type { Message } from "./send";

/**
 * The transactional emails, filled from the templates Claude Design delivered
 * (public/brand/emails/*.html, placeholders listed in their README).
 */

export type TemplateName =
  | "client-confirmation"
  | "atelier-notification"
  | "reminder-24h"
  | "atelier-daily-digest";

export async function loadTemplate(name: TemplateName): Promise<string> {
  const file = path.join(process.cwd(), "public", "brand", "emails", `${name}.html`);
  return readFile(file, "utf-8");
}

export function studioName(): string {
  return process.env.STUDIO_NAME || "The Atelier";
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

export interface BookingEmailContext {
  bookingId: string;
  slotStart: Date;
  input: BookingInput;
  /** Signed URLs, already short-lived. */
  briefUrl?: string | null;
  icsUrl?: string | null;
  googleCalendarUrl?: string | null;
  lookImageUrls?: (string | null)[];
  dashboardUrl?: string | null;
  assetBase?: string;
}

function times(ctx: BookingEmailContext) {
  const tz = SLOT_CONFIG.tz;
  const ist = formatInZone(ctx.slotStart, tz);
  const clientTz = ctx.input.client_tz && ctx.input.client_tz !== tz ? ctx.input.client_tz : null;
  const local = clientTz ? formatInZone(ctx.slotStart, clientTz) : null;
  return {
    date_ist: ist.date,
    time_ist: ist.time,
    time_local: local ? local.time : "",
    tz_local: clientTz ? zoneAbbreviation(ctx.slotStart, clientTz) : "",
  };
}

function lookFields(ctx: BookingEmailContext): TemplateData {
  const fields: TemplateData = {};
  ctx.input.looks.slice(0, 3).forEach((look, i) => {
    const n = i + 1;
    fields[`look_${n}_name`] = look.pieceName;
    fields[`look_${n}_code`] = look.pieceId;
    fields[`look_${n}_metal`] = `${metalLabel(look.config.metal)} · ${look.config.karat}K`;
    fields[`look_${n}_img`] = ctx.lookImageUrls?.[i] ?? "";
  });
  return fields;
}

export async function clientConfirmation(ctx: BookingEmailContext): Promise<Message> {
  const t = times(ctx);
  const inStudio = ctx.input.visit_type === "in-studio";
  const data: TemplateData = {
    ...t,
    ...lookFields(ctx),
    asset_base: ctx.assetBase ?? "",
    brief_id: briefNumber(ctx.bookingId),
    brief_url: ctx.briefUrl ?? "",
    calendar_ics_url: ctx.icsUrl ?? "",
    google_calendar_url: ctx.googleCalendarUrl ?? "",
    client_first_name: firstName(ctx.input.client.name),
    studio_name: studioName(),
    studio_address: process.env.STUDIO_ADDRESS ?? "",
    video_link: process.env.STUDIO_VIDEO_LINK ?? "",
    visit_type: inStudio ? "Studio visit" : "Video call",
    in_studio: inStudio,
    video_call: !inStudio,
  };
  const html = renderTemplate(await loadTemplate("client-confirmation"), data);
  return {
    to: ctx.input.client.email,
    subject: `Your consultation with ${studioName()}`,
    html,
  };
}

export async function atelierNotification(ctx: BookingEmailContext): Promise<Message | null> {
  const to = process.env.ATELIER_EMAIL;
  if (!to) return null;
  const t = times(ctx);
  const hero = ctx.input.looks[0];
  const data: TemplateData = {
    ...t,
    asset_base: ctx.assetBase ?? "",
    brief_id: briefNumber(ctx.bookingId),
    budget: ctx.input.budget ?? "—",
    client_email: ctx.input.client.email,
    client_name: ctx.input.client.name,
    client_notes: ctx.input.notes ?? "",
    client_phone: ctx.input.client.phone,
    dashboard_url: ctx.dashboardUrl ?? "",
    needed_by: ctx.input.needed_by ?? "—",
    occasion: ctx.input.occasion ?? "—",
    prefers_whatsapp: ctx.input.client.whatsapp,
    studio_name: studioName(),
    visit_type: ctx.input.visit_type === "in-studio" ? "Studio visit" : "Video call",
    piece_name: hero?.pieceName ?? "—",
    piece_code: hero?.pieceId ?? "—",
    piece_metal: hero ? configLine(hero) : "—",
    pieces: ctx.input.looks.map((look) => ({
      piece_name: look.pieceName,
      piece_code: look.pieceId,
      piece_metal: configLine(look),
    })),
    changes: hero
      ? changesFor(hero).map((c) => ({
          attribute: c.attribute,
          original: c.original,
          requested: c.requested,
        }))
      : [],
  };
  const html = renderTemplate(await loadTemplate("atelier-notification"), data);
  return {
    to,
    subject: `New consultation · ${ctx.input.client.name} · ${t.date_ist}`,
    html,
    replyTo: ctx.input.client.email,
  };
}

export interface DigestSession {
  session_id: string;
  started: string;
  duration_min: number;
  pieces_worn: number;
  snapshots: number;
  outcome: string;
  interest_score: number;
  favourite: string;
  url: string;
}

export async function dailyDigest(sessions: DigestSession[], date: string): Promise<Message | null> {
  const to = process.env.ATELIER_EMAIL;
  if (!to) return null;
  const data: TemplateData = {
    studio_name: studioName(),
    date_ist: date,
    session_count: sessions.length,
    sessions: sessions.map((s) => ({ ...s })),
    dashboard_url: process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/atelier/sessions` : "",
    asset_base: "",
  };
  const html = renderTemplate(await loadTemplate("atelier-daily-digest"), data);
  return { to, subject: `Today at ${studioName()} · ${sessions.length} sessions`, html };
}
