import { formatInZone, formatLongDate, SLOT_CONFIG, zoneAbbreviation } from "@/lib/slots";
import { formatPriceRange } from "@/lib/pricing";
import type { Change, DesignBriefData, Look, PlaceholderName } from "@/lib/pdf/DesignBrief";
import type { BookingInput, BookingLook } from "./types";

/**
 * Turn a booking into the data the delivered Design Brief component expects
 * (lib/pdf/DesignBrief.tsx · DesignBriefData).
 *
 * Nothing here invents a number: weights, sizes and prices come from the look the client
 * saved, which came from the pipeline's manifest and lib/pricing.
 */

const METAL_LABELS: Record<string, string> = {
  yellow: "Yellow gold",
  white: "White gold",
  rose: "Rose gold",
  platinum: "Platinum",
};

/** The design pack drew four pieces of line art; each type gets the closest one. */
function placeholderFor(type: string): PlaceholderName {
  if (type === "ring" || type === "tops") return "solitaire-ring";
  return "bracelet";
}

export function briefNumber(bookingId: string): string {
  const compact = bookingId.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `LUM-${compact.slice(0, 4) || "0001"}`;
}

export function metalLabel(metal: string): string {
  return METAL_LABELS[metal] ?? metal;
}

export function sizeLabel(look: BookingLook): string {
  if (typeof look.config.wristCm === "number") return `Wrist ${look.config.wristCm} cm`;
  if (typeof look.config.ringSizeIn === "number") {
    const us = look.config.ringSizeUs;
    return us ? `IN ${look.config.ringSizeIn} · US ${us}` : `IN ${look.config.ringSizeIn}`;
  }
  return "One size";
}

export function configLine(look: BookingLook): string {
  return [metalLabel(look.config.metal), `${look.config.karat}K`, sizeLabel(look)]
    .filter(Boolean)
    .join(" · ");
}

/** Indicative range: ±8% around the quote, as the price pill shows it. */
export function indicativeRange(total: number | null | undefined): string | null {
  if (!total || total <= 0) return null;
  return formatPriceRange(Math.round(total * 0.92), Math.round(total * 1.08));
}

/** What the client changed from the catalogue version, for the "original → requested" table. */
export function changesFor(look: BookingLook): Change[] {
  const changes: Change[] = [];
  const original = look.original ?? {};
  if (original.metal && original.metal !== look.config.metal) {
    changes.push({
      attribute: "Metal",
      original: metalLabel(original.metal),
      requested: metalLabel(look.config.metal),
    });
  }
  if (original.karat && original.karat !== look.config.karat) {
    changes.push({
      attribute: "Karat",
      original: `${original.karat}K`,
      requested: `${look.config.karat}K`,
    });
  }
  if (
    typeof original.wristCm === "number" &&
    typeof look.config.wristCm === "number" &&
    original.wristCm !== look.config.wristCm
  ) {
    changes.push({
      attribute: "Wrist size",
      original: `${original.wristCm} cm`,
      requested: `${look.config.wristCm} cm`,
    });
  }
  if (
    typeof original.ringSizeIn === "number" &&
    typeof look.config.ringSizeIn === "number" &&
    original.ringSizeIn !== look.config.ringSizeIn
  ) {
    changes.push({
      attribute: "Ring size",
      original: `IN ${original.ringSizeIn}`,
      requested: `IN ${look.config.ringSizeIn}`,
    });
  }
  if (typeof original.weightG === "number" && typeof look.weightG === "number") {
    const delta = Math.abs(original.weightG - look.weightG);
    if (delta >= 0.05) {
      changes.push({
        attribute: "Weight",
        original: `As shown (${original.weightG.toFixed(1)} g)`,
        requested: `${look.weightG.toFixed(1)} g at the requested size`,
      });
    }
  }
  return changes;
}

export interface BriefContext {
  bookingId: string;
  slotStart: Date;
  input: BookingInput;
  studioName: string;
  clientTz?: string | null;
}

export function buildBriefData(ctx: BriefContext): DesignBriefData {
  const { input, slotStart } = ctx;
  const tz = SLOT_CONFIG.tz;
  const ist = formatInZone(slotStart, tz);
  const local =
    ctx.clientTz && ctx.clientTz !== tz ? formatInZone(slotStart, ctx.clientTz) : null;

  const hero = input.looks[0];
  const heroChanges = hero ? changesFor(hero) : [];

  const looks: Look[] = input.looks.map((look, i) => ({
    placeholder: placeholderFor(look.pieceType),
    name: look.pieceName,
    code: look.pieceId,
    config: configLine(look),
    priceRange: indicativeRange(look.quoteTotal),
    note: i === 0 ? "Booked for consultation" : "Saved to the look board",
  }));

  return {
    briefNo: briefNumber(ctx.bookingId),
    clientName: input.client.name,
    studioName: ctx.studioName,
    consultation: {
      date: formatLongDate(slotStart, tz),
      timeIst: `${ist.time} IST`,
      // The component already prints "· client local time" after this.
      timeLocal: local ? `${local.time} ${zoneAbbreviation(slotStart, ctx.clientTz!)}` : "",
    },
    visit: {
      type: input.visit_type === "video" ? "Video call" : "Studio visit",
      note:
        input.visit_type === "video"
          ? "Link sent with the confirmation"
          : "Address sent with the confirmation",
    },
    piece: {
      code: hero?.pieceId ?? "—",
      name: hero?.pieceName ?? "—",
      collection: hero?.collection ? `${hero.collection} collection` : "",
      metal: hero ? metalLabel(hero.config.metal) : "—",
      karat: hero ? `${hero.config.karat}K` : "—",
      estWeight: hero?.weightG ? `${hero.weightG.toFixed(1)} g` : null,
      size: hero ? sizeLabel(hero) : "—",
      stones: hero?.stones ?? "As catalogued",
      story: hero?.story ?? "",
      catalogueRange: indicativeRange(hero?.originalQuoteTotal ?? hero?.quoteTotal) ?? "",
    },
    snapshotCaption: hero
      ? `Captured during try-on · ${configLine(hero)}`
      : "No snapshot was saved",
    changes: heroChanges,
    clientNotes: input.notes ?? "",
    occasion: input.occasion ?? "—",
    neededBy: input.needed_by ?? "—",
    budgetRange: input.budget ?? "—",
    indicativeRange: indicativeRange(hero?.quoteTotal) ?? "On request",
    disclaimer:
      "Indicative range based on today's gold rate and the requested changes. The atelier confirms weight and price after the consultation.",
    looks,
  };
}
