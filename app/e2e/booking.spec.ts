import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../playwright.config";

/**
 * S1.5: slots, booking, and the double-booking race.
 *
 * These need a database — the whole point is the unique slot constraint — so they skip
 * when DATABASE_URL is not set (CI has none).
 */

const hasDb = Boolean(process.env.DATABASE_URL);

async function signIn(page: Page, code: string) {
  await page.goto("/gate");
  await page.getByRole("textbox").first().fill(code);
  await page.getByRole("button", { name: /enter|continue|open/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/gate"), { timeout: 30_000 });
}

async function signInApi(request: APIRequestContext, code: string) {
  const res = await request.post("/api/gate", { data: { code } });
  expect(res.ok()).toBeTruthy();
}

function bookingBody(slot: string, name: string) {
  return {
    slot_start: slot,
    visit_type: "video" as const,
    client: {
      name,
      phone: "+91 90000 00000",
      whatsapp: false,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@e2e.test`,
    },
    consent: true as const,
    client_tz: "America/New_York",
    looks: [],
  };
}

test.describe("slots", () => {
  test("offers Mon–Sat consultation times in both timezones", async ({ page }) => {
    await signIn(page, E2E.clientCode);
    const res = await page.request.get("/api/slots?tz=America/New_York");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    expect(data.tz).toBe("Asia/Kolkata");
    expect(data.durationMin).toBe(45);
    expect(data.days.length).toBeGreaterThan(0);
    for (const day of data.days) {
      expect(day.weekday).not.toBe("Sunday");
      for (const slot of day.slots) {
        expect(Number(slot.ist.time.slice(0, 2))).toBeGreaterThanOrEqual(11);
        expect(Number(slot.ist.time.slice(0, 2))).toBeLessThanOrEqual(18);
        expect(slot.local.tz).toBe("America/New_York");
      }
    }
  });

  test("the picker shows times and the client's own time", async ({ page }) => {
    await signIn(page, E2E.clientCode);
    await page.goto("/book");
    await expect(page.getByTestId("slot").first()).toBeVisible();
    await page.getByTestId("slot").first().click();
    await expect(page.getByTestId("slot-chosen")).toContainText("IST");
  });
});

test.describe("booking", () => {
  test.skip(!hasDb, "needs DATABASE_URL");

  test("a booking is stored, with a brief, and shows up in the atelier", async ({ page, request }) => {
    await signInApi(request, E2E.clientCode);
    const slots = await (await request.get("/api/slots")).json();
    const slot = slots.days[0].slots.at(-1).start; // take the last of day one to avoid clashes

    const res = await request.post("/api/bookings", { data: bookingBody(slot, "Nina Booking") });
    expect(res.status()).toBe(200);
    const created = await res.json();
    expect(created.ok).toBe(true);
    expect(created.briefNo).toMatch(/^LUM-/);

    // the slot is no longer offered
    const after = await (await request.get("/api/slots")).json();
    const stillThere = after.days
      .flatMap((d: { slots: { start: string }[] }) => d.slots)
      .some((s: { start: string }) => s.start === slot);
    expect(stillThere).toBe(false);

    // and the atelier can see it, with a brief to download
    await signIn(page, E2E.atelierCode);
    await page.goto(`/atelier/bookings/${created.id}`);
    await expect(page.getByRole("heading", { name: "Nina Booking" })).toBeVisible();
    await expect(page.getByTestId("brief-link")).toBeVisible();

    const briefHref = await page.getByTestId("brief-link").getAttribute("href");
    const brief = await page.request.get(briefHref!);
    expect(brief.ok()).toBeTruthy();
    expect((await brief.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("two people cannot take the same slot", async ({ request }) => {
    await signInApi(request, E2E.clientCode);
    const slots = await (await request.get("/api/slots")).json();
    const slot = slots.days[0].slots.at(-1).start;

    const [a, b] = await Promise.all([
      request.post("/api/bookings", { data: bookingBody(slot, "Race One") }),
      request.post("/api/bookings", { data: bookingBody(slot, "Race Two") }),
    ]);

    const codes = [a.status(), b.status()].sort();
    expect(codes).toEqual([200, 409]);

    const loser = a.status() === 409 ? a : b;
    expect((await loser.json()).error).toMatch(/just been taken/i);
  });

  test("refuses a time the atelier does not offer", async ({ request }) => {
    await signInApi(request, E2E.clientCode);
    const sunday = new Date();
    sunday.setUTCDate(sunday.getUTCDate() + ((7 - sunday.getUTCDay()) % 7 || 7));
    sunday.setUTCHours(6, 30, 0, 0); // 12:00 IST on a Sunday

    const res = await request.post("/api/bookings", {
      data: bookingBody(sunday.toISOString(), "Sunday Hopeful"),
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/not one of the consultation slots/i);
  });

  test("will not book without consent", async ({ request }) => {
    await signInApi(request, E2E.clientCode);
    const slots = await (await request.get("/api/slots")).json();
    const body = { ...bookingBody(slots.days[0].slots[0].start, "No Consent"), consent: false };
    const res = await request.post("/api/bookings", { data: body });
    expect(res.status()).toBe(400);
  });
});
