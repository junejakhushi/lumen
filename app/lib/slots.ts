/**
 * Consultation slots (SPEC §5.6).
 *
 * Mon–Sat, 11:00–19:00 in the atelier's timezone, 45-minute consultations with a 15-minute
 * buffer, generated 14 days ahead and offered in both the atelier's time and the client's.
 *
 * Pure functions over UTC instants. Zone arithmetic uses Intl, so it stays correct if the
 * atelier's own zone, whatever it is, including its daylight saving.
 */

export const SLOT_CONFIG = {
  tz: process.env.BOOKING_TZ || "America/New_York",
  openHour: 11,
  closeHour: 19, // last consultation must END by this hour
  durationMin: 45,
  bufferMin: 15,
  daysAhead: 14,
  /** 0 = Sunday. The atelier is open Monday to Saturday. */
  closedWeekdays: [0] as readonly number[],
  /** Nothing can be booked closer than this to now. */
  leadTimeMin: 60,
} as const;

export interface Slot {
  /** Instant, ISO 8601 with offset — the identity of the slot. */
  start: string;
  end: string;
  /** Rendered in the atelier's timezone. */
  studio: { date: string; time: string; weekday: string };
  /** The same instant in the client's timezone, when it differs. */
  local: { date: string; time: string; tz: string } | null;
}

const PARTS = ["year", "month", "day", "hour", "minute", "second"] as const;
type PartName = (typeof PARTS)[number];

function zoneParts(date: Date, timeZone: string): Record<PartName, number> {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const out = {} as Record<PartName, number>;
  for (const part of fmt.formatToParts(date)) {
    if ((PARTS as readonly string[]).includes(part.type)) {
      out[part.type as PartName] = Number(part.value);
    }
  }
  return out;
}

/** How far the zone is ahead of UTC at this instant, in minutes. */
export function zoneOffsetMin(date: Date, timeZone: string): number {
  const p = zoneParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** The instant at which the given wall-clock time occurs in the zone. */
export function zonedTimeToUtc(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  // Two passes settle the offset even across a DST change.
  let result = new Date(guess - zoneOffsetMin(new Date(guess), timeZone) * 60000);
  result = new Date(guess - zoneOffsetMin(result, timeZone) * 60000);
  return result;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Dates are assembled from parts rather than formatted by locale: ICU versions disagree
 *  about September ("Sep" vs "Sept"), and these strings end up in emails and a PDF. */
export function formatInZone(
  date: Date,
  timeZone: string
): { date: string; time: string; weekday: string } {
  const p = zoneParts(date, timeZone);
  const weekday = WEEKDAYS[weekdayInZone(date, timeZone)];
  const hour = String(p.hour % 24).padStart(2, "0");
  return {
    date: `${weekday.slice(0, 3)} ${p.day} ${MONTHS[p.month - 1]}`,
    time: `${hour}:${String(p.minute).padStart(2, "0")}`,
    weekday,
  };
}

/** "Monday 21 September 2026" — for the brief and the emails. */
export function formatLongDate(date: Date, timeZone: string): string {
  const p = zoneParts(date, timeZone);
  const month = new Intl.DateTimeFormat("en-GB", { timeZone, month: "long" }).format(date);
  return `${WEEKDAYS[weekdayInZone(date, timeZone)]} ${p.day} ${month} ${p.year}`;
}

/** "EDT", "IST", "GMT+5:30" — what a person would write after a time. */
export function zoneAbbreviation(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" }).formatToParts(
    date
  );
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}

/** The day of the week (0 = Sunday) that this instant falls on, in the zone. */
export function weekdayInZone(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Calendar date in the zone, as y/m/d numbers. */
export function dateInZone(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const p = zoneParts(date, timeZone);
  return { y: p.year, m: p.month, d: p.day };
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export interface SlotOptions {
  now?: Date;
  booked?: Iterable<string | Date>;
  clientTz?: string | null;
  config?: Partial<typeof SLOT_CONFIG>;
}

/**
 * Every free consultation slot in the booking window.
 *
 * Slots step by duration + buffer, so a 45-minute consultation with a 15-minute buffer gives
 * 11:00, 12:00, 13:00 … and the last one is the latest that still ends by closing time.
 */
export function generateSlots(options: SlotOptions = {}): Slot[] {
  const cfg = { ...SLOT_CONFIG, ...options.config };
  const now = options.now ?? new Date();
  const tz = cfg.tz;
  const clientTz =
    options.clientTz && isValidTimeZone(options.clientTz) && options.clientTz !== tz
      ? options.clientTz
      : null;

  const taken = new Set<number>();
  for (const b of Array.from(options.booked ?? [])) {
    const t = b instanceof Date ? b.getTime() : new Date(b).getTime();
    if (!Number.isNaN(t)) taken.add(t);
  }

  const earliest = now.getTime() + cfg.leadTimeMin * 60000;
  const step = cfg.durationMin + cfg.bufferMin;
  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset < cfg.daysAhead; dayOffset++) {
    const dayAnchor = new Date(now.getTime() + dayOffset * 86400000);
    if (cfg.closedWeekdays.includes(weekdayInZone(dayAnchor, tz))) continue;
    const { y, m, d } = dateInZone(dayAnchor, tz);

    for (
      let minutes = cfg.openHour * 60;
      minutes + cfg.durationMin <= cfg.closeHour * 60;
      minutes += step
    ) {
      const start = zonedTimeToUtc(y, m, d, Math.floor(minutes / 60), minutes % 60, tz);
      if (start.getTime() < earliest) continue;
      if (taken.has(start.getTime())) continue;
      const end = new Date(start.getTime() + cfg.durationMin * 60000);
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        studio: formatInZone(start, tz),
        local: clientTz
          ? { ...formatInZone(start, clientTz), tz: clientTz }
          : null,
      });
    }
  }
  return slots;
}

/** Is this instant a slot the atelier actually offers? Guards against a forged start time. */
export function isBookableSlot(start: Date, options: SlotOptions = {}): boolean {
  const cfg = { ...SLOT_CONFIG, ...options.config };
  const now = options.now ?? new Date();
  if (start.getTime() < now.getTime() + cfg.leadTimeMin * 60000) return false;
  if (start.getTime() > now.getTime() + cfg.daysAhead * 86400000) return false;
  if (cfg.closedWeekdays.includes(weekdayInZone(start, cfg.tz))) return false;

  const p = zoneParts(start, cfg.tz);
  const minutes = p.hour * 60 + p.minute;
  if (minutes < cfg.openHour * 60) return false;
  if (minutes + cfg.durationMin > cfg.closeHour * 60) return false;
  if (p.second !== 0) return false;
  return (minutes - cfg.openHour * 60) % (cfg.durationMin + cfg.bufferMin) === 0;
}

/** Group slots by their date in the atelier's timezone, for the picker. */
export function groupByDay(slots: Slot[]): Array<{ date: string; weekday: string; slots: Slot[] }> {
  const days = new Map<string, { date: string; weekday: string; slots: Slot[] }>();
  for (const slot of slots) {
    const key = slot.studio.date;
    if (!days.has(key)) days.set(key, { date: key, weekday: slot.studio.weekday, slots: [] });
    days.get(key)!.slots.push(slot);
  }
  return Array.from(days.values());
}
