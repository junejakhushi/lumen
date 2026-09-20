import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl } from "@/lib/ics";
import { escapeHtml, htmlToText, renderTemplate } from "@/lib/email/render";

describe("template rendering", () => {
  it("fills values and escapes them", () => {
    expect(renderTemplate("Hello {{name}}", { name: "Ada" })).toBe("Hello Ada");
    expect(renderTemplate("{{name}}", { name: 'A & B <script>"x"' })).toBe(
      "A &amp; B &lt;script&gt;&quot;x&quot;"
    );
    expect(renderTemplate("{{{raw}}}", { raw: "<b>bold</b>" })).toBe("<b>bold</b>");
  });

  it("leaves a missing value empty rather than printing the placeholder", () => {
    expect(renderTemplate("[{{missing}}]", {})).toBe("[]");
  });

  it("shows or hides a boolean section", () => {
    const t = "{{#in_studio}}ADDRESS{{/in_studio}}";
    expect(renderTemplate(t, { in_studio: true })).toBe("ADDRESS");
    expect(renderTemplate(t, { in_studio: false })).toBe("");
  });

  it("repeats a list section with the item's fields in scope", () => {
    const t = "{{#pieces}}<li>{{piece_name}} ({{piece_code}})</li>{{/pieces}}";
    expect(
      renderTemplate(t, {
        pieces: [
          { piece_name: "Quiet River", piece_code: "LX-104" },
          { piece_name: "Temple Dawn", piece_code: "LX-130" },
        ],
      })
    ).toBe("<li>Quiet River (LX-104)</li><li>Temple Dawn (LX-130)</li>");
  });

  it("can still see outer values from inside a section", () => {
    expect(
      renderTemplate("{{#looks}}{{studio_name}}:{{name}} {{/looks}}", {
        studio_name: "The Atelier",
        looks: [{ name: "one" }, { name: "two" }],
      })
    ).toBe("The Atelier:one The Atelier:two ");
  });

  it("hides an empty list", () => {
    expect(renderTemplate("{{#changes}}x{{/changes}}", { changes: [] })).toBe("");
  });

  it("supports an inverted section", () => {
    expect(renderTemplate("{{^looks}}none{{/looks}}", { looks: [] })).toBe("none");
    expect(renderTemplate("{{^looks}}none{{/looks}}", { looks: [{ a: 1 }] })).toBe("");
  });

  it("renders the delivered client confirmation with no placeholders left", () => {
    const html = readFileSync(
      resolve(__dirname, "..", "public", "brand", "emails", "client-confirmation.html"),
      "utf-8"
    );
    const out = renderTemplate(html, {
      asset_base: "https://example.test/brand",
      brief_id: "LUM-0042",
      brief_url: "https://example.test/brief",
      calendar_ics_url: "https://example.test/ics",
      client_first_name: "Ada",
      date_ist: "Tue 22 Sep",
      google_calendar_url: "https://example.test/gcal",
      studio_address: "12 Gallery Road",
      studio_name: "The Atelier",
      time_ist: "19:30",
      time_local: "10:00",
      tz_local: "EDT",
      visit_type: "Video call",
      video_call: true,
      in_studio: false,
      video_link: "https://example.test/meet",
      look_1_name: "Quiet River",
      look_1_code: "LX-104",
      look_1_metal: "Rose 18K",
      look_1_img: "https://example.test/look1.png",
      look_2_name: "Temple Dawn",
      look_2_code: "LX-130",
      look_2_metal: "Yellow 22K",
      look_2_img: "https://example.test/look2.png",
    });
    expect(out).not.toMatch(/\{\{/);
    expect(out).toContain("Ada");
    expect(out).toContain("The Atelier");
    expect(out).toContain("https://example.test/meet");
    expect(out).not.toContain("12 Gallery Road"); // in-studio block is hidden for a video call
  });

  it("makes a readable plain-text version", () => {
    const text = htmlToText("<p>Hello <b>Ada</b></p><p>Tue 22 Sep at 19:30</p>");
    expect(text).toBe("Hello Ada\n\nTue 22 Sep at 19:30");
  });

  it("escapes what it is given", () => {
    expect(escapeHtml("<a href='x'>&</a>")).toBe("&lt;a href=&#39;x&#39;&gt;&amp;&lt;/a&gt;");
  });
});

describe("ics", () => {
  const event = {
    uid: "booking-123@lumen",
    start: new Date("2026-09-22T14:00:00Z"),
    end: new Date("2026-09-22T14:45:00Z"),
    summary: "Consultation with The Atelier",
    description: "Your design brief is with the atelier; bring anything you'd like to show.",
    location: "12 Gallery Road, Mumbai",
    organizer: { name: "The Atelier", email: "atelier@example.test" },
    now: new Date("2026-09-20T10:00:00Z"),
  };

  it("writes a valid calendar entry", () => {
    const ics = buildIcs(event);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("DTSTART:20260922T140000Z");
    expect(ics).toContain("DTEND:20260922T144500Z");
    expect(ics).toContain("UID:booking-123@lumen");
    expect(ics).toContain("TRIGGER:-PT24H"); // a reminder the day before
    expect(ics.split("\r\n").every((l) => Buffer.from(l, "utf8").length <= 75)).toBe(true);
  });

  it("escapes commas and semicolons in text", () => {
    const ics = buildIcs({ ...event, location: "12 Gallery Road, Mumbai; second floor" });
    expect(ics).toContain("12 Gallery Road\\, Mumbai\; second floor");
  });

  it("builds a Google Calendar link for the same instant", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20260922T140000Z/20260922T144500Z");
    expect(url.searchParams.get("text")).toBe("Consultation with The Atelier");
  });
});
