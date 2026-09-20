import { describe, expect, it } from "vitest";
import {
  generateSlots,
  groupByDay,
  isBookableSlot,
  SLOT_CONFIG,
  weekdayInZone,
  zonedTimeToUtc,
  zoneOffsetMin,
} from "@/lib/slots";

const IST = "Asia/Kolkata";
/** Monday 2026-09-21, 04:00 UTC = 09:30 IST. */
const MONDAY_MORNING = new Date("2026-09-21T04:00:00Z");

describe("timezone helpers", () => {
  it("knows IST is 5h30 ahead", () => {
    expect(zoneOffsetMin(MONDAY_MORNING, IST)).toBe(330);
  });

  it("converts a wall-clock time in the zone to the right instant", () => {
    // 11:00 IST = 05:30 UTC
    expect(zonedTimeToUtc(2026, 9, 21, 11, 0, IST).toISOString()).toBe("2026-09-21T05:30:00.000Z");
  });

  it("handles a zone with daylight saving", () => {
    // New York is UTC-4 in September (EDT): 11:00 local = 15:00 UTC
    expect(zonedTimeToUtc(2026, 9, 21, 11, 0, "America/New_York").toISOString()).toBe(
      "2026-09-21T15:00:00.000Z"
    );
    // and UTC-5 in January (EST)
    expect(zonedTimeToUtc(2026, 1, 21, 11, 0, "America/New_York").toISOString()).toBe(
      "2026-01-21T16:00:00.000Z"
    );
  });

  it("reads the weekday in the zone, not the server's", () => {
    // 2026-09-20T20:00Z is Sunday in UTC but already Monday in IST
    expect(weekdayInZone(new Date("2026-09-20T20:00:00Z"), IST)).toBe(1);
  });
});

describe("generateSlots", () => {
  it("runs 11:00 to 18:00 IST on the hour", () => {
    const slots = generateSlots({ now: MONDAY_MORNING });
    const monday = slots.filter((s) => s.ist.date.includes("21 Sep"));
    expect(monday.map((s) => s.ist.time)).toEqual([
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ]);
  });

  it("leaves 15 minutes between a 45-minute consultation and the next", () => {
    const [first, second] = generateSlots({ now: MONDAY_MORNING });
    const gap = (new Date(second.start).getTime() - new Date(first.end).getTime()) / 60000;
    expect(gap).toBe(SLOT_CONFIG.bufferMin);
    expect((new Date(first.end).getTime() - new Date(first.start).getTime()) / 60000).toBe(45);
  });

  it("never offers a slot that ends after closing", () => {
    for (const slot of generateSlots({ now: MONDAY_MORNING })) {
      const [h, m] = slot.ist.time.split(":").map(Number);
      expect(h * 60 + m + SLOT_CONFIG.durationMin).toBeLessThanOrEqual(SLOT_CONFIG.closeHour * 60);
    }
  });

  it("is closed on Sunday", () => {
    const slots = generateSlots({ now: MONDAY_MORNING });
    expect(slots.some((s) => s.ist.weekday === "Sunday")).toBe(false);
    expect(new Set(slots.map((s) => s.ist.weekday))).toEqual(
      new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])
    );
  });

  it("covers 14 days ahead", () => {
    const slots = generateSlots({ now: MONDAY_MORNING });
    const days = new Set(slots.map((s) => s.ist.date));
    expect(days.size).toBe(12); // 14 days minus two Sundays
  });

  it("honours the lead time", () => {
    // 10:30 IST on the Monday: the 11:00 slot is inside the hour of lead time
    const now = new Date("2026-09-21T05:00:00Z");
    const first = generateSlots({ now })[0];
    expect(first.ist.time).toBe("12:00");
  });

  it("drops slots that are already booked", () => {
    const all = generateSlots({ now: MONDAY_MORNING });
    const taken = all[3].start;
    const left = generateSlots({ now: MONDAY_MORNING, booked: [taken] });
    expect(left).toHaveLength(all.length - 1);
    expect(left.some((s) => s.start === taken)).toBe(false);
  });

  it("gives the client's local time when it differs", () => {
    const [slot] = generateSlots({ now: MONDAY_MORNING, clientTz: "America/New_York" });
    expect(slot.ist.time).toBe("11:00");
    expect(slot.local).toMatchObject({
      date: "Mon 21 Sep",
      time: "01:30",
      weekday: "Monday",
      tz: "America/New_York",
    });
  });

  it("omits the local block when the client is in the atelier's zone", () => {
    const [slot] = generateSlots({ now: MONDAY_MORNING, clientTz: IST });
    expect(slot.local).toBeNull();
  });

  it("ignores a nonsense timezone from the client", () => {
    const [slot] = generateSlots({ now: MONDAY_MORNING, clientTz: "Mars/Olympus" });
    expect(slot.local).toBeNull();
  });
});

describe("isBookableSlot", () => {
  const now = MONDAY_MORNING;

  it("accepts a slot it generated", () => {
    for (const slot of generateSlots({ now }).slice(0, 5)) {
      expect(isBookableSlot(new Date(slot.start), { now })).toBe(true);
    }
  });

  it("rejects times off the grid, out of hours, on Sunday, or in the past", () => {
    expect(isBookableSlot(zonedTimeToUtc(2026, 9, 21, 11, 30, IST), { now })).toBe(false);
    expect(isBookableSlot(zonedTimeToUtc(2026, 9, 21, 20, 0, IST), { now })).toBe(false);
    expect(isBookableSlot(zonedTimeToUtc(2026, 9, 27, 11, 0, IST), { now })).toBe(false);
    expect(isBookableSlot(zonedTimeToUtc(2026, 9, 20, 11, 0, IST), { now })).toBe(false);
    expect(isBookableSlot(zonedTimeToUtc(2026, 12, 21, 11, 0, IST), { now })).toBe(false);
  });
});

describe("groupByDay", () => {
  it("keeps days in order with their slots", () => {
    const days = groupByDay(generateSlots({ now: MONDAY_MORNING }));
    expect(days[0].weekday).toBe("Monday");
    expect(days[0].slots[0].ist.time).toBe("11:00");
    expect(days.every((d) => d.slots.length > 0)).toBe(true);
  });
});
