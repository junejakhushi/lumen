import { describe, expect, it } from "vitest";
import React from "react";
import { renderPdf } from "@/lib/pdf/render";

describe("design brief pdf", () => {
  it("renders the delivered sample brief to a real PDF", async () => {
    const mod = await import("@/lib/pdf/DesignBrief");
    const sample = (mod as unknown as { sampleBrief: unknown }).sampleBrief;
    const buf = await renderPdf(React.createElement(mod.DesignBriefDocument, { d: sample as never }));
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(20_000);
    // 4 brief pages + the appended session report
    const pages = buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages.length).toBeGreaterThanOrEqual(4);
  });
});
